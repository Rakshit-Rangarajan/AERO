const fs = require('fs');
const path = require('path');

const dir = 'D:\\AERO\\.next\\server\\chunks\\ssr';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.map'));

let recovered = false;
for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (data.sources) {
      const idx = data.sources.findIndex(s => s.endsWith('src/app/page.tsx'));
      if (idx !== -1 && data.sourcesContent && data.sourcesContent[idx]) {
        console.log('FOUND EXACT src/app/page.tsx in', file);
        fs.writeFileSync('D:\\AERO\\src\\app\\page.tsx', data.sourcesContent[idx]);
        recovered = true;
        break;
      }
    }
  } catch (e) {}
}
