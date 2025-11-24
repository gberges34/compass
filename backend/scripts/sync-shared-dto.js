const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', '..', 'shared', 'dto');
const dest = path.resolve(__dirname, '..', 'shared', 'dto');

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}

console.log(`Copied shared DTOs from ${src} -> ${dest}`);
