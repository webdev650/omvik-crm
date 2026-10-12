const { processIncomingLead, overrideDuplicate } = require('../services/duplicateEngine');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Project = require('../models/Project');
const sendAdminAlert = require('../utils/sendAdminAlert');

// @desc    Submit a new lead
// @route   POST /api/leads
// @access  Private
const submitLead = async (req, res, next) => {
  try {
    const { rawName, rawMobile, project, source, campaign, email, city, allowDuplicate, assignedTo } = req.body;

    if (!rawMobile || !project) {
      return res.status(400).json({
        message: 'rawMobile and project fields are required'
      });
    }

    const result = await processIncomingLead(
      { rawName, rawMobile, project, source, campaign, email, city, allowDuplicate, owner: assignedTo || null },
      req.user
    );

    if (result.isDuplicate) {
      const customerName = result.customerName || result.customer?.name || 'Prospect';
      const projectName = result.projectName || result.existingOpportunity?.project?.name || 'Selected Project';
      const existingOwner = result.existingOwner || result.existingOpportunity?.owner?.name || 'another team member';
      const existingStage = result.existingStage || result.existingOpportunity?.stage || 'new';

      return res.status(409).json({
        success: false,
        message: `This lead is already assigned — ${customerName} for ${projectName} is currently owned by ${existingOwner} (Stage: ${existingStage}).`,
        duplicateStatus: 'blocked',
        customerName,
        projectName,
        existingOwner,
        existingStage,
        existingOpportunity: result.existingOpportunity,
        customer: result.customer
      });
    }

    res.status(201).json({
      success: true,
      message: 'Lead processed and opportunity created successfully.',
      opportunity: result.opportunity,
      customer: result.customer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Duplicate Override
// @route   POST /api/leads/override
// @access  Private (super_admin only)
const overrideDuplicateLead = async (req, res, next) => {
  try {
    const { customerId, projectId, newOwnerId, reason } = req.body;

    if (!customerId || !projectId) {
      return res.status(400).json({
        message: 'customerId and projectId are required for override'
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        message: 'Reason is required for super admin duplicate override'
      });
    }

    const result = await overrideDuplicate(
      customerId,
      projectId,
      newOwnerId || null,
      reason.trim(),
      req.user
    );

    sendAdminAlert({
      subject: `Duplicate Lead Override by ${req.user.name}`,
      message: `${req.user.name} (super_admin) overrode a duplicate lead for customer ID ${customerId} on project ID ${projectId}. Reason: ${reason.trim()}`
    });

    res.status(201).json({
      success: true,
      message: 'Duplicate lead overridden successfully.',
      opportunity: result.opportunity,
      previousOpportunity: result.previousOpportunity,
      auditLog: result.auditLog
    });
  } catch (error) {
    console.error('[Override Error Stack]:', error);
    if (error.message && error.message.includes('No active opportunity found')) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

// @desc    Get leads created on a specific date (or date range)
// @route   GET /api/leads/by-date?date=YYYY-MM-DD
// @access  Private (Scoped)
const getLeadsByDate = async (req, res, next) => {
  try {
    const { date, startDate, endDate } = req.query;
    const targetDate = date || startDate;

    if (!targetDate) {
      return res.status(400).json({ message: 'A date parameter (YYYY-MM-DD) is required.' });
    }

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const parts = targetDate.split('-').map(Number);
      if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
        return res.status(400).json({ message: 'Invalid date format. Expected YYYY-MM-DD.' });
      }
      const [year, month, day] = parts;
      // Broad window covering UTC and IST (+05:30) bounds
      start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - (6 * 3600 * 1000));
      end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) + (6 * 3600 * 1000));
    }

    const query = {
      createdAt: { $gte: start, $lte: end },
      ...(req.dataScope || {})
    };

    const opportunities = await Opportunity.find(query)
      .populate('customer', 'name primaryMobile alternateMobile email city')
      .populate('project', 'name code projectCode')
      .populate('owner', 'name email role employeeId')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    const formatted = opportunities.map((opp) => {
      const cust = opp.customer || {};
      const proj = opp.project || {};
      const owner = opp.owner || {};

      return {
        _id: opp._id,
        leadCode: opp.leadCode || 'OMV-LEAD',
        customerName: cust.name || 'Prospect',
        phone: cust.primaryMobile || cust.alternateMobile || '—',
        email: cust.email || '',
        city: cust.city || '',
        project: proj.name || 'General Project',
        projectCode: proj.projectCode || proj.code || '',
        intent: opp.intent || 'medium',
        source: opp.source || 'DIRECT',
        createdAt: opp.createdAt,
        assignedTo: owner.name || 'Unassigned',
        assignedToUser: opp.owner || null,
        createdBy: opp.createdBy?.name || '',
        currentStage: opp.stage || 'new',
        stage: opp.stage || 'new',
        importBatchId: opp.importBatchId || null
      };
    });

    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

// @desc    Get counts of leads created per day for a month
// @route   GET /api/leads/date-summary?month=YYYY-MM&year=YYYY
// @access  Private (Scoped)
const getLeadsDateSummary = async (req, res, next) => {
  try {
    let { month, year } = req.query;
    const now = new Date();

    let targetYear = year ? parseInt(year, 10) : now.getFullYear();
    let targetMonth; // 1-12

    if (month && String(month).includes('-')) {
      const parts = String(month).split('-');
      targetYear = parseInt(parts[0], 10);
      targetMonth = parseInt(parts[1], 10);
    } else if (month) {
      targetMonth = parseInt(month, 10);
    } else {
      targetMonth = now.getMonth() + 1;
    }

    if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ message: 'Invalid month or year.' });
    }

    // Extended month boundaries to account for IST timezone (+/- 12 hours)
    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0) - (12 * 3600 * 1000));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999) + (12 * 3600 * 1000));

    const matchQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
      ...(req.dataScope || {})
    };

    const aggregated = await Opportunity.aggregate([
      { $match: matchQuery },
      {
        $project: {
          dateStr: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: '+05:30'
            }
          }
        }
      },
      {
        $group: {
          _id: '$dateStr',
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {};
    for (const item of aggregated) {
      if (item._id) {
        summary[item._id] = item.count;
      }
    }

    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitLead,
  overrideDuplicateLead,
  getLeadsByDate,
  getLeadsDateSummary
};
