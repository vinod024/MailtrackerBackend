const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = '1VhNgQHRucjmR2itzi7ER6YKPhFbpw0v_0LQOXrmk4vk';

// ✅ Utility to decode Google-style base64 CID
function decodeBase64UrlSafe(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';
  const buffer = Buffer.from(str, 'base64');
  return buffer.toString('utf-8');
}

// 🔍 Log open by matching CID
async function logOpenByCid(cid) {
  const decodedCid = decodeBase64UrlSafe(cid);  // ✅ Decode to match Sheet format
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle['Email Tracking Log'];
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });

  const trimmedCid = decodedCid.trim();
  const target = rows.find(r => (r['CID'] || '').trim() === trimmedCid);

  if (!target) {
    console.error('❌ CID not found in sheet:', trimmedCid);
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
    if (i === 10) {
      target[col] = now;
    }
  }

  await target.save();
  console.log(`✅ Open logged for CID: ${trimmedCid}`);
}

// 🆕 Insert new row on email send
async function insertTrackingRow(company, email, subject, type, sentTime, cid) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['Email Tracking Log'];

  await sheet.addRow({
    'Company Name': company,
    'Email ID': email,
    'Subject': subject,
    'Email Type': type,
    'Sent Time': sentTime,
    'Total Opens': '',
    'Last Seen Time': '',
    'Seen 1': '', 'Seen 2': '', 'Seen 3': '', 'Seen 4': '', 'Seen 5': '',
    'Seen 6': '', 'Seen 7': '', 'Seen 8': '', 'Seen 9': '', 'Seen 10': '',
    'Total PDF Views': '', 'Last PDF View Time': '',
    'Total Cal Clicks': '', 'Last Cal Click Time': '',
    'Total Web Clicks': '', 'Last Web Click Time': '',
    'Total Portfolio Link Clicks': '', 'Last Portfolio Link Time': '',
    'CID': cid
  });

  console.log(`✅ Row inserted for CID: ${cid}`);
}

module.exports = {
  logOpenByCid,
  insertTrackingRow
};











