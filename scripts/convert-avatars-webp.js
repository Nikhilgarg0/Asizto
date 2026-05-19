// scripts/convert-avatars-webp.js
// Converts all PNG avatars to WebP at quality 80, saves alongside originals
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const AVATAR_DIR = path.join(__dirname, '..', 'assets', 'avatars');
const QUALITY = 80;

async function main() {
  const files = fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.png'));
  
  console.log(`Converting ${files.length} PNG avatars to WebP (q${QUALITY})...\n`);

  let totalBefore = 0, totalAfter = 0;

  for (const file of files) {
    const input  = path.join(AVATAR_DIR, file);
    const output = path.join(AVATAR_DIR, file.replace('.png', '.webp'));
    
    const before = fs.statSync(input).size;
    await sharp(input).webp({ quality: QUALITY }).toFile(output);
    const after = fs.statSync(output).size;
    
    totalBefore += before;
    totalAfter  += after;
    
    const saved = (((before - after) / before) * 100).toFixed(1);
    console.log(`  ✓ ${file.padEnd(14)} ${(before/1024).toFixed(1)}KB → ${(after/1024).toFixed(1)}KB  (-${saved}%)`);
  }

  console.log(`\n  Total: ${(totalBefore/1024).toFixed(1)}KB → ${(totalAfter/1024).toFixed(1)}KB  (-${(((totalBefore-totalAfter)/totalBefore)*100).toFixed(1)}%)`);
  console.log('\nDone! Update AVATAR_MAP paths to use .webp extensions.');
}

main().catch(console.error);
