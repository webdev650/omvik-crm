const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { applyDataScope } = require('../middlewares/rbac');

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

router.post('/backdate-sla', protect, async (req, res) => {
  const { opportunityId, hoursAgo } = req.body;
  const backdated = new Date(Date.now() - (hoursAgo || 60) * 60 * 60 * 1000);
  await Opportunity.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(opportunityId) },
    { $set: { createdAt: backdated, stage: 'new', isActive: true, slaBreached: false } }
  );
  res.json({ success: true, opportunityId, createdAt: backdated });
});

router.post('/trigger-sla-sweep', protect, async (req, res) => {
  const { cutoffHours } = req.body;
  const count = await runSlaSweep(cutoffHours || 36);
  res.json({ success: true, processedCount: count });
});

module.exports = router;
