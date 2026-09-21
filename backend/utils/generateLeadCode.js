const Project = require('../models/Project');
const Counter = require('../models/Counter');

/**
 * Returns formatted date string YYMMDD (e.g. 260919 for Sept 19, 2026)
 */
function getYYMMDD(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Auto-generates sequential lead code: OMV-[PROJECT_CODE]-[YYMMDD]-[001]
 * Uses atomic findOneAndUpdate $inc on Counter model for race-condition safety.
 */
async function generateLeadCode(projectId, date = new Date()) {
  let projectCode = 'OMV';

  if (projectId) {
    const project = await Project.findById(projectId);
    if (project) {
      // Child project's own code is used (e.g. AB1 instead of parent ACB)
      projectCode = project.projectCode || project.code || 'OMV';
    }
  }

  projectCode = projectCode.toUpperCase().trim();
  const yymmdd = getYYMMDD(date);
  const counterKey = `${projectCode}_${yymmdd}`;

  // Atomic counter increment (safe against race conditions)
  const counter = await Counter.findOneAndUpdate(
    { name: counterKey },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );

  const seqStr = String(counter.value).padStart(3, '0');
  return `OMV-${projectCode}-${yymmdd}-${seqStr}`;
}

module.exports = {
  generateLeadCode,
  getYYMMDD
};
