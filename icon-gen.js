const fs = require('fs');
const { PNG } = require('pngjs');

const sizes = [16, 32, 48, 128];
const dir = 'icons';

if (!fs.existsSync(dir)) fs.mkdirSync(dir);

sizes.forEach(size => {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = 213;       // R
      png.data[idx + 1] = 34;    // G
      png.data[idx + 2] = 38;    // B
      png.data[idx + 3] = 255;   // A
    }
  }
  const filePath = `${dir}/${size}.png`;
  png.pack().pipe(fs.createWriteStream(filePath));
  console.log(`Generated ${filePath}`);
});
