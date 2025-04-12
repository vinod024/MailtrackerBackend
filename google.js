const { GoogleSpreadsheet } = require('google-spreadsheet');

// Validate environment variables immediately
if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
  throw new Error('Missing GOOGLE_SERVICE_ACCOUNT environment variable');
}

const SHEET_ID = '1VhNgQHRucjmR2itzi7ER6YKPhFbpw0v_0LQOXrmk4vk';
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const TIMEZONE = 'Asia/Kolkata';

// Helper function to get authenticated document
async function getAuthenticatedDoc() {
  try {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(SERVICE_ACCOUNT);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    console.error('🔴 Google Sheets authentication failed:', error.message);
    throw new Error('Failed to authenticate with Google Sheets');
  }
}

// 🔍 Enhanced open tracking with error handling
async function logOpenByCid(decodedCid) {
  if (!decodedCid || typeof decodedCid !== 'string') {
    throw new Error('Invalid CID: Must be a non-empty string');
  }

  try {
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Email Tracking Log'];
    
    if (!sheet) {
      throw new Error('Sheet "Email Tracking Log" not found');
    }

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const now = new Date().toLocaleString('en-GB', { timeZone: TIMEZONE });
    const trimmedCid = decodedCid.trim();

    // Find matching row
    const targetRow = rows.find(row => (row.get('CID') || '').trim() === trimmedCid);
    
    if (!targetRow) {
      console.warn(`⚠️ CID not found: ${trimmedCid}`);
      return false;
    }

    // Update counts
    const totalOpens = (parseInt(targetRow.get('Total Opens')) || 0) + 1;
    targetRow.set('Total Opens', totalOpens);
    targetRow.set('Last Seen Time', now);

    // Update first empty "Seen X" column
    for (let i = 1; i <= 10; i++) {
      const colName = `Seen ${i}`;
      if (!targetRow.get(colName)) {
        targetRow.set(colName, now);
        break;
      }
      // If all 10 are full, update the last one
      if (i === 10) {
        targetRow.set(colName, now);
      }
    }

    await targetRow.save();
    console.log(`✅ Open logged for ${trimmedCid} (Total: ${totalOpens})`);
    return true;

  } catch (error) {
    console.error('🔴 Failed to log open:', error.message);
    throw error;
  }
}

// ✉️ Robust row insertion with validation
async function insertTrackingRow(company, email, subject, type, sentTime, cid) {
  if (!cid) throw new Error('CID is required');

  try {
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Email Tracking Log'];

    if (!sheet) {
      throw new Error('Sheet "Email Tracking Log" not found');
    }

    const newRow = {
      'Company Name': company || 'N/A',
      'Email ID': email || 'N/A',
      'Subject': subject || 'No Subject',
      'Email Type': type || 'General',
      'Sent Time': sentTime || new Date().toLocaleString('en-GB', { timeZone: TIMEZONE }),
      'CID': cid,
      'Total Opens': 0,  // Initialize counters
      'Total PDF Views': 0,
      'Total Cal Clicks': 0,
      'Total Web Clicks': 0,
      'Total Portfolio Link Clicks': 0
    };

    // Initialize empty timestamp columns
    ['Last Seen', 'PDF View', 'Cal Click', 'Web Click', 'Portfolio Link'].forEach(prefix => {
      newRow[`${prefix} Time`] = '';
    });

    // Initialize Seen 1-10 columns
    for (let i = 1; i <= 10; i++) {
      newRow[`Seen ${i}`] = '';
    }

    await sheet.addRow(newRow);
    console.log(`📝 New row inserted for CID: ${cid}`);
    return true;

  } catch (error) {
    console.error('🔴 Failed to insert row:', error.message);
    throw error;
  }
}

module.exports = {
  logOpenByCid,
  insertTrackingRow
};