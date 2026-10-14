const mongoose = require('mongoose');
const XLSX = require('xlsx');
const crypto = require('crypto');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Lead = require('../models/Lead');
const Project = require('../models/Project');
const Counter = require('../models/Counter');
const User = require('../models/User');
const ImportBatch = require('../models/ImportBatch');
const BatchAccess = require('../models/BatchAccess');
const Notification = require('../models/Notification');
const { processIncomingLead } = require('../services/duplicateEngine');
const normalizePhone = require('../utils/normalizePhone');
const { getYYMMDD } = require('../utils/generateLeadCode');

// In-memory locks for concurrent duplicate prevention per file hash and batch
const activeImportLocks = new Set();

/**
 * Universal Indian phone cleaner & normalizer
 * Strips 'p:', '+91', '91', spaces, dashes, dots, brackets, and handles float strings (e.g. 9938901127.0)
 */
function cleanAndNormalizePhone(rawVal) {
  if (rawVal === undefined || rawVal === null) return null;
  let str = String(rawVal).trim();
  if (!str) return null;

  // Handle numbers stored as floats like 9938901127.0 or scientific notation
  if (typeof rawVal === 'number') {
    str = Math.floor(rawVal).toString();
  } else if (/\.\d+$/.test(str)) {
    str = str.replace(/\.\d+$/, '');
  }

  // Strip prefixes like "p:", "tel:"
  str = str.replace(/^(?:p|tel)\s*:\s*/i, '');

  // Strip whitespace and formatting characters: spaces, dashes, dots, brackets, slashes
  str = str.replace(/[\s\-\.\(\)\\\/]/g, '');

  // Strip leading international prefix +91 or 0091
  if (str.startsWith('+91')) {
    str = str.slice(3);
  } else if (str.startsWith('0091')) {
    str = str.slice(4);
  }

  // Strip non-digits
  str = str.replace(/\D/g, '');

  // If 12 digits and starts with 91
  if (str.length === 12 && str.startsWith('91')) {
    str = str.slice(2);
  }

  // If 11 digits and starts with 0
  if (str.length === 11 && str.startsWith('0')) {
    str = str.slice(1);
  }

  // Validate 10-digit mobile
  if (/^[6-9]\d{9}$/.test(str)) {
    return str;
  }
  if (/^\d{10}$/.test(str)) {
    return str;
  }

  return null;
}

/**
 * Case-insensitive, trimmed header aliases for auto-detecting column mappings
 */
const HEADER_ALIASES = {
  phone: [
    'phone', 'phonenumber', 'phone no', 'phoneno', 'mobile', 'mobileno', 'mobile no',
    'mobile number', 'mob', 'contact', 'contactno', 'contact number', 'primarymobile',
    'primary mobile', 'cell', 'whatsapp', 'client phone', 'customer phone', 'mobile no.',
    'phone number.'
  ],
  name: [
    'name', 'fullname', 'full name', 'full namee', 'clientname', 'client name',
    'customername', 'customer name', 'prospectname', 'prospect name', 'lead name', 'leadname',
    'client', 'customer'
  ],
  project: [
    'project', 'projectname', 'project name', 'property', 'preferred project',
    'site', 'project visited', 'interested project'
  ],
  intent: [
    'intent', 'urgency', 'priority', 'lead intent', 'interest level', 'interest'
  ],
  address: [
    'address', 'city', 'location', 'residence', 'residence city', 'current city'
  ],
  source: [
    'source', 'source of client', 'lead source', 'channel', 'campaign', 'media'
  ],
  remarks: [
    'remarks', 'remark', 'notes', 'note', 'comment', 'conversation remark', 'call remark'
  ],
  callStatus: [
    'call status', 'callstatus', 'status', 'stage', 'sub status'
  ],
  callDate: [
    'call date', 'calldate', 'date', 'created at', 'created date', 'visit date', 'lead date'
  ]
};

