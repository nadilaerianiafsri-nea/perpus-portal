// Static location from OpenStreetMap way 751217532, verified 6 October 2026.
const latitude = 0.5210168;
const longitude = 101.447917;
exports.serviceInfo = Object.freeze({
  address: 'Jl. Jend. Sudirman No.233, Sumahilang, Kec. Pekanbaru Kota, Kota Pekanbaru, Riau 28111',
  hours: '08.00–15.00',
  phone: '0811-6904-422',
  phoneUrl: 'tel:+628116904422',
  email: 'humaskumriau@gmail.com',
  latitude,
  longitude,
  openStreetMapUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`,
  mapEmbedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.002}%2C${latitude - 0.0015}%2C${longitude + 0.002}%2C${latitude + 0.0015}&layer=mapnik&marker=${latitude}%2C${longitude}`,
});
