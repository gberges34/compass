const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', '..', 'shared', 'dto');
const dest = path.resolve(__dirname, '..', 'shared', 'dto');

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`Copied shared DTOs from ${src} -> ${dest}`);
