const express = require('express');
const { logOpenByCid, insertTrackingRow } = require('./google');
const app = express();
const port = process.env.PORT || 3000;

// ✅ FIX: Decode Google-style WebSafe Base64 (matches Utilities.base64EncodeWebSafe)
function decodeBase64UrlSafe(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';
  const buffer = Buffer.from(str, 'base64');
  return buffer.toString('utf-8');
}

app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    if (!encodedCid) return res.status(400).send('Missing cid');

    // ✅ FIX: Use web-safe decoder
    const decoded = decodeBase64UrlSafe(encodedCid);
    const parts = decoded.split('||');
    const [company, email, subject, type, sentTime] = parts;

    console.log('📨 Open Pixel Triggered:', { company, email, subject, type, sentTime });

    await logOpenByCid(decoded);

    // 1x1 transparent GIF pixel response
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
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
