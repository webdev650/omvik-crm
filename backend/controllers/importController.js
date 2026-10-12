const XLSX = require('xlsx');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Project = require('../models/Project');
const ImportBatch = require('../models/ImportBatch');
const BatchAccess = require('../models/BatchAccess');
const { processIncomingLead } = require('../services/duplicateEngine');
const normalizePhone = require('../utils/normalizePhone');

// Helper to extract value from row across flexible header names
function getRowValue(row, possibleKeys) {
  // 1. Direct exact key lookup
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }

  // 2. Case-insensitive and alphanumeric-only key lookup
  const rowKeys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const pClean = pKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedKey = rowKeys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pClean
    );
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return String(row[matchedKey]).trim();
    }
  }

  // 3. Substring / fuzzy key matching
  for (const pKey of possibleKeys) {
    const pClean = pKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (pClean.length < 3) continue;
    const matchedKey = rowKeys.find((k) => {
      const kClean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return kClean.includes(pClean) || pClean.includes(kClean);
    });
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return String(row[matchedKey]).trim();
    }
  }

  return '';
}

/**
 * Preview bulk lead import (Excel / CSV parsing and check-only duplicate analysis)
 * @route POST /api/leads/import/preview
 * @access Private (super_admin, admin, director, telecaller, team_lead)
 */
const previewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file' });
    }

    // 1. Read Excel / CSV buffer with fallback
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    } catch (parseErr) {
      try {
        const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
        workbook = XLSX.read(text, { type: 'string', cellDates: true });
      } catch (fallbackErr) {
        return res.status(400).json({ message: 'Could not parse uploaded file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV (.csv) file.' });
      }
    }

    // Find the first sheet that contains data rows
    let sheet = null;
    let sheetName = null;
    let rawRows = [];

    const sheetNames = workbook?.SheetNames || [];
    for (const name of sheetNames) {
      const candidateSheet = workbook.Sheets[name];
      const candidateRows = XLSX.utils.sheet_to_json(candidateSheet, { defval: '', raw: false, blankrows: false });
      if (candidateRows && candidateRows.length > 0) {
        sheet = candidateSheet;
        sheetName = name;
        rawRows = candidateRows;
        break;
      }
    }

    if (!sheet || !rawRows || rawRows.length === 0) {
      return res.status(400).json({ message: 'Uploaded spreadsheet is empty or contains no valid data rows' });
    }

    // 2. Fetch active projects for matching
    let projects = await Project.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] });
    if (!projects || projects.length === 0) {
      projects = await Project.find({});
    }

    const fallbackProjectId = req.body?.projectId || req.query?.projectId;
    let defaultProject = (fallbackProjectId && projects.find(p => p._id.toString() === String(fallbackProjectId))) || projects[0] || null;
    if (!defaultProject) {
      try {
        defaultProject = await Project.create({
          name: 'Om Sai Ashraya',
          code: 'DDV',
          projectCode: 'DDV',
          location: 'Bhubaneswar',
          status: 'active',
          isActive: true
        });
        projects = [defaultProject];
        console.log('[previewImport] Created default project:', defaultProject.name);
      } catch (prjErr) {
        defaultProject = await Project.findOne();
      }
    }

    const valid = [];
    const duplicates = [];
    const invalid = [];

    // 3. Process each row
    for (let i = 0; i < rawRows.length; i++) {
      const origRow = rawRows[i];
      const rowNum = i + 2; // Header is row 1

      try {
        // Clean row object keys (strip BOM, quotes, control characters)
        const row = {};
        for (const [key, val] of Object.entries(origRow)) {
          const cleanKey = String(key)
            .replace(/^\uFEFF/, '')
            .replace(/^["']|["']$/g, '')
            .trim();
          row[cleanKey] = val;
        }

        let rawName = getRowValue(row, [
          'FULL NAMEE', 'Full Namee', 'full namee', 'full_namee', 'name', 'full_name', 'fullname', 'customer_name', 'client_name', 'Name',
          'Customer Name', 'CustomerName', 'client_name', 'customer', 'lead_name',
          'lead', 'contact_name', 'person_name', 'applicant_name', 'party_name', 'client'
        ]);
        let rawMobile = getRowValue(row, [
          'Phone Number', 'phone number', 'phone_number', 'mobile', 'phone', 'primary_mobile', 'contact', 'Mobile', 'Phone', 'Contact',
          'Mobile Number', 'MobileNumber', 'mobile_number', 'phoneNumber',
          'mobileNo', 'mobile_no', 'Contact Number', 'contact_number', 'cell', 'telephone',
          'number', 'phone1', 'mobile1', 'primary_phone', 'contact_no', 'contactno'
        ]);
        const rawProject = getRowValue(row, [
          'project', 'project_name', 'code', 'Project', 'ProjectCode',
          'Project Name', 'ProjectName', 'project_code', 'projectcode'
        ]);
        const rawSource = getRowValue(row, [
          'Source of Client', 'source of client', 'source_of_client', 'source', 'lead_source', 'channel', 'Source', 'Lead Source', 'leadsource'
        ]) || 'BULK_IMPORT';
        const rawIntent = getRowValue(row, [
          'intent', 'lead_intent', 'Intent', 'Priority', 'priority', 'Lead Intent', 'leadintent'
        ]) || '';
        const rawEmail = getRowValue(row, [
          'email', 'email_address', 'Email', 'Email Address', 'emailaddress'
        ]);
        const rawCity = getRowValue(row, [
          'Address', 'address', 'city', 'location', 'City', 'Location'
        ]);

        let cleanMobile = normalizePhone(rawMobile);

        // SMART AUTO-DETECT 1: If cleanMobile missing/invalid, scan ALL cell values in row for 10-digit phone number
        if (!cleanMobile || cleanMobile.length < 10) {
          for (const [k, val] of Object.entries(row)) {
            if (!val) continue;
            const candidate = normalizePhone(String(val));
            if (candidate && candidate.length === 10) {
              cleanMobile = candidate;
              rawMobile = String(val);
              break;
            }
          }
        }

        // SMART AUTO-DETECT 2: If rawName missing, scan text cells in row for candidate customer name
        if (!rawName) {
          for (const [k, val] of Object.entries(row)) {
            if (!val) continue;
            const strVal = String(val).trim();
            const candidatePhone = normalizePhone(strVal);
            if (candidatePhone && candidatePhone.length >= 10) continue;
            if (
              strVal.length >= 2 &&
              !/^\d+$/.test(strVal) &&
              !strVal.includes('http') &&
              !strVal.toLowerCase().includes('sheet') &&
              !strVal.toLowerCase().includes('batch') &&
              !projects.some((p) => p && p.name && p.name.toLowerCase() === strVal.toLowerCase())
            ) {
              rawName = strVal;
              break;
            }
          }
        }

        // SMART FALLBACK 3: If mobile is valid (10 digits) but rawName is still empty, auto-generate Prospect Name
        if (!rawName && cleanMobile && cleanMobile.length === 10) {
          rawName = `Prospect (${cleanMobile})`;
        }

        let cleanIntent = null;
        if (rawIntent) {
          const l = rawIntent.toLowerCase();
          if (['high', 'medium', 'low'].includes(l)) cleanIntent = l;
        }

        // Validation check
        if (!rawName || !cleanMobile || cleanMobile.length < 10) {
          invalid.push({
            rowNumber: rowNum,
            rawRow: row,
            reason: !rawName ? 'Missing customer full name' : 'Missing or invalid 10-digit mobile number'
          });
          continue;
        }

        // Resolve Project
        let targetProject = defaultProject;
        if (rawProject && projects.length > 0) {
          const found = projects.find(
            (p) =>
              p &&
              ((p._id ? p._id.toString() : '') === String(rawProject) ||
                (p.name ? p.name.toLowerCase() : '') === String(rawProject).toLowerCase() ||
                (p.code ? p.code.toLowerCase() : '') === String(rawProject).toLowerCase() ||
                (p.projectCode ? p.projectCode.toLowerCase() : '') === String(rawProject).toLowerCase())
          );
          if (found) {
            targetProject = found;
          }
        }

        if (!targetProject && defaultProject) {
          targetProject = defaultProject;
        }

        if (!targetProject) {
          invalid.push({
            rowNumber: rowNum,
            rawRow: row,
            reason: 'No active real-estate project available in database'
          });
          continue;
        }

      // Check-only Duplicate Engine Analysis
      const customer = await Customer.findOne({
        $or: [{ primaryMobile: cleanMobile }, { alternateMobile: cleanMobile }]
      });

      if (customer) {
        const activeOpp = await Opportunity.findOne({
          customer: customer._id,
          project: targetProject._id,
          isActive: true
        }).populate('owner', 'name email role');

        if (activeOpp) {
          const customerName = customer.name || rawName.trim();
          const projectName = targetProject.name;
          const ownerName = activeOpp.owner ? activeOpp.owner.name : 'Unassigned';
          const stageName = activeOpp.stage || 'new';

          duplicates.push({
            rowNumber: rowNum,
            rawName: rawName.trim(),
            mobile: cleanMobile,
            email: rawEmail || customer.email || '',
            city: rawCity || customer.city || '',
            project: targetProject.name,
            projectId: targetProject._id,
            source: rawSource,
            intent: cleanIntent,
            reason: `This lead is already assigned — ${customerName} for ${projectName} is currently owned by ${ownerName} (Stage: ${stageName}).`,
            customerName,
            projectName,
            existingOwner: ownerName,
            existingStage: stageName,
            existingCustomer: { _id: customer._id, name: customer.name },
            existingOpportunity: {
              _id: activeOpp._id,
              stage: activeOpp.stage,
              owner: activeOpp.owner
                ? { _id: activeOpp.owner._id, name: activeOpp.owner.name, email: activeOpp.owner.email }
                : null
            }
          });
        } else {
          valid.push({
            rowNumber: rowNum,
            rawName: rawName.trim(),
            mobile: cleanMobile,
            email: rawEmail || customer.email || '',
            city: rawCity || customer.city || '',
            project: targetProject.name,
            projectId: targetProject._id,
            source: rawSource,
            intent: cleanIntent,
            existingCustomer: { _id: customer._id, name: customer.name },
            isExistingCustomer: true
          });
        }
      } else {
        valid.push({
          rowNumber: rowNum,
          rawName: rawName.trim(),
          mobile: cleanMobile,
          email: rawEmail || '',
          city: rawCity || '',
          project: targetProject.name,
          projectId: targetProject._id,
          source: rawSource,
          intent: cleanIntent,
          isExistingCustomer: false
        });
      }
    } catch (rowErr) {
        console.error(`Error processing row ${rowNum}:`, rowErr);
        invalid.push({
          rowNumber: rowNum,
          rawRow: origRow,
          reason: rowErr.message || 'Row processing error'
        });
      }
    }

    res.json({
      success: true,
      total: rawRows.length,
      summary: {
        totalRows: rawRows.length,
        validCount: valid.length,
        duplicateCount: duplicates.length,
        invalidCount: invalid.length
      },
      valid,
      duplicates,
      invalid
    });
  } catch (error) {
    console.error('Error in previewImport:', error);
    return res.status(400).json({
      message: `Failed to process spreadsheet: ${error.message || 'Invalid file format'}`
    });
  }
};

