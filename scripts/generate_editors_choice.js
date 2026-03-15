#!/usr/bin/env node
/**
 * Generates a 1200x1200 Editor's Choice graphic for Solana dApp Store.
 * Output: demo/editors_choice_graphic.png
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 1200;

async function generateEditorsChoice() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // --- Background: dark green felt ---
  const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bgGrad.addColorStop(0, '#0a1f12');
  bgGrad.addColorStop(0.5, '#0d2818');
  bgGrad.addColorStop(1, '#061509');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // --- Subtle felt texture overlay ---
  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  for (let x = 0; x < SIZE; x += 6) {
    for (let y = 0; y < SIZE; y += 6) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Radial light from center ---
  const radGrad = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE * 0.6);
  radGrad.addColorStop(0, 'rgba(212,175,55,0.08)');
  radGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // --- Decorative gold border ---
  const borderWidth = 8;
  const borderGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  borderGrad.addColorStop(0, '#b8963e');
  borderGrad.addColorStop(0.5, '#d4af37');
  borderGrad.addColorStop(1, '#b8963e');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(borderWidth / 2, borderWidth / 2, SIZE - borderWidth, SIZE - borderWidth);

  // Inner thin gold border
  ctx.strokeStyle = 'rgba(212,175,55,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, SIZE - 44, SIZE - 44);

  // --- Top label: "EDITOR'S CHOICE" badge ---
  const badgeY = 80;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Badge background pill
  const badgeWidth = 320;
  const badgeHeight = 40;
  const badgeBg = ctx.createLinearGradient(SIZE / 2 - badgeWidth / 2, 0, SIZE / 2 + badgeWidth / 2, 0);
  badgeBg.addColorStop(0, '#9945FF');
  badgeBg.addColorStop(1, '#14F195');
  ctx.fillStyle = badgeBg;
  roundRect(ctx, SIZE / 2 - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, 20);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText("EDITOR'S CHOICE", SIZE / 2, badgeY);

  // --- App title ---
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Batak', SIZE / 2, 195);

  ctx.fillStyle = '#f0d060';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('Tournament', SIZE / 2, 248);

  // Subtitle
  ctx.fillStyle = 'rgba(212,175,55,0.7)';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText("Turkey's Premier Card Game on Solana", SIZE / 2, 285);

  // --- Center: Large gold medallion + icon ---
  const medalX = SIZE / 2;
  const medalY = 500;
  const medalRadius = 170;

  // Outer glow ring
  const glowGrad = ctx.createRadialGradient(medalX, medalY, medalRadius * 0.7, medalX, medalY, medalRadius * 1.3);
  glowGrad.addColorStop(0, 'rgba(212,175,55,0.25)');
  glowGrad.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(medalX, medalY, medalRadius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Decorative ring segments (12 spokes like a compass)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const innerR = medalRadius + 10;
    const outerR = medalRadius + 30;
    ctx.beginPath();
    ctx.moveTo(medalX + Math.cos(angle) * innerR, medalY + Math.sin(angle) * innerR);
    ctx.lineTo(medalX + Math.cos(angle) * outerR, medalY + Math.sin(angle) * outerR);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(212,175,55,0.9)' : 'rgba(212,175,55,0.35)';
    ctx.lineWidth = i % 3 === 0 ? 3 : 1;
    ctx.stroke();
  }

  // Medallion background
  const medalGrad = ctx.createRadialGradient(
    medalX - 40, medalY - 40, 10,
    medalX, medalY, medalRadius
  );
  medalGrad.addColorStop(0, '#f0d060');
  medalGrad.addColorStop(0.35, '#d4af37');
  medalGrad.addColorStop(0.65, '#b8963e');
  medalGrad.addColorStop(1, '#8b6914');

  ctx.beginPath();
  ctx.arc(medalX, medalY, medalRadius, 0, Math.PI * 2);
  ctx.fillStyle = medalGrad;
  ctx.fill();

  // Medal border
  ctx.strokeStyle = '#f0d060';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner medal ring
  ctx.beginPath();
  ctx.arc(medalX, medalY, medalRadius - 14, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212,175,55,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Load and draw icon inside medal
  try {
    const iconPath = path.join(__dirname, '../mobile/assets/icon.png');
    const icon = await loadImage(iconPath);
    const iconR = medalRadius - 20;
    ctx.save();
    ctx.beginPath();
    ctx.arc(medalX, medalY, iconR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(icon, medalX - iconR, medalY - iconR, iconR * 2, iconR * 2);
    ctx.restore();
  } catch (e) {
    // Fallback: "B" letter
    ctx.fillStyle = '#0d2818';
    ctx.font = 'bold 180px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', medalX, medalY);
  }

  // --- Feature highlights (4 items in 2x2 grid) ---
  const features = [
    { icon: '\u{1F0CF}', title: 'Real-time Multiplayer', sub: '4-player online matches' },
    { icon: '\u{1F3C6}', title: 'cNFT Trophies', sub: 'Win unique Solana rewards' },
    { icon: '\u{1F48E}', title: 'SKR Token Stakes', sub: 'Bet & win SKR tokens' },
    { icon: '\u{1F4F1}', title: 'Mobile Native', sub: 'Seeker & MWA support' },
  ];

  const gridStartY = 720;
  const colW = SIZE / 2;
  const rowH = 110;

  features.forEach((feat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = col * colW + colW / 2;
    const cy = gridStartY + row * rowH;

    // Feature card background
    ctx.fillStyle = 'rgba(212,175,55,0.06)';
    roundRect(ctx, cx - colW / 2 + 30, cy - 34, colW - 60, 70, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,175,55,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Icon
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(feat.icon, cx - 80, cy);

    // Title
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(feat.title, cx - 55, cy - 8);

    // Subtitle
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(feat.sub, cx - 55, cy + 14);
  });

  // --- Footer: Solana Mobile badge ---
  const footerY = SIZE - 60;

  // Footer divider
  const divGrad = ctx.createLinearGradient(80, footerY - 25, SIZE - 80, footerY - 25);
  divGrad.addColorStop(0, 'rgba(212,175,55,0)');
  divGrad.addColorStop(0.5, 'rgba(212,175,55,0.4)');
  divGrad.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, footerY - 25);
  ctx.lineTo(SIZE - 80, footerY - 25);
  ctx.stroke();

  // Solana gradient text
  const solGrad = ctx.createLinearGradient(SIZE / 2 - 200, 0, SIZE / 2 + 200, 0);
  solGrad.addColorStop(0, '#9945FF');
  solGrad.addColorStop(0.5, '#14F195');
  solGrad.addColorStop(1, '#9945FF');
  ctx.fillStyle = solGrad;
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Available on Solana Mobile dApp Store', SIZE / 2, footerY - 2);

  // Solana dot decorations
  const dotY = footerY + 22;
  const dotColors = ['#9945FF', '#14F195', '#9945FF', '#14F195', '#9945FF'];
  const dotStartX = SIZE / 2 - 60;
  dotColors.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(dotStartX + i * 30, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // --- Save output ---
  const outPath = path.join(__dirname, '../demo/editors_choice_graphic.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`Editor's Choice graphic saved: ${outPath} (${SIZE}x${SIZE})`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

generateEditorsChoice().catch(console.error);
