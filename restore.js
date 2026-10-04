const fs = require('fs');

const data = JSON.parse(fs.readFileSync('D:\\AERO\\.next\\dev\\server\\chunks\\ssr\\src_app_page_tsx_1chiuah._.js.map', 'utf8'));

let extracted = null;
if (data.sections) {
  for (const section of data.sections) {
    if (section.map && section.map.sources && section.map.sourcesContent) {
      const idx = section.map.sources.findIndex(s => s.includes('page.tsx'));
      if (idx !== -1) {
        extracted = section.map.sourcesContent[idx];
        break;
      }
    }
  }
}

if (extracted) {
  console.log("Restoring page.tsx...");
  fs.writeFileSync('D:\\AERO\\src\\app\\page.tsx', extracted);
  console.log("Restored!");
} else {
  console.log("Could not extract.");
}
