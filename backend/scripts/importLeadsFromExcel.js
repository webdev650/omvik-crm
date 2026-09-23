require('dotenv').config();
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Project = require('../models/Project');
const User = require('../models/User');
const { processIncomingLead } = require('../services/duplicateEngine');
const normalizePhone = require('../utils/normalizePhone');

// Helper to extract value from row across flexible header names
function getRowValue(row, possibleKeys) {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  const rowKeys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const matchedKey = rowKeys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pKey.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return String(row[matchedKey]).trim();
    }
  }
  return '';
}

async function runImport() {
  console.log('----------------------------------------------------');
  console.log('🚀 OMVIK CRM — Excel Lead Import Script');
  console.log('----------------------------------------------------\n');

  // 1. Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  await connectDB();
  console.log('✅ Connected to MongoDB successfully.\n');

  // 2. Identify Excel File Path
  const customPath = process.argv[2];
  const defaultPath = path.join(__dirname, 'omvik-leads.xlsx');
  const excelFilePath = customPath ? path.resolve(customPath) : defaultPath;

  if (!fs.existsSync(excelFilePath)) {
    console.error(`❌ Excel file not found at: ${excelFilePath}`);
    process.exit(1);
  }

  console.log(`📁 Target Excel File: ${excelFilePath}`);

  // 3. Read Workbook & Target Sheet 1 ("All Leads")
  const workbook = XLSX.readFile(excelFilePath);
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    console.error('❌ Excel file contains no valid sheets.');
    process.exit(1);
  }

  const primarySheetName = workbook.SheetNames[0];
  console.log(`📊 Total Sheets Found: ${workbook.SheetNames.length} (${workbook.SheetNames.join(', ')})`);
  console.log(`📌 Primary Sheet Selected (Sheet 1): "${primarySheetName}"\n`);

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[primarySheetName], { defval: '' });
  console.log(`📥 Read ${rawRows.length} row(s) from sheet "${primarySheetName}".\n`);

  if (rawRows.length === 0) {
    console.log('⚠️ Sheet 1 is empty. No rows to import.');
    await mongoose.connection.close();
    process.exit(0);
  }

  // 4. Resolve Active Projects & Submitting Admin User
  let projects = await Project.find({ isActive: true });
  if (projects.length === 0) {
    console.log('⚠️ No active projects found. Creating default project "Omvik Grand Residency"...');
    const defaultProj = await Project.create({
      name: 'Omvik Grand Residency',
      code: 'OGR-001',
      location: 'Bhubaneswar, Odisha',
      type: 'residential',
      isActive: true
    });
    projects = [defaultProj];
  }

  const defaultProject = projects[0];
  console.log(`🏗️ Default Project for Import: ${defaultProject.name} (${defaultProject.code})\n`);

  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.findOne();
  }

  const batchId = `SCRIPT-IMPORT-${Date.now()}`;
  console.log(`🏷️ Batch ID: ${batchId}`);
  console.log('⏳ Processing leads into MongoDB...\n');

  let importedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  const importDetails = [];

  // 5. Process Rows
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // Excel line number (Header is line 1)

    const rawName = getRowValue(row, ['name', 'full_name', 'fullname', 'customer_name', 'client_name', 'Name']);
    const rawMobile = getRowValue(row, ['mobile', 'phone', 'phone_number', 'primary_mobile', 'contact', 'Mobile', 'Phone Number', 'Phone', 'Contact']);
    const rawProject = getRowValue(row, ['project', 'project_name', 'code', 'Project', 'ProjectCode']);
    const rawSource = getRowValue(row, ['source', 'source_of_client', 'lead_source', 'channel', 'Source of Client', 'Source']) || 'EXCEL_BATCH_IMPORT';
    const rawIntent = getRowValue(row, ['intent', 'lead_intent', 'Intent', 'Priority', 'priority']) || '';
    const city = getRowValue(row, ['address', 'city', 'Address', 'City']) || '';

    const cleanMobile = normalizePhone(rawMobile);

    if (!rawName || !cleanMobile) {
      invalidCount++;
      importDetails.push({
        row: rowNum,
        status: 'INVALID',
        name: rawName || 'N/A',
        mobile: rawMobile || 'N/A',
        reason: !rawName ? 'Missing Customer Full Name' : 'Missing / Invalid 10-Digit Mobile Number'
      });
      continue;
    }

    // Resolve Target Project
    let targetProject = defaultProject;
    if (rawProject) {
      const found = projects.find(
        (p) =>
          p._id.toString() === rawProject ||
          p.name.toLowerCase() === rawProject.toLowerCase() ||
          p.code.toLowerCase() === rawProject.toLowerCase()
      );
      if (found) targetProject = found;
    }

    try {
      const result = await processIncomingLead(
        {
          rawName,
          rawMobile: cleanMobile,
          project: targetProject._id,
          source: rawSource,
          intent: rawIntent,
          importBatchId: batchId,
          city
        },
        adminUser
      );

      if (result.isDuplicate) {
        duplicateCount++;
        importDetails.push({
          row: rowNum,
          status: 'DUPLICATE_BLOCKED',
          name: result.customerName || rawName,
          mobile: cleanMobile,
          project: targetProject.name,
          owner: result.existingOwner || 'Unassigned',
          stage: result.existingStage || 'new'
        });
      } else {
        importedCount++;
        importDetails.push({
          row: rowNum,
          status: 'SUCCESS',
          name: result.customer?.name || rawName,
          mobile: cleanMobile,
          project: targetProject.name,
          leadCode: result.opportunity?.leadCode || 'N/A',
          owner: result.opportunity?.owner?.name || 'Auto-Assigned'
        });
      }
    } catch (err) {
      invalidCount++;
      importDetails.push({
        row: rowNum,
        status: 'ERROR',
        name: rawName,
        mobile: cleanMobile,
        reason: err.message
      });
    }
  }

  // 6. Summary Report
  console.log('====================================================');
  console.log('📊 IMPORT SUMMARY REPORT');
  console.log('====================================================');
  console.log(` Total Rows Processed : ${rawRows.length}`);
  console.log(` ✅ Successfully Imported: ${importedCount}`);
  console.log(` ⚠️ Duplicates Skipped : ${duplicateCount}`);
  console.log(` ❌ Invalid / Errors   : ${invalidCount}`);
  console.log('====================================================\n');

  if (importDetails.length > 0) {
    console.log('📋 Row-by-Row Execution Details:');
    importDetails.forEach((item) => {
      if (item.status === 'SUCCESS') {
        console.log(`  Row ${item.row}: ✅ [SUCCESS] ${item.name} (${item.mobile}) -> LeadCode: ${item.leadCode} | Owner: ${item.owner}`);
      } else if (item.status === 'DUPLICATE_BLOCKED') {
        console.log(`  Row ${item.row}: ⚠️ [DUPLICATE] ${item.name} (${item.mobile}) -> Assigned to: ${item.owner} (${item.stage})`);
      } else {
        console.log(`  Row ${item.row}: ❌ [${item.status}] ${item.name} (${item.mobile}) -> ${item.reason}`);
      }
    });
  }

  console.log('\n🎉 Lead import script execution finished.');
  await mongoose.connection.close();
  console.log('🔌 Connection closed.');
}

runImport().catch(async (err) => {
  console.error('Fatal Script Error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
