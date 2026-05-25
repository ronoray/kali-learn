// Run: node generate-icons.js
// Requires: npm install canvas
// Generates 192x192 and 512x512 PNG icons

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, size, size);

  // Rounded rect border
  const pad = size * 0.06;
  const r = size * 0.18;
  ctx.strokeStyle = '#3fb950';
  ctx.lineWidth = size * 0.04;
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(size - pad - r, pad);
  ctx.arcTo(size - pad, pad, size - pad, pad + r, r);
  ctx.lineTo(size - pad, size - pad - r);
  ctx.arcTo(size - pad, size - pad, size - pad - r, size - pad, r);
  ctx.lineTo(pad + r, size - pad);
  ctx.arcTo(pad, size - pad, pad, size - pad - r, r);
  ctx.lineTo(pad, pad + r);
  ctx.arcTo(pad, pad, pad + r, pad, r);
  ctx.closePath();
  ctx.stroke();

  // Terminal prompt >_
  ctx.fillStyle = '#3fb950';
  ctx.font = `bold ${size * 0.35}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('>_', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

fs.writeFileSync(path.join(__dirname, 'icon-192.png'), generateIcon(192));
fs.writeFileSync(path.join(__dirname, 'icon-512.png'), generateIcon(512));
console.log('Icons generated');
