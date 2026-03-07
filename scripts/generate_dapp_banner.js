#!/usr/bin/env node
/**
 * Generates a 1200x600 dApp Store banner for Batak Tournament.
 * Output: demo/dapp_store_banner.png
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 600;

async function generateBanner() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // --- Background: dark green felt ---
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, '#0a1f12');
  bgGrad.addColorStop(0.5, '#0d2818');
  bgGrad.addColorStop(1, '#061509');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // --- Subtle felt texture overlay (grid of tiny dots) ---
  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  for (let x = 0; x < WIDTH; x += 6) {
    for (let y = 0; y < HEIGHT; y += 6) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Decorative gold border ---
  const borderWidth = 6;
  const borderGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  borderGrad.addColorStop(0, '#b8963e');
  borderGrad.addColorStop(0.5, '#d4af37');
  borderGrad.addColorStop(1, '#b8963e');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(borderWidth / 2, borderWidth / 2, WIDTH - borderWidth, HEIGHT - borderWidth);

  // Inner thin border
  ctx.strokeStyle = 'rgba(212,175,55,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, WIDTH - 36, HEIGHT - 36);

  // --- Left panel: Logo + Title + Tagline ---
  const leftCenterX = 320;
  const centerY = HEIGHT / 2;

  // Gold medallion circle (logo background)
  const medalRadius = 90;
  const medalX = leftCenterX;
  const medalY = centerY - 50;

  const medalGrad = ctx.createRadialGradient(
    medalX - 20, medalY - 20, 5,
    medalX, medalY, medalRadius
  );
  medalGrad.addColorStop(0, '#f0d060');
  medalGrad.addColorStop(0.4, '#d4af37');
  medalGrad.addColorStop(0.7, '#b8963e');
  medalGrad.addColorStop(1, '#8b6914');

  ctx.beginPath();
  ctx.arc(medalX, medalY, medalRadius, 0, Math.PI * 2);
  ctx.fillStyle = medalGrad;
  ctx.fill();

  // Medal border
  ctx.strokeStyle = '#f0d060';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Load and draw icon inside medal
  try {
    const iconPath = path.join(__dirname, '../mobile/assets/icon.png');
    const icon = await loadImage(iconPath);
    ctx.save();
    ctx.beginPath();
    ctx.arc(medalX, medalY, medalRadius - 6, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(icon, medalX - (medalRadius - 6), medalY - (medalRadius - 6),
      (medalRadius - 6) * 2, (medalRadius - 6) * 2);
    ctx.restore();
  } catch (e) {
    // Fallback: draw "B" letter
    ctx.fillStyle = '#0d2818';
    ctx.font = 'bold 100px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', medalX, medalY);
  }

  // App Title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('Batak Tournament', leftCenterX, medalY + medalRadius + 52);

  // Subtitle
  ctx.fillStyle = 'rgba(212,175,55,0.75)';
  ctx.font = '22px Georgia, serif';
  ctx.fillText("Turkey's Premier Card Game", leftCenterX, medalY + medalRadius + 84);

  // Features list
  const features = [
    '🃏  Real-time Multiplayer',
    '🏆  cNFT Trophies on Solana',
    '💎  SKR Token Staking',
    '📱  Mobile Wallet Adapter',
  ];
  ctx.textAlign = 'left';
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const featX = 80;
  const featStartY = medalY + medalRadius + 120;
  features.forEach((feat, i) => {
    ctx.fillText(feat, featX, featStartY + i * 30);
  });

  // --- Divider line ---
  const divX = 620;
  const divGrad = ctx.createLinearGradient(divX, 40, divX, HEIGHT - 40);
  divGrad.addColorStop(0, 'rgba(212,175,55,0)');
  divGrad.addColorStop(0.3, 'rgba(212,175,55,0.6)');
  divGrad.addColorStop(0.7, 'rgba(212,175,55,0.6)');
  divGrad.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 40);
  ctx.lineTo(divX, HEIGHT - 40);
  ctx.stroke();

  // --- Right panel: Screenshot thumbnail ---
  const rightCenterX = (divX + WIDTH) / 2;
  const ssWidth = 220;
  const ssHeight = 480;
  const ssX = rightCenterX - ssWidth / 2;
  const ssY = centerY - ssHeight / 2;

  // Phone frame shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#111';
  const phoneRadius = 24;
  roundRect(ctx, ssX - 10, ssY - 10, ssWidth + 20, ssHeight + 20, phoneRadius + 4);
  ctx.fill();
  ctx.restore();

  // Phone frame
  ctx.fillStyle = '#1a1a2e';
  roundRect(ctx, ssX - 10, ssY - 10, ssWidth + 20, ssHeight + 20, phoneRadius + 4);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Screenshot image or gameplay card placeholder
  try {
    const ssPath = path.join(__dirname, '../demo/lobby.png');
    const ss = await loadImage(ssPath);
    ctx.save();
    roundRect(ctx, ssX, ssY, ssWidth, ssHeight, phoneRadius - 4);
    ctx.clip();
    // Draw image maintaining aspect ratio, centered
    const imgAspect = ss.width / ss.height;
    const frameAspect = ssWidth / ssHeight;
    let drawW, drawH, drawX, drawY;
    if (imgAspect > frameAspect) {
      drawH = ssHeight;
      drawW = drawH * imgAspect;
      drawX = ssX - (drawW - ssWidth) / 2;
      drawY = ssY;
    } else {
      drawW = ssWidth;
      drawH = drawW / imgAspect;
      drawX = ssX;
      drawY = ssY - (drawH - ssHeight) / 2;
    }
    ctx.drawImage(ss, drawX, drawY, drawW, drawH);
    ctx.restore();
  } catch (e) {
    // Fallback: green game table placeholder
    ctx.save();
    roundRect(ctx, ssX, ssY, ssWidth, ssHeight, phoneRadius - 4);
    ctx.fillStyle = '#1a472a';
    ctx.fill();
    ctx.fillStyle = 'rgba(212,175,55,0.5)';
    ctx.font = 'bold 32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🃏', ssX + ssWidth / 2, ssY + ssHeight / 2);
    ctx.restore();
  }

  // Phone notch
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.roundRect(rightCenterX - 30, ssY - 14, 60, 16, 8);
  ctx.fill();

  // --- Bottom bar: Solana Mobile badge ---
  const badgeY = HEIGHT - 50;
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillStyle = 'rgba(212,175,55,0.7)';
  ctx.fillText('Available on Solana Mobile dApp Store  •  Seeker Compatible  •  MWA Wallet Support', WIDTH / 2, badgeY);

  // Solana gradient dots decoration
  const dotColors = ['#9945FF', '#14F195', '#9945FF'];
  const dotStartX = WIDTH / 2 - 30;
  dotColors.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(dotStartX + i * 30, badgeY + 18, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // --- Save output ---
  const outPath = path.join(__dirname, '../demo/dapp_store_banner.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`Banner saved: ${outPath} (${WIDTH}x${HEIGHT})`);
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

generateBanner().catch(console.error);
