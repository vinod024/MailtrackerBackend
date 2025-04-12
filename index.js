const express = require('express');
const { logOpenByCid, insertTrackingRow } = require('./google');
const app = express();
const port = process.env.PORT || 3000;

// ✅ Base64 Web-Safe Decode (matches Apps Script encoding)
function decodeBase64UrlSafe(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

// ✅ Email Open Tracking Pixel Endpoint
app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    if (!encodedCid) return res.status(400).send('Missing cid');

    const decoded = decodeBase64UrlSafe(encodedCid);  // 🔥 Real decode
    const [company, email, subject, type, sentTime] = decoded.split('|');

    console.log('📨 Open Pixel Triggered:', { company, email, subject, type, sentTime });

    await logOpenByCid(encodedCid); // pass raw to google.js (it decodes again internally)

    // 1x1 transparent gif
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  } catch (err) {
    console.error('❌ Error processing /open:', err.message);
    res.status(500).send('Tracking failed');
  }
});

// ✅ Optional Root
app.get('/', (req, res) => {
  res.send('📬 Mailtracker backend is live!');
});

// 🚀 Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
