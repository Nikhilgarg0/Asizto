// utils/gemini.js
import { GEMINI_API_KEY } from '@env';

const MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash-native-audio-preview-12-2025', 'gemini-3.1-pro-preview', 'gemini-3-flash', 'gemini-3.1-flash-lite'];
const VERSIONS = ['v1beta', 'v1'];

const BACKOFF_MS = [1000, 3000, 8000];
const MAX_RETRIES = BACKOFF_MS.length;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

export async function callGemini(prompt, { systemInstruction } = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  let lastStatus = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(BACKOFF_MS[attempt - 1]);

    let allWere429 = true;

    for (const version of VERSIONS) {
      for (const model of MODELS) {
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
            },
          );
        } catch {
          allWere429 = false;
          continue;
        }

        lastStatus = res.status;

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return String(text).trim();
          allWere429 = false;
          continue;
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
                },
              );
            } catch {
              allWere429 = false;
              continue;
            }
            lastStatus = res2.status;
            if (res2.ok) {
              const data = await res2.json();
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) return String(text).trim();
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

  throw new Error(`All Gemini models unavailable (last HTTP status: ${lastStatus ?? 'none'})`);
}