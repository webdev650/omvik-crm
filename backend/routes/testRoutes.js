const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { applyDataScope, authorize } = require('../middlewares/rbac');

router.get('/scope-check', protect, applyDataScope, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      teamId: req.user.teamId
    },
    scope: req.dataScope
  });
});

const Opportunity = require('../models/Opportunity');
const { runSlaSweep } = require('../jobs/slaSweep');

const mongoose = require('mongoose');

// SECURITY: Restricted to super_admin only. These routes backdate DB records and trigger
// production SLA sweeps — must never be callable by telecallers or any other non-admin role.
router.post('/backdate-sla', protect, authorize('super_admin'), async (req, res) => {
  const { opportunityId, hoursAgo } = req.body;
  const backdated = new Date(Date.now() - (hoursAgo || 60) * 60 * 60 * 1000);
  await Opportunity.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(opportunityId) },
    { $set: { createdAt: backdated, stage: 'new', isActive: true, slaBreached: false } }
  );
  res.json({ success: true, opportunityId, createdAt: backdated });
});

router.post('/trigger-sla-sweep', protect, authorize('super_admin'), async (req, res) => {
  const { cutoffHours } = req.body;
  const count = await runSlaSweep(cutoffHours || 36);
  res.json({ success: true, processedCount: count });
});

module.exports = router;
