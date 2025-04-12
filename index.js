require('dotenv').config();
const express = require('express');
const { logOpenByCid } = require('./google');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint (required by Railway)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'live',
    timestamp: new Date().toISOString(),
    service: 'Email Tracker',
    version: '2.0.0'
  });
});

// Enhanced tracking endpoint
app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    
    // Validate CID parameter
    if (!encodedCid || encodedCid.length < 10) {
      console.warn('Invalid CID received:', encodedCid?.substring(0, 50));
      return res.status(400).send('Invalid tracking parameters');
    }

    // Decode and validate structure
    const decoded = Buffer.from(encodedCid, 'base64url').toString('utf-8');
    const parts = decoded.split('||');
    
    if (parts.length !== 5) {
      console.warn('Malformed CID structure:', decoded?.substring(0, 100));
      return res.status(400).send('Invalid tracking data format');
    }

    const [company, email, subject, type, sentTime] = parts;
    
    console.log('📨 Open detected:', {
      company: company || 'Unknown',
      email: email ? `${email.substring(0, 3)}...@...${email.split('@')[1]}` : 'None',
      subject: subject?.substring(0, 20) + (subject?.length > 20 ? '...' : ''),
      type,
      sentTime
    });

    // Record the open
    await logOpenByCid(decoded);

    // Return transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }).send(pixel);

  } catch (err) {
    console.error('❌ Tracking error:', {
      error: err.message,
      stack: err.stack,
      query: req.query
    });
    res.status(500).send('Tracking service unavailable');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with proper binding
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`🔗 Health check: http://0.0.0.0:${port}/`);
  console.log(`📌 Tracking endpoint: http://0.0.0.0:${port}/open?cid=YOUR_CID`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Received shutdown signal');
  server.close(() => {
    console.log('🔴 Server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('⚠️ Forcing shutdown');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);