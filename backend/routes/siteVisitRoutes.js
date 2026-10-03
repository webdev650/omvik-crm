const express = require('express');
const {
  scheduleSiteVisit,
  getSiteVisits,
  updateSiteVisit,
  getMySiteVisits
} = require('../controllers/siteVisitController');
const { protect } = require('../middlewares/auth');
const { applyDataScope } = require('../middlewares/rbac');

// Router specifically for nested /api/opportunities/:id/site-visits
const opportunitySiteVisitRouter = express.Router();
opportunitySiteVisitRouter.use(protect);
opportunitySiteVisitRouter.post('/:id/site-visits', applyDataScope, scheduleSiteVisit);
opportunitySiteVisitRouter.get('/:id/site-visits', applyDataScope, getSiteVisits);

// Router specifically for direct /api/site-visits
const siteVisitRouter = express.Router();
siteVisitRouter.use(protect);
siteVisitRouter.get('/me', applyDataScope, getMySiteVisits);
// SECURITY: applyDataScope enforces row-level ownership on update \u2014
// telecaller can only modify their own visits, team_lead their team's, admin/super_admin any.
siteVisitRouter.patch('/:id', applyDataScope, updateSiteVisit);

module.exports = {
  opportunitySiteVisitRouter,
  siteVisitRouter
};
