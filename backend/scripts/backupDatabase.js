const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function backupDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is missing in environment variables.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const backupData = {};

  console.log(`Found ${collections.length} collection(s) to backup.`);

  for (const colInfo of collections) {
    const colName = colInfo.name;
    const documents = await db.collection(colName).find({}).toArray();
    backupData[colName] = documents;
    console.log(`  📦 Backed up collection [${colName}]: ${documents.length} document(s)`);
  }

  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = path.join(backupDir, `omvik-crm-backup-${dateStr}.json`);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

  await mongoose.disconnect();

  console.log(`\n✅ BACKUP COMPLETED SUCCESSFULLY!`);
  console.log(`📁 Backup File Saved To: ${filePath}`);
}

backupDatabase().catch(err => {
  console.error('❌ Backup Failed:', err);
  process.exit(1);
});
