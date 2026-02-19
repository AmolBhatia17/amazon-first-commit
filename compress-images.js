const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imageDir = path.join(__dirname, 'public', 'image');
const images = [
  { input: 'win_1.png', output: 'win_1.png', quality: 85, format: 'webp' },
  { input: 'win_2.png', output: 'win_2.png', quality: 85, format: 'webp' },
  { input: 'win_3.jpg', output: 'win_3.jpg', quality: 85, format: 'webp' },
  { input: 'win_4.png', output: 'win_4.png', quality: 85, format: 'webp' },
];

async function compressImages() {
  console.log('Starting image compression...\n');
  
  for (const img of images) {
    const inputPath = path.join(imageDir, img.input);
    const outputPath = path.join(imageDir, img.output.replace(/\.(png|jpg)$/, '.webp'));
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  ${img.input} not found, skipping...`);
      continue;
    }
    
    const originalStats = fs.statSync(inputPath);
    const originalSize = (originalStats.size / 1024).toFixed(2);
    
    try {
      // Compress and convert to WebP
      await sharp(inputPath)
        .webp({ quality: img.quality })
        .toFile(outputPath);
      
      const compressedStats = fs.statSync(outputPath);
      const compressedSize = (compressedStats.size / 1024).toFixed(2);
      const savings = ((1 - compressedStats.size / originalStats.size) * 100).toFixed(1);
      
      console.log(`✅ ${img.input}`);
      console.log(`   Original: ${originalSize} KB`);
      console.log(`   Compressed: ${compressedSize} KB (${savings}% smaller)`);
      console.log(`   Saved as: ${path.basename(outputPath)}\n`);
    } catch (error) {
      console.error(`❌ Error compressing ${img.input}:`, error.message);
    }
  }
  
  console.log('Compression complete!');
}

compressImages().catch(console.error);
