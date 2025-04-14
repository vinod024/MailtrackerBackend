const express = require('express');
const { logOpenByCid, insertTrackingRow } = require('./google');
const app = express();
const port = process.env.PORT || 3000;

// ✅ Decode Google-style base64WebSafe CID
function decodeBase64UrlSafe(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}


// ✅ Email Open Tracking Endpoint
app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    if (!encodedCid) return res.status(400).send('Missing cid');

    const decoded = decodeBase64UrlSafe(encodedCid); // 🧠 Google-compatible decode
    const [company, email, subject, type, sentTime] = decoded.split('||');

    console.log('📨 Open Pixel Triggered:', { company, email, subject, type, sentTime });

    await logOpenByCid(decoded); // 🔁 Google Sheets log

    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  } catch (err) {
    console.error('❌ Error processing /open:', err.message);
    res.status(500).send('Tracking failed');
  }
});

// ✅ Optional root route
app.get('/', (req, res) => {
  res.send('📬 Mailtracker backend is live!');
});

// ✅ Launch server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});



