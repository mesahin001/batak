const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const publicDir = path.join(__dirname, '../client/public');
const imagesDir = path.join(publicDir, 'images');

// Ensure images directory exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Draw Batak card icon
function drawIcon(ctx, size) {
  const centerX = size / 2;
  const centerY = size / 2;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1a0a0a');
  gradient.addColorStop(1, '#2d0a0a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Card shape
  const cardWidth = size * 0.5;
  const cardHeight = size * 0.7;
  const cardX = (size - cardWidth) / 2;
  const cardY = (size - cardHeight) / 2;

  // Card shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.roundRect(cardX + 4, cardY + 4, cardWidth, cardHeight, 8);
  ctx.fill();

  // Card background
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 8);
  ctx.fill();

  // Gold border
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cardX + 2, cardY + 2, cardWidth - 4, cardHeight - 4, 6);
  ctx.stroke();

  // Spades symbol (♠) - Batak trump
  ctx.fillStyle = '#000';
  ctx.font = `bold ${size * 0.25}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠', centerX, centerY);

  // Corner symbols
  ctx.font = `${size * 0.08}px Arial`;
  ctx.fillStyle = '#FFD700';
  ctx.fillText('♥', cardX + size * 0.08, cardY + size * 0.12);
  ctx.fillText('♦', cardX + cardWidth - size * 0.08, cardY + size * 0.12);
  ctx.fillText('♣', cardX + size * 0.08, cardY + cardHeight - size * 0.08);
  ctx.fillText('♠', cardX + cardWidth - size * 0.08, cardY + cardHeight - size * 0.08);
}

// Generate maskable icon (safe center area)
function drawMaskableIcon(ctx, size) {
  // Full size background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#8B0000');
  gradient.addColorStop(0.5, '#B22222');
  gradient.addColorStop(1, '#8B0000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Safe center area (circular)
  const centerX = size / 2;
  const centerY = size / 2;
  const safeRadius = size * 0.4;

  ctx.fillStyle = '#1a0a0a';
  ctx.beginPath();
  ctx.arc(centerX, centerY, safeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw simplified icon in safe area
  const cardSize = safeRadius * 0.8;
  const cardX = centerX - cardSize / 2;
  const cardY = centerY - cardSize / 2;

  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardSize, cardSize * 1.4, 6);
  ctx.fill();

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX + 2, cardY + 2, cardSize - 4, cardSize * 1.4 - 4, 4);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = `bold ${safeRadius * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠', centerX, centerY);
}

// Generate favicon (simple version)
function drawFavicon(ctx, size) {
  // Background
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(0, 0, size, size);

  // Gold border
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  // Spades
  ctx.fillStyle = '#000';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠', size / 2, size / 2);
}

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Generate standard icons
  for (const size of iconSizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    drawIcon(ctx, size);

    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(imagesDir, filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);

    console.log(`✅ Created ${filename}`);
  }

  // Generate maskable icon
  for (const size of [192, 512]) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    drawMaskableIcon(ctx, size);

    const filename = `icon-maskable-${size}x${size}.png`;
    const filepath = path.join(imagesDir, filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);

    console.log(`✅ Created ${filename} (maskable)`);
  }

  // Generate favicon
  const faviconSizes = [16, 32, 48];
  for (const size of faviconSizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    drawFavicon(ctx, size);

    const filename = `favicon-${size}x${size}.png`;
    const filepath = path.join(imagesDir, filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);

    console.log(`✅ Created ${filename}`);
  }

  // Also save main favicon.ico (using 32x32 as base)
  const favicon32 = path.join(imagesDir, 'favicon-32x32.png');
  if (fs.existsSync(favicon32)) {
    fs.copyFileSync(favicon32, path.join(publicDir, 'favicon.ico'));
    console.log(`✅ Created favicon.ico`);
  }

  console.log('\n🎉 All icons generated successfully!');
  console.log(`📁 Location: ${imagesDir}`);
}

generateIcons().catch(console.error);