function matchHeaderField(headerText) {
  if (!headerText) return null;
  const clean = String(headerText).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return null;

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const aliasClean = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean === aliasClean) return field;
    }
  }

  // Substring matching for phone and name if no exact alias matched
  for (const alias of HEADER_ALIASES.phone) {
    const aliasClean = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.includes(aliasClean) || aliasClean.includes(clean)) return 'phone';
  }
  for (const alias of HEADER_ALIASES.name) {
    const aliasClean = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.includes(aliasClean) || aliasClean.includes(clean)) return 'name';
  }

  return null;
}

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
      { upsert: true, returnDocument: 'after' }
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
        { upsert: true, returnDocument: 'after' }
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
 * Auto-save bulk lead import directly to MongoDB (Universal Zero-Per-Row-Await Pipeline)
 * @route POST /api/leads/import or POST /api/import
 * @access Private (super_admin, admin, director, telecaller, team_lead)
 */
const autoSaveImport = async (req, res, next) => {
  const t0 = Date.now();
  let lockKey = null;

  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file' });
    }

    const { batchName, targetUserId, projectId: fallbackProjectId, isPrivate, accessLevel } = req.body;

    // Concurrency Lock & Idempotency by file hash and batch
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const assignedBatchId = (batchName && String(batchName).trim()) || `NEW_${Date.now()}`;
    lockKey = `${assignedBatchId}_${fileHash}`;

    if (activeImportLocks.has(lockKey)) {
      return res.status(409).json({
        message: 'An import with this file and batch is currently in progress. Please wait a moment.'
      });
    }
    activeImportLocks.add(lockKey);

    // Idempotent check: if this batch already exists and has records, avoid re-inserting
    const existingBatch = await ImportBatch.findOne({ batchId: assignedBatchId })
      .select('batchId totalRows importedCount skippedCount')
      .lean();

    if (existingBatch && existingBatch.importedCount > 0) {
      const existingLeads = await Opportunity.find({ importBatchId: assignedBatchId })
        .select('leadCode phone stage intent project owner')
        .populate('project', 'name')
        .populate('owner', 'name')
        .populate('customer', 'name primaryMobile')
        .limit(200)
        .lean();

      return res.status(200).json({
        success: true,
        message: `Batch "${assignedBatchId}" was already imported and verified.`,
        importBatchId: assignedBatchId,
        totalRows: existingBatch.totalRows || existingBatch.importedCount,
        imported: existingBatch.importedCount,
        skipped: existingBatch.skippedCount || 0,
        duplicates: existingBatch.skippedCount || 0,
        invalid: 0,
        leads: existingLeads.map(l => ({
          _id: l._id,
          leadCode: l.leadCode,
          customerName: l.customer?.name || 'Prospect',
          phone: l.phone || l.customer?.primaryMobile || '—',
          project: l.project?.name || '—',
          currentOwner: l.owner?.name || 'Assigned Rep',
          stage: l.stage || 'new',
          intent: l.intent || 'medium',
          status: 'Already Saved'
        })),
        skippedDetails: [],
        timing: { parseMs: 0, validateMs: 0, duplicateCheckMs: 0, insertMs: 0, totalMs: 0 }
      });
    }

    // 1. Stage 1: Fast XLSX / CSV Buffer Parsing (dense mode)
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true, dense: true });
    } catch (parseErr) {
      try {
        const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
        workbook = XLSX.read(text, { type: 'string', cellDates: true, dense: true });
      } catch (fallbackErr) {
        return res.status(400).json({
          message: 'Could not parse uploaded file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV (.csv) file.'
        });
      }
    }
    const parseMs = Date.now() - t0;

    // 2. Stage 2: Universal Multi-Sheet Parsing & In-Memory Normalization
    const t1 = Date.now();
    let totalRawRows = 0;
    const validRows = [];
    const skippedDetails = [];
    const seenWorkbookPhones = new Map(); // cleanPhone -> { sheet, row }

    const sheetNames = workbook?.SheetNames || [];
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Extract sheet rows as 2D array
      const rawMatrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
        raw: false
      });

      if (!rawMatrix || rawMatrix.length === 0) continue;

      // Auto-detect header row containing a phone-like header (scan first 15 rows)
      let headerRowIdx = -1;
      let colMap = {};

      for (let r = 0; r < Math.min(15, rawMatrix.length); r++) {
        const candidateRow = rawMatrix[r];
        if (!Array.isArray(candidateRow)) continue;

        const tempMap = {};
        let foundPhone = false;

        for (let c = 0; c < candidateRow.length; c++) {
          const cellVal = candidateRow[c];
          const matchedField = matchHeaderField(cellVal);
          if (matchedField && tempMap[matchedField] === undefined) {
            tempMap[matchedField] = c;
            if (matchedField === 'phone') foundPhone = true;
          }
        }

        if (foundPhone) {
          headerRowIdx = r;
          colMap = tempMap;
          break;
        }
      }

      // If no phone column was found in this sheet, skip this sheet
      if (headerRowIdx === -1 || colMap.phone === undefined) continue;

      // Process subsequent data rows in this sheet
      for (let r = headerRowIdx + 1; r < rawMatrix.length; r++) {
        const row = rawMatrix[r];
        if (!Array.isArray(row)) continue;

        // Skip fully empty rows
        const hasAnyCell = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
        if (!hasAnyCell) continue;

        totalRawRows++;

        const phoneCell = row[colMap.phone];
        const nameCell = colMap.name !== undefined ? row[colMap.name] : '';
        const projectCell = colMap.project !== undefined ? row[colMap.project] : '';
        const intentCell = colMap.intent !== undefined ? row[colMap.intent] : '';
        const addressCell = colMap.address !== undefined ? row[colMap.address] : '';
        const sourceCell = colMap.source !== undefined ? row[colMap.source] : '';

        // Clean & Normalize Phone
        const cleanPhone = cleanAndNormalizePhone(phoneCell);

        // Skip sub-header rows (e.g. "Conversation Remark / Status" rows with no phone digits)
        if (!cleanPhone) {
          const phoneStr = String(phoneCell || '').trim();
          const digitCount = (phoneStr.match(/\d/g) || []).length;
          if (digitCount < 7) {
            // Sub-header or description row without a valid phone — skip silently
            continue;
          }

          skippedDetails.push({
            row: r + 1,
            sheet: sheetName,
            name: String(nameCell || 'Unknown').trim(),
            mobile: phoneStr,
            reason: 'Invalid 10-digit mobile number'
          });
          continue;
        }

        // Hard-validation of name: If name is blank but phone is valid, fallback to "Prospect XXXX"
        let cleanName = String(nameCell || '').trim();
        if (!cleanName) {
          cleanName = `Prospect ${cleanPhone.slice(-4)}`;
        }

        // Intra-workbook duplicate check: merge duplicates across sheets by phone
        if (seenWorkbookPhones.has(cleanPhone)) {
          const prior = seenWorkbookPhones.get(cleanPhone);
          skippedDetails.push({
            row: r + 1,
            sheet: sheetName,
            name: cleanName,
            mobile: cleanPhone,
            reason: `Duplicate mobile within file (already found in sheet "${prior.sheet}", row ${prior.row})`
          });
          continue;
        }

        seenWorkbookPhones.set(cleanPhone, { sheet: sheetName, row: r + 1 });

        // Normalize Intent
        let cleanIntent = null;
        if (intentCell) {
          const iLower = String(intentCell).toLowerCase();
          if (iLower.includes('high') || iLower.includes('hot')) cleanIntent = 'high';
          else if (iLower.includes('low') || iLower.includes('cold')) cleanIntent = 'low';
          else if (iLower.includes('med') || iLower.includes('warm')) cleanIntent = 'medium';
        }

        // Normalize Source
        let cleanSource = String(sourceCell || 'DIRECT').trim().toUpperCase();
        if (!cleanSource || cleanSource === 'UNDEFINED' || cleanSource === 'NULL') cleanSource = 'DIRECT';

        validRows.push({
          sheet: sheetName,
          rowNum: r + 1,
          cleanName,
          cleanPhone,
          rawProject: String(projectCell || '').trim(),
          cleanIntent,
          cleanSource,
          city: String(addressCell || '').trim()
        });
      }
    }

    if (validRows.length === 0 && skippedDetails.length === 0) {
      return res.status(400).json({
        message: 'Uploaded spreadsheet is empty or contains no valid data rows with phone numbers'
      });
    }

    // 3. Stage 3: Fetch Projects & Assignment Reps (Lean, Indexed)
    let projects = await Project.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
      .select('_id name code projectCode')
      .lean();
    if (!projects || projects.length === 0) {
      projects = await Project.find({}).select('_id name code projectCode').lean();
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
        defaultProject = await Project.findOne().select('_id name code projectCode').lean();
      }
    }

    // Resolve Target User or Candidate Telecallers upfront
    let targetUser = null;
    let targetUserName = 'Assigned Rep';
    if (targetUserId) {
      targetUser = await User.findById(targetUserId).select('_id name email role').lean();
      if (targetUser) targetUserName = targetUser.name;
    }

    let activeReps = [];
    let repIndex = 0;
    if (!targetUserId) {
      activeReps = await User.find({
        isActive: true,
        role: { $in: ['telecaller', 'team_lead'] }
      }).select('_id name email role').lean();
    }

    // Map each row to its resolved Project
    for (const row of validRows) {
      let targetProject = defaultProject;
      if (row.rawProject && projects.length > 0) {
        const rawLower = row.rawProject.toLowerCase();
        const found = projects.find(p =>
          p.name.toLowerCase() === rawLower ||
          (p.projectCode && p.projectCode.toLowerCase() === rawLower) ||
          (p.code && p.code.toLowerCase() === rawLower)
        );
        if (found) targetProject = found;
      }
      row.targetProject = targetProject;
    }

    const validateMs = Date.now() - t1;

    // 4. Stage 4: Single Database Duplicate Check (NO per-row database calls)
    const t2 = Date.now();
    const allPhones = validRows.map(r => r.cleanPhone);

    // 1 Lean Query: Find existing customers with these phones
    const existingCustomers = await Customer.find({ primaryMobile: { $in: allPhones } })
      .select('_id primaryMobile name')
      .lean();

    const custMapByPhone = new Map();
    const existingCustIds = [];
    for (const c of existingCustomers) {
      custMapByPhone.set(c.primaryMobile, c);
      existingCustIds.push(c._id);
    }

    // 1 Lean Query: Find existing active opportunities for these phones or customers
    const existingActiveOpps = await Opportunity.find({
      isActive: true,
      $or: [
        { customer: { $in: existingCustIds } },
        { phone: { $in: allPhones } }
      ]
    }).select('_id customer project phone owner leadCode stage intent').populate('owner', 'name email role').lean();

    // Map active opportunities by key: `${phone}_${projectId}`
    const activeOppLookup = new Map();
    for (const opp of existingActiveOpps) {
      const projIdStr = opp.project.toString();
      if (opp.phone) {
        activeOppLookup.set(`${opp.phone}_${projIdStr}`, opp);
      }
      if (opp.customer) {
        const cust = existingCustomers.find(c => c._id.toString() === opp.customer.toString());
        if (cust && cust.primaryMobile) {
          activeOppLookup.set(`${cust.primaryMobile}_${projIdStr}`, opp);
        }
      }
    }

    // Separate rows into new leads vs duplicates
    const rowsToInsert = [];
    let duplicateCount = 0;

    for (const row of validRows) {
      const projIdStr = row.targetProject._id.toString();
      const oppKey = `${row.cleanPhone}_${projIdStr}`;

      if (activeOppLookup.has(oppKey)) {
        duplicateCount++;
        const dupOpp = activeOppLookup.get(oppKey);
        skippedDetails.push({
          row: row.rowNum,
          sheet: row.sheet,
          name: row.cleanName,
          mobile: row.cleanPhone,
          reason: `Lead already active in project "${row.targetProject.name}" (Code: ${dupOpp.leadCode || 'EXISTING'})`
        });
      } else {
        rowsToInsert.push(row);
      }
    }

    const duplicateCheckMs = Date.now() - t2;

    // 5. Stage 5: Database Bulk Writes (Zero await inside row loop)
    const t3 = Date.now();

    // 5A. Bulk Create Missing Customer Documents
    const newCustomersToInsert = [];
    for (const row of rowsToInsert) {
      if (!custMapByPhone.has(row.cleanPhone)) {
        const newCustId = new mongoose.Types.ObjectId();
        const newCustDoc = {
          _id: newCustId,
          name: row.cleanName,
          primaryMobile: row.cleanPhone,
          city: row.city || ''
        };
        newCustomersToInsert.push(newCustDoc);
        custMapByPhone.set(row.cleanPhone, newCustDoc);
      }
    }

    if (newCustomersToInsert.length > 0) {
      for (let c = 0; c < newCustomersToInsert.length; c += 500) {
        await Customer.insertMany(newCustomersToInsert.slice(c, c + 500), { ordered: false });
      }
    }

    // 5B. Pre-Allocate Sequential Lead Codes Atomically per Project
    const neededCodesCountByProject = new Map();
    for (const row of rowsToInsert) {
      const projIdStr = row.targetProject._id.toString();
      neededCodesCountByProject.set(projIdStr, (neededCodesCountByProject.get(projIdStr) || 0) + 1);
    }

    const availableCodesByProject = new Map();
    const yymmdd = getYYMMDD(new Date());

    for (const [projIdStr, countNeeded] of neededCodesCountByProject.entries()) {
      const prj = projects.find(p => p._id.toString() === projIdStr) || defaultProject;
      const projectCode = (prj.projectCode || prj.code || 'OMV').toUpperCase().trim();
      const counterKey = `${projectCode}_${yymmdd}`;

      const counter = await Counter.findOneAndUpdate(
        { name: counterKey },
        { $inc: { value: countNeeded } },
        { upsert: true, returnDocument: 'after', lean: true }
      );

      const startSeq = counter.value - countNeeded + 1;
      const codes = [];
      for (let s = 0; s < countNeeded; s++) {
        const seqStr = String(startSeq + s).padStart(3, '0');
        codes.push(`OMV-${projectCode}-${yymmdd}-${seqStr}`);
      }
      availableCodesByProject.set(projIdStr, codes);
    }

    // 5C. Construct Bulk Documents for Opportunities & Leads
    const oppsToInsert = [];
    const leadsToInsert = [];
    const importedLeads = [];
    const assignedCountsByRep = new Map(); // repId -> { repName, count }

    for (const row of rowsToInsert) {
      const cust = custMapByPhone.get(row.cleanPhone);
      const projIdStr = row.targetProject._id.toString();

      // Determine Assigned Owner
      let rowOwnerId = targetUserId || null;
      let rowOwnerName = targetUserName;
      if (!rowOwnerId && activeReps.length > 0) {
        const rep = activeReps[repIndex % activeReps.length];
        repIndex++;
        rowOwnerId = rep._id;
        rowOwnerName = rep.name;
      }

      if (rowOwnerId) {
        const repKey = rowOwnerId.toString();
        const prev = assignedCountsByRep.get(repKey) || { repName: rowOwnerName, count: 0 };
        prev.count++;
        assignedCountsByRep.set(repKey, prev);
      }

      const oppId = new mongoose.Types.ObjectId();
      const leadCode = availableCodesByProject.get(projIdStr)?.shift() ||
        `OMV-${(row.targetProject.projectCode || 'OMV').toUpperCase()}-${yymmdd}-${Date.now().toString().slice(-4)}`;

      oppsToInsert.push({
        _id: oppId,
        leadCode,
        customer: cust._id,
        project: row.targetProject._id,
        phone: row.cleanPhone,
        batchCode: assignedBatchId,
        importBatchId: assignedBatchId,
        owner: rowOwnerId,
        createdBy: req.user ? req.user._id : null,
        source: row.cleanSource,
        campaign: '',
        intent: row.cleanIntent,
        stage: 'new',
        isActive: true
      });

      leadsToInsert.push({
        rawName: row.cleanName,
        rawMobile: row.cleanPhone,
        project: row.targetProject._id,
        source: row.cleanSource,
        campaign: '',
        importBatchId: assignedBatchId,
        intent: row.cleanIntent,
        duplicateStatus: 'no_match',
        matchedCustomer: cust._id,
        resultingOpportunity: oppId
      });

      importedLeads.push({
        _id: oppId,
        leadCode,
        customerName: row.cleanName,
        phone: row.cleanPhone,
        project: row.targetProject.name,
        currentOwner: rowOwnerName,
        stage: 'new',
        intent: row.cleanIntent || 'medium',
        status: 'Newly Created'
      });
    }

    // 5D. Execute Bulk Inserts in chunks of 500
    if (oppsToInsert.length > 0) {
      for (let c = 0; c < oppsToInsert.length; c += 500) {
        await Opportunity.insertMany(oppsToInsert.slice(c, c + 500), { ordered: false });
      }
    }
    if (leadsToInsert.length > 0) {
      for (let c = 0; c < leadsToInsert.length; c += 500) {
        await Lead.insertMany(leadsToInsert.slice(c, c + 500), { ordered: false });
      }
    }

    // 5E. Single Summary Notification Per Assigned Employee
    const notificationsToInsert = [];
    for (const [repIdStr, repData] of assignedCountsByRep.entries()) {
      if (repData.count > 0) {
        notificationsToInsert.push({
          user: new mongoose.Types.ObjectId(repIdStr),
          message: `${repData.count} new leads assigned to you from batch "${assignedBatchId}".`,
          link: '/leads',
          type: 'assignment',
          priority: 'normal'
        });
      }
    }
    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert, { ordered: false });
    }

    // 5F. Persist ImportBatch & BatchAccess Documents
    const importedCount = oppsToInsert.length;
    const skippedCount = totalRawRows - importedCount;
    const isPrivateBatch = isPrivate === true || isPrivate === 'true' || !!targetUserId;

    const importBatchDoc = await ImportBatch.findOneAndUpdate(
      { batchId: assignedBatchId },
      {
        batchId: assignedBatchId,
        batchName: assignedBatchId,
        originalFileName: req.file.originalname || '',
        project: defaultProject?._id || null,
        uploadedBy: req.user?._id || null,
        totalRows: totalRawRows,
        importedCount,
        skippedCount,
        isPrivate: isPrivateBatch
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (isPrivateBatch && targetUserId) {
      const assignedUserIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];
      await BatchAccess.findOneAndUpdate(
        { batchId: assignedBatchId },
        {
          batch: importBatchDoc._id,
          batchId: assignedBatchId,
          assignedTo: assignedUserIds,
          accessLevel: accessLevel || 'view',
          grantedBy: req.user?._id || null,
          grantedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    const insertMs = Date.now() - t3;
    const totalMs = Date.now() - t0;

    // Stage Timing Server Logs
    console.log(
      `[Bulk Import Timing] Batch "${assignedBatchId}": parse=${parseMs}ms, validate=${validateMs}ms, dedupe=${duplicateCheckMs}ms, insert=${insertMs}ms, total=${totalMs}ms | Rows=${totalRawRows}, Imported=${importedCount}, Duplicates=${duplicateCount}, Invalid=${skippedDetails.length - duplicateCount}`
    );

    return res.status(200).json({
      success: true,
      message: `Successfully saved ${importedCount} leads directly to MongoDB in ${(totalMs / 1000).toFixed(2)}s under Sheet Code "${assignedBatchId}"`,
      importBatchId: assignedBatchId,
      totalRows: totalRawRows,
      imported: importedCount,
      skipped: skippedCount,
      duplicates: duplicateCount,
      invalid: skippedDetails.length - duplicateCount,
      leads: importedLeads,
      skippedDetails,
      timing: {
        parseMs,
        validateMs,
        duplicateCheckMs,
        insertMs,
        totalMs
      }
    });
  } catch (error) {
    console.error('Error in autoSaveImport:', error);
    return res.status(500).json({
      message: `Failed to import spreadsheet: ${error.message || 'Server error'}`
    });
  } finally {
    if (lockKey) {
      activeImportLocks.delete(lockKey);
    }
  }
};

module.exports = {
  autoSaveImport,
  previewImport,
  confirmImport
};
