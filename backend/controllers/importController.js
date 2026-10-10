const XLSX = require('xlsx');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Project = require('../models/Project');
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

    const sheetName = workbook?.SheetNames?.[0];
    if (!sheetName) {
      return res.status(400).json({ message: 'Uploaded file contains no valid sheets' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ message: 'Uploaded spreadsheet is empty' });
    }

    // 2. Fetch active projects for matching
    const projects = await Project.find({ isActive: true });
    const defaultProject = projects[0] || null;

    const valid = [];
    const duplicates = [];
    const invalid = [];

    // 3. Process each row
    for (let i = 0; i < rawRows.length; i++) {
      const origRow = rawRows[i];
      const rowNum = i + 2; // Header is row 1

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
        'name', 'full_name', 'fullname', 'customer_name', 'client_name', 'Name',
        'Customer Name', 'CustomerName', 'client_name', 'customer', 'lead_name',
        'lead', 'contact_name', 'person_name', 'applicant_name', 'party_name', 'client'
      ]);
      let rawMobile = getRowValue(row, [
        'mobile', 'phone', 'primary_mobile', 'contact', 'Mobile', 'Phone', 'Contact',
        'Mobile Number', 'MobileNumber', 'mobile_number', 'phone_number', 'phoneNumber',
        'mobileNo', 'mobile_no', 'Contact Number', 'contact_number', 'cell', 'telephone',
        'number', 'phone1', 'mobile1', 'primary_phone', 'contact_no', 'contactno'
      ]);
      const rawProject = getRowValue(row, [
        'project', 'project_name', 'code', 'Project', 'ProjectCode',
        'Project Name', 'ProjectName', 'project_code', 'projectcode'
      ]);
      const rawSource = getRowValue(row, [
        'source', 'lead_source', 'channel', 'Source', 'Lead Source', 'leadsource'
      ]) || 'BULK_IMPORT';
      const rawIntent = getRowValue(row, [
        'intent', 'lead_intent', 'Intent', 'Priority', 'priority', 'Lead Intent', 'leadintent'
      ]) || '';
      const rawEmail = getRowValue(row, [
        'email', 'email_address', 'Email', 'Email Address', 'emailaddress'
      ]);
      const rawCity = getRowValue(row, [
        'city', 'location', 'City', 'Location', 'address', 'Address'
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
            !projects.some((p) => p.name.toLowerCase() === strVal.toLowerCase())
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
            p._id.toString() === rawProject ||
            p.name.toLowerCase() === rawProject.toLowerCase() ||
            p.code.toLowerCase() === rawProject.toLowerCase()
        );
        if (found) {
          targetProject = found;
        }
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
    next(error);
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

    // Load active projects for robust project ID resolution
    const projects = await Project.find({ isActive: true });
    const defaultProject = (fallbackProjectId && projects.find(p => p._id.toString() === String(fallbackProjectId))) || projects[0] || null;

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
      if (rawProject) {
        const found = projects.find(
          (p) =>
            p._id.toString() === String(rawProject) ||
            p.name.toLowerCase() === String(rawProject).toLowerCase() ||
            p.code.toLowerCase() === String(rawProject).toLowerCase()
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

        if (leadResult.isDuplicateBlocked) {
          skippedCount++;
          results.push({
            index: i,
            success: false,
            mobile: rawMobile,
            reason: 'Duplicate active opportunity conflict',
            owner: leadResult.existingOpportunity?.owner?.name || 'another team member'
          });
        } else {
          importedCount++;
          results.push({
            index: i,
            success: true,
            opportunityId: leadResult.opportunity?._id,
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

module.exports = {
  previewImport,
  confirmImport
};
