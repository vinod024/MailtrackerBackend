const express = require('express');
const { logOpenByCid, insertTrackingRow } = require('./google');
const app = express();
const port = process.env.PORT || 3000;

app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    if (!encodedCid) return res.status(400).send('Missing cid');

    const decoded = Buffer.from(encodedCid, 'base64url').toString('utf-8');
    const parts = decoded.split('||');
    const [company, email, subject, type, sentTime] = parts;

    console.log('📨 Open Pixel Triggered:', { company, email, subject, type, sentTime });

    await logOpenByCid(decoded);

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
