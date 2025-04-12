const { GoogleSpreadsheet } = require('google-spreadsheet');

// Validate configuration
if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
  throw new Error('Missing GOOGLE_SERVICE_ACCOUNT environment variable');
}

const SHEET_ID = '1VhNgQHRucjmR2itzi7ER6YKPhFbpw0v_0LQOXrmk4vk';
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const TIMEZONE = 'Asia/Kolkata';

async function getAuthenticatedSheet() {
  try {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(SERVICE_ACCOUNT);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['Email Tracking Log'];
    if (!sheet) {
      throw new Error('Sheet "Email Tracking Log" not found');
    }
    
    await sheet.loadHeaderRow();
    return sheet;
  } catch (error) {
    console.error('🔴 Google Sheets connection failed:', error.message);
    throw error;
  }
}

async function logOpenByCid(decodedCid) {
  if (!decodedCid) throw new Error('Missing CID');
  
  try {
    const sheet = await getAuthenticatedSheet();
    const rows = await sheet.getRows();
    const now = new Date().toLocaleString('en-GB', { timeZone: TIMEZONE });
    const trimmedCid = decodedCid.trim();

    const targetRow = rows.find(row => (row.get('CID') || '').trim() === trimmedCid);
    
    if (!targetRow) {
      console.warn(`CID not found: ${trimmedCid.substring(0, 50)}...`);
      return false;
    }

    // Update counts
    const totalOpens = (parseInt(targetRow.get('Total Opens')) || 0) + 1;
    targetRow.set('Total Opens', totalOpens);
    targetRow.set('Last Seen Time', now);

    // Update first empty "Seen X" column
    for (let i = 1; i <= 10; i++) {
      const col = `Seen ${i}`;
      if (!targetRow.get(col)) {
        targetRow.set(col, now);
        break;
      }
      if (i === 10) {
        targetRow.set(col, now); // Rotate if all are full
      }
    }

    await targetRow.save();
    console.log(`✅ Logged open for ${trimmedCid.substring(0, 30)}... (Total: ${totalOpens})`);
    return true;
  } catch (error) {
    console.error('🔴 Failed to log open:', error.message);
    throw error;
  }
}

module.exports = {
  logOpenByCid
};