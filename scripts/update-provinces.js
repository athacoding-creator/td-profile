const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json';
const targetPath = path.join(__dirname, '../src/data/provinces.json');

console.log('Mengambil data provinsi terbaru...');

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      // Validasi JSON
      JSON.parse(data);
      fs.writeFileSync(targetPath, data);
      console.log('Data provinsi berhasil diperbarui di:', targetPath);
    } catch (e) {
      console.error('Gagal memperbarui data: Format JSON tidak valid');
    }
  });
}).on('error', (err) => {
  console.error('Gagal mengambil data:', err.message);
});
