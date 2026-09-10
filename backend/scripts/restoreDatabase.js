const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function restoreDatabase() {
  const fileArg = process.argv[2];
  let filePath = fileArg;

  const backupDir = path.join(__dirname, '../backups');

  if (!filePath) {
    if (!fs.existsSync(backupDir)) {
      console.error('❌ No backup directory found.');
      process.exit(1);
    }
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
    if (files.length === 0) {
      console.error('❌ No backup JSON files found in backend/backups/');
      process.exit(1);
    }
    filePath = path.join(backupDir, files[0]);
    console.log(`ℹ️ No file specified. Restoring latest backup file: ${files[0]}`);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Backup file not found: ${filePath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  const backupData = JSON.parse(rawData);

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  for (const [colName, docs] of Object.entries(backupData)) {
    if (docs.length === 0) continue;

    console.log(`  🔄 Restoring collection [${colName}] (${docs.length} documents)...`);
    const collection = db.collection(colName);
    
    // Parse ISO dates and BSON ObjectIDs
    const parsedDocs = docs.map(doc => {
      const copy = { ...doc };
      if (copy._id && typeof copy._id === 'string' && copy._id.length === 24) {
        copy._id = new mongoose.Types.ObjectId(copy._id);
      }
      return copy;
    });

    for (const d of parsedDocs) {
      await collection.replaceOne({ _id: d._id }, d, { upsert: true });
    }
  }

  await mongoose.disconnect();
  console.log('\n✅ RESTORE COMPLETED SUCCESSFULLY!');
}

restoreDatabase().catch(err => {
  console.error('❌ Restore Failed:', err);
  process.exit(1);
});
