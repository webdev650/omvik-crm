const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'omvik-leads.xlsx');

if (!fs.existsSync(filePath)) {
  console.error(`❌ Excel file not found at ${filePath}`);
  process.exit(1);
}

console.log(`📁 Loading file: ${filePath}\n`);

const workbook = XLSX.readFile(filePath);

console.log(`📊 Found ${workbook.SheetNames.length} sheet(s) in Excel file:`);
workbook.SheetNames.forEach((sheetName, index) => {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`   Sheet ${index + 1}: "${sheetName}" (${rows.length} rows)`);
});

const targetSheet = workbook.SheetNames[0];
console.log(`\n✅ Primary sheet for import (Sheet 1): "${targetSheet}"`);

const sheet1Data = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet], { defval: '' });
console.log(`📌 Sample data from Sheet 1 (${targetSheet}):`);
console.log(sheet1Data.slice(0, 3));

console.log(`\nℹ️  Note: importController.js automatically parses workbook.SheetNames[0] ("${targetSheet}") to prevent duplicate lead imports across multi-tab Excel files.`);
