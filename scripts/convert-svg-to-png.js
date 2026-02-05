const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const imagesDir = path.join(__dirname, '../metadata/images');
const svgFiles = ['gold-tier', 'silver-tier', 'bronze-tier', 'legendary-tier'];

async function convertSvgToPng() {
  // Try using canvas with a simpler approach - just create PNG with embedded SVG
  for (const name of svgFiles) {
    const svgPath = path.join(imagesDir, `${name}.svg`);
    const pngPath = path.join(imagesDir, `${name}.png`);

    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  ${name}.svg not found, skipping...`);
      continue;
    }

    try {
      // Read SVG content
      const svgContent = fs.readFileSync(svgPath, 'utf8');

      // Create canvas and convert SVG to data URL
      const canvas = createCanvas(512, 512);
      const ctx = canvas.getContext('2d');

      // Load SVG from data URI
      const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
      const img = await loadImage(dataUri);

      ctx.drawImage(img, 0, 0, 512, 512);

      // Save as PNG
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(pngPath, buffer);

      console.log(`✅ Created ${name}.png`);
    } catch (error) {
      console.error(`❌ Error converting ${name}:`, error.message);
    }
  }

  console.log('\n🎨 Conversion complete!');
}

convertSvgToPng().catch(console.error);
