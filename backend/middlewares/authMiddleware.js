const { protect } = require('./auth');
const { authorize } = require('./rbac');

const admin = authorize('admin', 'super_admin', 'director');

module.exports = {
  protect,
  authorize,
  admin
};
