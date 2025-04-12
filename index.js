const express = require('express');
const { logOpenByCid, insertTrackingRow } = require('./google');
const app = express();
const port = process.env.PORT || 3000;

// ✅ Gmail-safe base64 decoder (exact match with Code.gs encoding)
function decodeBase64UrlSafe(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

// ✅ Transparent pixel
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    if (!encodedCid) return res.status(400).send('Missing cid');

    const decoded = decodeBase64UrlSafe(encodedCid); // ✅ decode for log only
    console.log('📨 Open Pixel Triggered:', decoded);

    await logOpenByCid(encodedCid); // ✅ pass raw encoded cid to google.js

    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  } catch (err) {
    console.error('❌ Error processing /open:', err.message);
    res.status(500).send('Tracking failed');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
