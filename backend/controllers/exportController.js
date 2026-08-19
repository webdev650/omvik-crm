const XLSX = require('xlsx');
const Opportunity = require('../models/Opportunity');
const AuditLog = require('../models/AuditLog');

/**
 * Export leads & opportunities to Excel (.xlsx) spreadsheet with scope filtering & audit trail
 * @route GET /api/leads/export
 * @access Private (super_admin, admin, director, team_lead)
 */
const exportLeads = async (req, res, next) => {
  try {
    const { stage, project, slaBreached, isActive } = req.query;

    // 1. Build filter combining data scope filter with query parameters
    const filter = { ...(req.dataScopeFilter || {}) };

    if (stage) filter.stage = stage;
    if (project) filter.project = project;
    if (slaBreached !== undefined) filter.slaBreached = slaBreached === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // 2. Fetch opportunities with populated relationships
    const opportunities = await Opportunity.find(filter)
      .sort({ createdAt: -1 })
      .populate('customer', 'name primaryMobile email city')
      .populate('project', 'name code location')
      .populate('owner', 'name email role');

    // 3. Transform into flat tabular format for Excel
    const rows = opportunities.map((opp, idx) => {
      const customer = opp.customer || {};
      const proj = opp.project || {};
      const owner = opp.owner || {};

      return {
        '#': idx + 1,
        'Customer Name': customer.name || 'Unspecified',
        'Mobile Number': customer.primaryMobile || '',
        'Email Address': customer.email || '',
        'City': customer.city || '',
        'Project Name': proj.name || 'Unassigned',
        'Project Code': proj.code || '',
        'Pipeline Stage': (opp.stage || 'new').toUpperCase(),
        'Opportunity Status': opp.isActive ? 'Active' : 'Closed',
        'Assigned Owner': owner.name ? `${owner.name} (${owner.role || 'Rep'})` : 'Unassigned',
        'Owner Email': owner.email || '',
        'Lead Source': opp.source || 'direct',
        'Campaign': opp.campaign || '',
        'SLA Breached': opp.slaBreached ? 'YES (Breached)' : 'NO (Compliant)',
        'Last Contacted': opp.lastContactedAt ? new Date(opp.lastContactedAt).toLocaleString() : 'Never',
        'Created Date': new Date(opp.createdAt).toLocaleString()
      };
    });

    // 4. Generate Excel Workbook using XLSX
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set custom column widths for optimum readability
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 22 }, // Customer Name
      { wch: 16 }, // Mobile Number
      { wch: 25 }, // Email Address
      { wch: 15 }, // City
      { wch: 25 }, // Project Name
      { wch: 12 }, // Project Code
      { wch: 16 }, // Pipeline Stage
      { wch: 18 }, // Opportunity Status
      { wch: 24 }, // Assigned Owner
      { wch: 25 }, // Owner Email
      { wch: 16 }, // Lead Source
      { wch: 16 }, // Campaign
      { wch: 16 }, // SLA Breached
      { wch: 22 }, // Last Contacted
      { wch: 22 }  // Created Date
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OMVIK Leads Export');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 5. Section BR Compliance: Log mandatory audit trail entry
    await AuditLog.create({
      user: req.user._id,
      action: 'export',
      entity: 'Opportunity',
      reason: `Leads export triggered by ${req.user.name || 'User'} (${req.user.role})`,
      metadata: {
        count: opportunities.length,
        filters: req.query
      }
    });

    // 6. Send file buffer with spreadsheet disposition headers
    const filename = `OMVIK_Leads_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportLeads
};
