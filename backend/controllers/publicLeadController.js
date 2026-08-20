const Project = require('../models/Project');
const { processIncomingLead } = require('../services/duplicateEngine');

// @desc    Public lead capture webhook for website integration (protected by API Key & strict rate limiter)
// @route   POST /api/public/leads
// @access  Public (API Key Required)
const submitPublicLead = async (req, res, next) => {
  try {
    const {
      rawName,
      rawMobile,
      projectId,
      projectName,
      projectCode,
      source,
      campaign,
      email,
      city,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term
    } = req.body;

    if (!rawName || !rawMobile) {
      return res.status(400).json({ message: 'rawName and rawMobile are required fields' });
    }

    // Resolve project ID if string name or code was provided
    let targetProjectId = projectId;
    if (!targetProjectId && (projectName || projectCode)) {
      const proj = await Project.findOne({
        $or: [
          { name: new RegExp(`^${(projectName || '').trim()}$`, 'i') },
          { code: (projectCode || '').trim().toUpperCase() }
        ]
      });
      if (proj) {
        targetProjectId = proj._id;
      }
    }

    // Fallback to first active project if none specified or resolved
    if (!targetProjectId) {
      const defaultProj = await Project.findOne({ isActive: true });
      if (defaultProj) {
        targetProjectId = defaultProj._id;
      } else {
        return res.status(400).json({ message: 'No valid active project found in system' });
      }
    }

    const leadInput = {
      rawName: rawName.trim(),
      rawMobile: rawMobile.trim(),
      project: targetProjectId,
      source: source || utm_source || 'website',
      campaign: campaign || utm_campaign || 'web_contact_form',
      email: email ? email.trim() : undefined,
      city: city ? city.trim() : undefined,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term
    };

    const result = await processIncomingLead(leadInput, null);

    // Always return 201 to the public customer to avoid revealing existing leads
    if (result.isDuplicate) {
      return res.status(201).json({
        success: true,
        message: 'Thank you for contacting Omvik Realcon! Our sales team will get in touch with you shortly.',
        status: 'received'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting Omvik Realcon! Our sales team will get in touch with you shortly.',
      status: 'processed'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitPublicLead
};