/**
 * Confirm bulk lead import (Processes previewed leads through duplicate engine & auto-assignment)
 * @route POST /api/leads/import/confirm
 * @access Private (super_admin, admin, director, telecaller, team_lead)
 */
const confirmImport = async (req, res, next) => {
  try {
    const { leads, batchName, targetUserId, projectId: fallbackProjectId } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: 'No valid leads array provided for confirmation' });
    }

    const assignedBatchId = (batchName && String(batchName).trim()) || `Sheet-${Date.now()}`;
    console.log(`[confirmImport] Starting bulk import of ${leads.length} leads under batch "${assignedBatchId}"...`);

    // Load active projects for robust project ID resolution
    let projects = await Project.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] });
    if (!projects || projects.length === 0) {
      projects = await Project.find({});
    }

    // Fallback: If no projects in database at all, auto-create a default project so import succeeds
    let defaultProject = (fallbackProjectId && projects.find(p => p._id.toString() === String(fallbackProjectId))) || projects[0] || null;
    if (!defaultProject) {
      try {
        defaultProject = await Project.create({
          name: 'Om Sai Ashraya',
          code: 'DDV',
          projectCode: 'DDV',
          location: 'Bhubaneswar',
          status: 'active',
          isActive: true
        });
        projects = [defaultProject];
        console.log('[confirmImport] Created default project:', defaultProject.name);
      } catch (prjErr) {
        defaultProject = await Project.findOne();
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (let i = 0; i < leads.length; i++) {
      const item = leads[i];
      const rawName = item.rawName || item.name || item.customerName;
      const rawMobile = item.rawMobile || item.mobile || item.primaryMobile;
      const rawProject = item.projectId || item.project || item.projectName;
      const source = item.source || 'BULK_IMPORT';
      const intent = item.intent || null;
      const email = item.email || '';
      const city = item.city || '';

      // Robustly resolve project ObjectId
      let targetProjectId = null;
      if (rawProject && projects.length > 0) {
        const found = projects.find(
          (p) =>
            p &&
            ((p._id ? p._id.toString() : '') === String(rawProject) ||
              (p.name ? p.name.toLowerCase() : '') === String(rawProject).toLowerCase() ||
              (p.code ? p.code.toLowerCase() : '') === String(rawProject).toLowerCase() ||
              (p.projectCode ? p.projectCode.toLowerCase() : '') === String(rawProject).toLowerCase())
        );
        if (found) {
          targetProjectId = found._id;
        }
      }

      if (!targetProjectId && defaultProject) {
        targetProjectId = defaultProject._id;
      }

      if (!rawName || !rawMobile || !targetProjectId) {
        skippedCount++;
        results.push({
          index: i,
          success: false,
          reason: !rawName ? 'Missing name' : !rawMobile ? 'Missing mobile' : 'No matching active project ID'
        });
        continue;
      }

      try {
        const leadResult = await processIncomingLead(
          {
            rawName,
            rawMobile,
            project: targetProjectId,
            source,
            intent,
            email,
            city,
            owner: targetUserId || item.owner || null,
            importBatchId: assignedBatchId,
            allowDuplicate: item.allowDuplicate || false,
            reason: item.reason || 'Bulk import confirmation'
          },
          req.user
        );

        if (leadResult.isDuplicate || !leadResult.opportunity) {
          if (leadResult.existingOpportunity) {
            // Update existing opportunity with the import batch ID so it joins this batch and persists
            await Opportunity.findByIdAndUpdate(leadResult.existingOpportunity._id, {
              importBatchId: assignedBatchId,
              ...(targetUserId ? { owner: targetUserId } : {})
            });
            importedCount++;
            results.push({
              index: i,
              success: true,
              opportunityId: leadResult.existingOpportunity._id,
              owner: leadResult.existingOpportunity?.owner?.name || 'assigned rep',
              isUpdatedExisting: true
            });
          } else {
            skippedCount++;
            results.push({
              index: i,
              success: false,
              mobile: rawMobile,
              reason: 'Duplicate active opportunity conflict'
            });
          }
        } else {
          importedCount++;
          results.push({
            index: i,
            success: true,
            opportunityId: leadResult.opportunity._id,
            owner: leadResult.opportunity?.owner?.name || 'assigned agent'
          });
        }
      } catch (err) {
        console.error(`Error importing row ${i + 1} (${rawName}):`, err);
        skippedCount++;
        results.push({
          index: i,
          success: false,
          reason: err.message || 'Import failed'
        });
      }
    }

    console.log(`[confirmImport] Batch "${assignedBatchId}" finished: imported=${importedCount}, skipped=${skippedCount}`);

    // Persist ImportBatch document
    const isPrivateBatch = req.body?.isPrivate === true || req.body?.isPrivate === 'true' || !!targetUserId;
    const importBatchDoc = await ImportBatch.findOneAndUpdate(
      { batchId: assignedBatchId },
      {
        batchId: assignedBatchId,
        batchName: assignedBatchId,
        project: defaultProject?._id || null,
        uploadedBy: req.user?._id || null,
        totalRows: leads.length,
        importedCount,
        skippedCount,
        isPrivate: isPrivateBatch
      },
      { upsert: true, new: true }
    );

    // If batch is assigned to an employee or private, create BatchAccess document
    let createdBatchAccess = null;
    if (isPrivateBatch && targetUserId) {
      const assignedUserIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];
      createdBatchAccess = await BatchAccess.findOneAndUpdate(
        { batchId: assignedBatchId },
        {
          batch: importBatchDoc._id,
          batchId: assignedBatchId,
          assignedTo: assignedUserIds,
          accessLevel: req.body?.accessLevel || 'view',
          grantedBy: req.user?._id || null,
          grantedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      success: true,
      importBatchId: assignedBatchId,
      summary: {
        totalSubmitted: leads.length,
        imported: importedCount,
        skipped: skippedCount
      },
      imported: importedCount,
      skipped: skippedCount,
      results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-save bulk lead import directly to MongoDB (Single-step import without manual preview confirmation)
 * @route POST /api/leads/import or POST /api/import
 * @access Private (super_admin, admin, director, telecaller, team_lead)
 */
const autoSaveImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file' });
    }

    const { batchName, targetUserId, projectId: fallbackProjectId, isPrivate, accessLevel } = req.body;

    // 1. Read Excel / CSV buffer with fallback
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    } catch (parseErr) {
      try {
        const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
        workbook = XLSX.read(text, { type: 'string', cellDates: true });
      } catch (fallbackErr) {
        return res.status(400).json({ message: 'Could not parse uploaded file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV (.csv) file.' });
      }
    }

    // Find the first sheet that contains data rows
    let sheet = null;
    let sheetName = null;
    let rawRows = [];

    const sheetNames = workbook?.SheetNames || [];
    for (const name of sheetNames) {
      const candidateSheet = workbook.Sheets[name];
      const candidateRows = XLSX.utils.sheet_to_json(candidateSheet, { defval: '', raw: false, blankrows: false });
      if (candidateRows && candidateRows.length > 0) {
        sheet = candidateSheet;
        sheetName = name;
        rawRows = candidateRows;
        break;
      }
    }

    if (!sheet || !rawRows || rawRows.length === 0) {
      return res.status(400).json({ message: 'Uploaded spreadsheet is empty or contains no valid data rows' });
    }

    // 2. Fetch projects for matching and fallback
    let projects = await Project.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] });
    if (!projects || projects.length === 0) {
      projects = await Project.find({});
    }

    let defaultProject = (fallbackProjectId && projects.find(p => p._id.toString() === String(fallbackProjectId))) || projects[0] || null;
    if (!defaultProject) {
      try {
        defaultProject = await Project.create({
          name: 'Om Sai Ashraya',
          code: 'DDV',
          projectCode: 'DDV',
          location: 'Bhubaneswar',
          status: 'active',
          isActive: true
        });
        projects = [defaultProject];
      } catch (prjErr) {
        defaultProject = await Project.findOne();
      }
    }

    const defaultCode = (defaultProject?.projectCode || defaultProject?.code || 'DDV').toUpperCase();
    const assignedBatchId = (batchName && String(batchName).trim()) || `NEW_${defaultCode}_${Date.now()}`;

    console.log(`[autoSaveImport] Auto-saving bulk import of ${rawRows.length} rows directly to MongoDB under batch "${assignedBatchId}"...`);

    let importedCount = 0;
    let skippedCount = 0;
    const importedLeads = [];
    const skippedDetails = [];

    for (let i = 0; i < rawRows.length; i++) {
      const origRow = rawRows[i];
      const rowNum = i + 2;

      try {
        // Clean row object keys
        const row = {};
        for (const [key, val] of Object.entries(origRow)) {
          const cleanKey = String(key)
            .replace(/^\uFEFF/, '')
            .replace(/^["']|["']$/g, '')
            .trim();
          row[cleanKey] = val;
        }

        let rawName = getRowValue(row, [
          'FULL NAMEE', 'Full Namee', 'full namee', 'full_namee', 'name', 'full_name', 'fullname', 'customer_name', 'client_name', 'Name',
          'Customer Name', 'CustomerName', 'client_name', 'customer', 'lead_name',
          'lead', 'contact_name', 'person_name', 'applicant_name', 'party_name', 'client'
        ]);
        let rawMobile = getRowValue(row, [
          'Phone Number', 'phone number', 'phone_number', 'mobile', 'phone', 'primary_mobile', 'contact', 'Mobile', 'Phone', 'Contact',
          'Mobile Number', 'MobileNumber', 'mobile_number', 'phoneNumber',
          'mobileNo', 'mobile_no', 'Contact Number', 'contact_number', 'cell', 'telephone',
          'number', 'phone1', 'mobile1', 'primary_phone', 'contact_no', 'contactno'
        ]);
        const rawProject = getRowValue(row, [
          'project', 'project_name', 'code', 'Project', 'ProjectCode',
          'Project Name', 'ProjectName', 'project_code', 'projectcode'
        ]);
        const rawSource = getRowValue(row, [
          'Source of Client', 'source of client', 'source_of_client', 'source', 'lead_source', 'channel', 'Source', 'Lead Source', 'leadsource'
        ]) || 'BULK_IMPORT';
        const rawIntent = getRowValue(row, [
          'intent', 'lead_intent', 'Intent', 'Priority', 'priority', 'Lead Intent', 'leadintent'
        ]) || '';
        const rawEmail = getRowValue(row, [
          'email', 'email_address', 'Email', 'Email Address', 'emailaddress'
        ]);
        const rawCity = getRowValue(row, [
          'Address', 'address', 'city', 'location', 'City', 'Location'
        ]);

        let cleanMobile = normalizePhone(rawMobile);

        // Smart phone scan across row
        if (!cleanMobile || cleanMobile.length < 10) {
          for (const [k, val] of Object.entries(row)) {
            if (!val) continue;
            const candidate = normalizePhone(String(val));
            if (candidate && candidate.length === 10) {
              cleanMobile = candidate;
              rawMobile = String(val);
              break;
            }
          }
        }

        // Smart customer name scan
        if (!rawName) {
          for (const [k, val] of Object.entries(row)) {
            if (!val) continue;
            const strVal = String(val).trim();
            const candidatePhone = normalizePhone(strVal);
            if (candidatePhone && candidatePhone.length >= 10) continue;
            if (
              strVal.length >= 2 &&
              !/^\d+$/.test(strVal) &&
              !strVal.includes('http') &&
              !strVal.toLowerCase().includes('sheet') &&
              !strVal.toLowerCase().includes('batch') &&
              !projects.some((p) => p && p.name && p.name.toLowerCase() === strVal.toLowerCase())
            ) {
              rawName = strVal;
              break;
            }
          }
        }

        if (!rawName && cleanMobile && cleanMobile.length === 10) {
          rawName = `Prospect (${cleanMobile})`;
        }

        let cleanIntent = null;
        if (rawIntent) {
          const l = rawIntent.toLowerCase();
          if (['high', 'medium', 'low'].includes(l)) cleanIntent = l;
        }

        if (!rawName || !cleanMobile || cleanMobile.length < 10) {
          skippedCount++;
          skippedDetails.push({
            rowNumber: rowNum,
            customerName: rawName || 'Unknown',
            mobile: rawMobile || 'Missing',
            reason: !rawName ? 'Missing customer full name' : 'Missing or invalid 10-digit mobile number'
          });
          continue;
        }

        // Resolve Project ObjectId
        let targetProject = defaultProject;
        if (rawProject && projects.length > 0) {
          const found = projects.find(
            (p) =>
              p &&
              ((p._id ? p._id.toString() : '') === String(rawProject) ||
                (p.name ? p.name.toLowerCase() : '') === String(rawProject).toLowerCase() ||
                (p.code ? p.code.toLowerCase() : '') === String(rawProject).toLowerCase() ||
                (p.projectCode ? p.projectCode.toLowerCase() : '') === String(rawProject).toLowerCase())
          );
          if (found) targetProject = found;
        }

        if (!targetProject && defaultProject) targetProject = defaultProject;

        // Process directly into MongoDB through duplicate engine & auto-assignment
        const leadResult = await processIncomingLead(
          {
            rawName: rawName.trim(),
            rawMobile: cleanMobile,
            project: targetProject._id,
            source: rawSource,
            intent: cleanIntent,
            email: rawEmail || '',
            city: rawCity || '',
            owner: targetUserId || null,
            importBatchId: assignedBatchId,
            allowDuplicate: false,
            reason: `Auto-save spreadsheet import batch ${assignedBatchId}`
          },
          req.user
        );

        if (leadResult.isDuplicate || !leadResult.opportunity) {
          if (leadResult.existingOpportunity) {
            // Update existing active opportunity to join this batch
            await Opportunity.findByIdAndUpdate(leadResult.existingOpportunity._id, {
              importBatchId: assignedBatchId,
              ...(targetUserId ? { owner: targetUserId } : {})
            });
            importedCount++;
            importedLeads.push({
              _id: leadResult.existingOpportunity._id,
              leadCode: leadResult.existingOpportunity.leadCode || 'EXISTING',
              customerName: rawName.trim(),
              phone: cleanMobile,
              project: targetProject.name,
              currentOwner: leadResult.existingOpportunity.owner?.name || 'Assigned Rep',
              stage: leadResult.existingOpportunity.stage || 'new',
              intent: cleanIntent || 'medium',
              status: 'Linked Existing'
            });
          } else {
            skippedCount++;
            skippedDetails.push({
              rowNumber: rowNum,
              customerName: rawName.trim(),
              mobile: cleanMobile,
              reason: 'Duplicate active opportunity conflict'
            });
          }
        } else {
          importedCount++;
          importedLeads.push({
            _id: leadResult.opportunity._id,
            leadCode: leadResult.opportunity.leadCode,
            customerName: rawName.trim(),
            phone: cleanMobile,
            project: targetProject.name,
            currentOwner: leadResult.opportunity.owner?.name || 'Assigned Agent',
            stage: leadResult.opportunity.stage || 'new',
            intent: cleanIntent || 'medium',
            status: 'Newly Created'
          });
        }
      } catch (rowErr) {
        console.error(`[autoSaveImport] Error on row ${rowNum}:`, rowErr);
        skippedCount++;
        skippedDetails.push({
          rowNumber: rowNum,
          customerName: origRow.name || 'Unknown',
          mobile: origRow.phone || 'Unknown',
          reason: rowErr.message || 'Error saving to MongoDB'
        });
      }
    }

    console.log(`[autoSaveImport] Finished batch "${assignedBatchId}": saved=${importedCount}, skipped=${skippedCount}`);

    // Persist ImportBatch document
    const isPrivateBatch = isPrivate === true || isPrivate === 'true' || !!targetUserId;
    const importBatchDoc = await ImportBatch.findOneAndUpdate(
      { batchId: assignedBatchId },
      {
        batchId: assignedBatchId,
        batchName: assignedBatchId,
        originalFileName: req.file?.originalname || '',
        project: defaultProject?._id || null,
        uploadedBy: req.user?._id || null,
        totalRows: rawRows.length,
        importedCount,
        skippedCount,
        isPrivate: isPrivateBatch
      },
      { upsert: true, new: true }
    );

    // If batch is assigned to an employee or private, create BatchAccess document
    let createdBatchAccess = null;
    if (isPrivateBatch && targetUserId) {
      const assignedUserIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];
      createdBatchAccess = await BatchAccess.findOneAndUpdate(
        { batchId: assignedBatchId },
        {
          batch: importBatchDoc._id,
          batchId: assignedBatchId,
          assignedTo: assignedUserIds,
          accessLevel: accessLevel || 'view',
          grantedBy: req.user?._id || null,
          grantedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Successfully saved ${importedCount} leads directly to MongoDB under Sheet Code "${assignedBatchId}"`,
      importBatchId: assignedBatchId,
      imported: importedCount,
      skipped: skippedCount,
      totalRows: rawRows.length,
      leads: importedLeads,
      skippedDetails
    });
  } catch (error) {
    console.error('Error in autoSaveImport:', error);
    return res.status(500).json({
      message: `Failed to import spreadsheet: ${error.message || 'Server error'}`
    });
  }
};

module.exports = {
  autoSaveImport,
  previewImport,
  confirmImport
};
