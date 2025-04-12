require('dotenv').config();
const express = require('express');
const { logOpenByCid } = require('./google');
const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const testDoc = new GoogleSpreadsheet(process.env.SHEET_ID);
    await testDoc.useServiceAccountAuth(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT));
    await testDoc.loadInfo();
    
    res.status(200).json({ 
      status: 'healthy',
      services: {
        googleSheets: 'connected',
        memoryUsage: process.memoryUsage().rss / (1024 * 1024) + 'MB'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

// Tracking endpoint with enhanced validation
app.get('/open', async (req, res) => {
  try {
    // Validate CID exists
    const encodedCid = req.query.cid;
    if (!encodedCid || encodedCid.length < 10) {
      console.warn('⚠️ Invalid CID received:', encodedCid);
      return res.status(400).send('Invalid tracking parameters');
    }

    // Decode and validate structure
    const decoded = Buffer.from(encodedCid, 'base64url').toString('utf-8');
    const parts = decoded.split('||');
    
    if (parts.length !== 5) {
      console.warn('⚠️ Malformed CID structure:', decoded);
      return res.status(400).send('Invalid tracking data format');
    }

    const [company, email, subject, type, sentTime] = parts;
    
    // Log the request
    console.log('📨 Open Pixel Triggered:', { 
      company: company || 'Unknown',
      email: email ? email.substring(0, 3) + '...@...' + email.split('@')[1] : 'None',
      subject: subject ? subject.substring(0, 20) + (subject.length > 20 ? '...' : '') : 'None',
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
    console.error('❌ Critical error in /open:', {
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

// Start server with graceful shutdown
const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Tracking endpoint: http://localhost:${port}/open?cid=YOUR_CID`);
});

// Handle shutdown signals
const shutdown = async () => {
  console.log('🛑 Received shutdown signal');
  
  server.close(() => {
    console.log('🔴 Server closed');
    process.exit(0);
  });

  // Force shutdown after 5 seconds
  setTimeout(() => {
    console.error('⚠️ Forcing shutdown due to timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);