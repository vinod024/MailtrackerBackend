const { GoogleSpreadsheet } = require('google-spreadsheet');

// 🔐 Decode JSON from Railway environment variable
const decodedCreds = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
const creds = JSON.parse(decodedCreds);

// 📄 Sheet & sender setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'vinodk@tatsa.tech';

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

    await new Promise(resolve => setTimeout(resolve, 5000)); // simulate 5s read time

    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['Email Tracking Log'];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const target = rows.find(r => (r['CID'] || '').trim() === encodedCid.trim());
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
