// Gekoppeld aan de opgegeven Google Sheet. Gebruik tabblad AoS Scorebord.
const SHEET_ID = '143a0UmHPdKndutN8NJ8dixGCeOJRQaPuKb50I3Caj9Y';
const TAB = 'AoS Scorebord';
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Age of Sigmar · Scorebord')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function sheet_() {
  const book = SpreadsheetApp.openById(SHEET_ID);
  let sheet = book.getSheetByName(TAB);
  if (!sheet) {
    sheet = book.insertSheet(TAB);
    sheet.getRange(1, 1, 3, 5).setValues([
      ['Speler', 'Command Points', 'Army Points', 'Victory Points', 'Bijgewerkt'],
      ['Speler 1', 0, 0, 0, ''], ['Speler 2', 0, 0, 0, '']
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:E1').setFontWeight('bold');
    sheet.autoResizeColumns(1, 5);
  }
  return sheet;
}
function getScores() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const rows = sheet_().getRange(2, 1, 2, 4).getValues();
    return {players: rows.map((r, i) => ({name: String(r[0] || ('Speler ' + (i + 1))),
      command: number_(r[1]), army: number_(r[2]), victory: number_(r[3])}))};
  } finally { lock.releaseLock(); }
}
function number_(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw new Error('Ongeldige score in Sheet. Gebruik een heel getal van 0 tot 1000000.');
  return n;
}
function updateScore(change) {
  if (!change || ![0, 1].includes(change.player)) throw new Error('Ongeldige speler.');
  const columns = {name: 1, command: 2, army: 3, victory: 4};
  if (!Object.prototype.hasOwnProperty.call(columns, change.key)) throw new Error('Ongeldige teller.');
  let value = change.key === 'name' ? String(change.value).trim().slice(0, 60) : number_(change.value);
  if (change.key === 'name' && (!value || /^[=+\-@]/.test(value))) throw new Error('Gebruik een gewone spelersnaam.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = sheet_();
    sheet.getRange(change.player + 2, columns[change.key]).setValue(value);
    sheet.getRange(change.player + 2, 5).setValue(new Date());
    SpreadsheetApp.flush();
    return {ok: true};
  } finally { lock.releaseLock(); }
}
