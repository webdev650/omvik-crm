const XLSX = require('xlsx');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Project = require('../models/Project');
const { processIncomingLead } = require('../services/duplicateEngine');
const normalizePhone = require('../utils/normalizePhone');

// Helper to extract value from row across flexible header names
function getRowValue(row, possibleKeys) {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  // Also check case-insensitive match on row keys
  const rowKeys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const matchedKey = rowKeys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pKey.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return String(row[matchedKey]).trim();
    }
  }
  return '';
}

/**
 * Preview bulk lead import (Excel / CSV parsing and check-only duplicate analysis)
 * @route POST /api/leads/import/preview
 * @access Private (super_admin, admin, director)
 */
const previewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel (.xlsx) or CSV (.csv) file' });
    }

    // 1. Read Excel / CSV buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
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
      const row = rawRows[i];
      const rowNum = i + 2; // Header is row 1

      const rawName = getRowValue(row, ['name', 'full_name', 'fullname', 'customer_name', 'client_name', 'Name']);
      const rawMobile = getRowValue(row, ['mobile', 'phone', 'primary_mobile', 'contact', 'Mobile', 'Phone', 'Contact']);
      const rawProject = getRowValue(row, ['project', 'project_name', 'code', 'Project', 'ProjectCode']);
      const rawSource = getRowValue(row, ['source', 'lead_source', 'channel', 'Source']) || 'BULK_IMPORT';
      const rawIntent = getRowValue(row, ['intent', 'lead_intent', 'Intent', 'Priority', 'priority']) || '';

      let cleanIntent = null;
      if (rawIntent) {
        const l = rawIntent.toLowerCase();
        if (['high', 'medium', 'low'].includes(l)) cleanIntent = l;
      }

      const cleanMobile = normalizePhone(rawMobile);

      // Validation check
      if (!rawName || !cleanMobile) {
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
 * @access Private (super_admin, admin, director)
 */
const confirmImport = async (req, res, next) => {
  try {
    const { leads, batchName } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: 'No valid leads array provided for confirmation' });
    }

    const assignedBatchId = (batchName && String(batchName).trim()) || `Sheet-${Date.now()}`;

    let importedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (let i = 0; i < leads.length; i++) {
      const item = leads[i];
      const rawName = item.rawName || item.name;
      const rawMobile = item.rawMobile || item.mobile;
      const project = item.projectId || item.project;
      const source = item.source || 'BULK_IMPORT';
      const intent = item.intent || null;

      if (!rawName || !rawMobile || !project) {
        skippedCount++;
        results.push({
          index: i,
          success: false,
          reason: 'Missing name, mobile, or project ID'
        });
        continue;
      }

      try {
        const leadResult = await processIncomingLead(
          {
            rawName,
            rawMobile,
            project,
            source,
            intent,
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
