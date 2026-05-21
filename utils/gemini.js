// utils/gemini.js
import { GEMINI_API_KEY } from '@env';

const MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash-native-audio-preview-12-2025', 'gemini-3.1-pro-preview', 'gemini-3-flash', 'gemini-3.1-flash-lite'];
const VERSIONS = ['v1beta', 'v1'];

const BACKOFF_MS = [1000, 3000, 8000];
const MAX_RETRIES = BACKOFF_MS.length;

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason || new Error('Aborted'));
    }
    const t = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(t);
      reject(new Error('Aborted'));
    }
    if (signal) {
      signal.addEventListener('abort', onAbort);
    }
  });
}

function buildBody(prompt, systemInstruction, useSystemField) {
  if (systemInstruction && useSystemField) {
    return {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: prompt }] }],
    };
  }
  // Fallback: prepend system instruction into the user prompt
  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\n${prompt}`
    : prompt;
  return {
    contents: [{ parts: [{ text: fullPrompt }] }],
  };
}

export async function callGemini(prompt, { systemInstruction, signal, timeoutMs = 12000 } = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const controller = new AbortController();
  const internalSignal = controller.signal;
  let wasTimeout = false;
  let timeoutId = null;

  const onAbort = () => {
    controller.abort();
  };

  if (signal) {
    if (signal.aborted) {
      throw new Error('Aborted');
    }
    signal.addEventListener('abort', onAbort);
  }

  if (timeoutMs) {
    timeoutId = setTimeout(() => {
      wasTimeout = true;
      controller.abort();
    }, timeoutMs);
  }

  let lastStatus = null;

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await sleep(BACKOFF_MS[attempt - 1], internalSignal);
      }

      let allWere429 = true;

      for (const version of VERSIONS) {
        for (const model of MODELS) {
          // Check abort signal
          if (internalSignal.aborted) {
            if (wasTimeout) {
              throw new Error('Gemini API call timed out');
            } else {
              throw new Error('Aborted');
            }
          }

          // system_instruction field is only reliable on v1beta with 1.5+ and 2.x models
          const supportsSystemField =
            version === 'v1beta' && model !== 'gemini-pro';

          const body = buildBody(prompt, systemInstruction, supportsSystemField);

          let res;
          try {
            res = await fetch(
              `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: internalSignal,
              },
            );
          } catch (err) {
            if (internalSignal.aborted) {
              if (wasTimeout) {
                throw new Error('Gemini API call timed out');
              } else {
                throw err;
              }
            }
            allWere429 = false;
            continue;
          }

          lastStatus = res.status;

          if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return String(text).trim();
            } else {
              // ERR-3: A successful 200 with an empty body/missing text response.
              // Log a warning and break the model loop, rather than continuing to retry other models.
              console.warn('Gemini returned a successful 200 but text content was empty/missing.');
              return '';
            }
          }

          if (res.status === 404) { allWere429 = false; continue; }
          if (res.status === 429) { continue; }

          if (res.status === 400) {
            // If we used the system_instruction field, retry this model without it
            if (supportsSystemField) {
              const fallbackBody = buildBody(prompt, systemInstruction, false);
              let res2;
              try {
                res2 = await fetch(
                  `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fallbackBody),
                    signal: internalSignal,
                  },
                );
              } catch (err) {
                if (internalSignal.aborted) {
                  if (wasTimeout) {
                    throw new Error('Gemini API call timed out');
                  } else {
                    throw err;
                  }
                }
                allWere429 = false;
                continue;
              }
              lastStatus = res2.status;
              if (res2.ok) {
                const data = await res2.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  return String(text).trim();
                } else {
                  console.warn('Gemini fallback returned a successful 200 but text content was empty/missing.');
                  return '';
                }
              }
            }
            allWere429 = false;
            continue;
          }

          // 401, 403, 5xx
          allWere429 = false;
          break;
        }
      }

      if (!allWere429) break;
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
  }

  throw new Error(`All Gemini models unavailable (last HTTP status: ${lastStatus ?? 'none'})`);
}