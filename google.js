const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./mailtracker-backend-456208-e400e290f053.json');

const SHEET_ID = '1VhNgQHRucjmR2itzi7ER6YKPhFbpw0v_0LQOXrmk4vk';
const SENDER_EMAIL = 'vinodk@tatsa.tech'; // fixed as per current user

function decodeBase64UrlSafe(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';
  const buffer = Buffer.from(str, 'base64');
  return buffer.toString('utf-8');
}

async function logOpenByCid(encodedCid) {
  try {
    const decodedCid = decodeBase64UrlSafe(encodedCid);
    const [company, email, subject, type, sentTime] = decodedCid.split('||');
    const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });

    if (!email || email.toLowerCase() === SENDER_EMAIL.toLowerCase()) {
      console.log(`⛔ Ignored self-open for: ${email}`);
      return;
    }

    // 5-second engagement simulation
    await new Promise(resolve => setTimeout(resolve, 5000));

    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['Email Tracking Log'];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const trimmedCid = encodedCid.trim();
    const target = rows.find(r => (r['CID'] || '').trim() === trimmedCid);

    if (!target) {
      console.error('❌ CID not found in sheet:', decodedCid);
      return;
    }

    const total = parseInt(target['Total Opens']) || 0;
    target['Total Opens'] = total + 1;
    target['Last Seen Time'] = now;

    for (let i = 1; i <= 10; i++) {
      const col = `Seen ${i}`;
      if (!target[col]) {
        target[col] = now;
        break;
      }
    }

    await target.save();
    console.log(`✅ Logged open for ${email} at ${now}`);
  } catch (err) {
    console.error('❌ logOpenByCid error:', err.message);
  }
}

module.exports = {
  logOpenByCid
};
