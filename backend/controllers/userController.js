const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');
const Opportunity = require('../models/Opportunity');
const AssignmentHistory = require('../models/AssignmentHistory');
const Followup = require('../models/Followup');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const LoginLog = require('../models/LoginLog');
const sendAdminAlert = require('../utils/sendAdminAlert');

// @desc    Get all users (Admin view with populated team & last login timestamp)
// @route   GET /api/users
// @access  Private (super_admin, admin, director)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('teamId', 'name description')
      .sort({ createdAt: -1 })
      .lean();

    // Aggregation to find latest login date per user
    const lastLogins = await LoginLog.aggregate([
      { $sort: { loginAt: -1 } },
      {
        $group: {
          _id: '$user',
          lastLogin: { $first: '$loginAt' }
        }
      }
    ]);

    const lastLoginMap = new Map();
    lastLogins.forEach(item => {
      if (item._id) {
        lastLoginMap.set(item._id.toString(), item.lastLogin);
      }
    });

    const usersWithLastLogin = users.map(u => ({
      ...u,
      lastLogin: lastLoginMap.get(u._id.toString()) || null
    }));

    res.json({
      success: true,
      count: usersWithLastLogin.length,
      users: usersWithLastLogin
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (super_admin, admin, director)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('teamId', 'name description');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin creates a new employee user (No login cookie set)
// @route   POST /api/users
// @access  Private (super_admin, admin)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, teamId, projectIds } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Privilege Escalation Guard: Only super_admin can create another super_admin
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        message: 'Forbidden: Only a Super Admin can create accounts with the super_admin role.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email address' });
    }

    // Generate random server-side temporary password if not explicitly supplied
    const crypto = require('crypto');
    const sendEmail = require('../utils/sendEmail');
    const tempPassword = password && password.trim() ? password.trim() : `Omvik#${crypto.randomBytes(4).toString('hex')}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'telecaller',
      teamId: teamId || null,
      projectIds: projectIds || [],
      isActive: true,
      mustChangePassword: true
    });

    // If user is assigned to a team, update team's memberIds list
    if (teamId) {
      const team = await Team.findById(teamId);
      if (team && !team.memberIds.some(id => id.toString() === user._id.toString())) {
        team.memberIds.push(user._id);
        await team.save();
      }
    }

    // Send Welcome & Temporary Password Email
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    try {
      await sendEmail({
        email: user.email,
        subject: 'Welcome to OMVIK CRM — Temporary Account Credentials',
        message: `Your OMVIK CRM account is ready.\n\nTemporary Password: ${tempPassword}\n\nPlease sign in at ${loginUrl} and change your password on first login.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #4f46e5;">Welcome to OMVIK CRM</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your staff account has been created. Here are your temporary login credentials:</p>
            <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; margin: 16px 0;">
              <strong>Email:</strong> ${user.email}<br/>
              <strong>Temporary Password:</strong> ${tempPassword}
            </div>
            <p style="margin: 20px 0;">
              <a href="${loginUrl}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Sign In & Set Private Password</a>
            </p>
            <p style="font-size: 12px; color: #64748b;">You will be prompted to set a new private password upon your first login.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('[createUser Email Notice]', emailErr.message);
    }

    const createdUser = await User.findById(user._id)
      .select('-password')
      .populate('teamId', 'name description');

    res.status(201).json({
      success: true,
      message: 'Employee user created successfully. Credentials emailed.',
      user: createdUser,
      tempPassword
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin updates employee user (role, teamId, isActive, password, etc.)
// @route   PATCH /api/users/:id
// @access  Private (super_admin, admin)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, teamId, isActive, password, projectIds } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Privilege Escalation Guard: Only super_admin can promote to super_admin or edit a super_admin
    if ((role === 'super_admin' || user.role === 'super_admin') && req.user.role !== 'super_admin') {
      return res.status(403).json({
        message: 'Forbidden: Only a Super Admin can promote users to or modify a super_admin account.'
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (projectIds !== undefined) updates.projectIds = projectIds;

    // Handle password update
    if (password && password.trim().length >= 6) {
      updates.password = await bcrypt.hash(password.trim(), 12);
    }

    // Handle team assignment change
    if (teamId !== undefined && teamId !== user.teamId?.toString()) {
      updates.teamId = teamId || null;

      // Remove from previous team
      if (user.teamId) {
        await Team.findByIdAndUpdate(user.teamId, {
          $pull: { memberIds: user._id }
        });
      }

      // Add to new team
      if (teamId) {
        const newTeam = await Team.findById(teamId);
        if (newTeam && !newTeam.memberIds.some(mId => mId.toString() === user._id.toString())) {
          newTeam.memberIds.push(user._id);
          await newTeam.save();
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true
    })
      .select('-password')
      .populate('teamId', 'name description');

    // Record Audit Log for user modification
    await AuditLog.create({
      user: req.user._id,
      action: 'USER_MODIFIED',
      entity: 'User',
      entityId: user._id,
      reason: `User ${user.email} modified (${Object.keys(updates).join(', ')})`,
      metadata: { targetUserId: user._id, targetEmail: user.email, updates }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Self-service profile update for logged in user (strictly whitelisted fields: name, phone)
// @route   PATCH /api/users/me
// @access  Private (all logged in users)
const updateOwnProfile = async (req, res, next) => {
  try {
    const { name, phone, nudgesEnabled } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (nudgesEnabled !== undefined) updates.nudgesEnabled = Boolean(nudgesEnabled);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid self-editable profile fields provided' });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      returnDocument: 'after',
      runValidators: true
    })
      .select('-password')
      .populate('teamId', 'name description');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Offboard a departing employee: reassign all active opportunities and scheduled followups, deactivate user account, notify new owner, log audit trail.
// @route   POST /api/users/:id/offboard
// @access  Private (admin, super_admin)
const offboardUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newOwnerId, reason } = req.body;

    if (!newOwnerId || !reason || !reason.trim()) {
      return res.status(400).json({ message: 'Replacement owner (newOwnerId) and offboarding reason are required.' });
    }

    const departingUser = await User.findById(id);
    if (!departingUser) {
      return res.status(404).json({ message: 'Departing employee user not found.' });
    }

    if (id === newOwnerId.toString()) {
      return res.status(400).json({ message: 'Replacement owner cannot be the departing employee.' });
    }

    const newOwner = await User.findById(newOwnerId);
    if (!newOwner || !newOwner.isActive) {
      return res.status(400).json({ message: 'Selected replacement owner is invalid or inactive.' });
    }

    // Privilege Escalation Guard
    if (departingUser.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden: Only a Super Admin can offboard another Super Admin.' });
    }

    // 1. Find all active opportunities owned by departing user
    const activeOpps = await Opportunity.find({ owner: departingUser._id, isActive: true });
    const reassignedCount = activeOpps.length;

    let reassignedFollowupsCount = 0;

    // 2. Process each opportunity reassignment
    for (const opp of activeOpps) {
      // Update owner
      opp.owner = newOwner._id;
      await opp.save();

      // Create AssignmentHistory entry
      await AssignmentHistory.create({
        opportunity: opp._id,
        assignedTo: newOwner._id,
        assignedBy: req.user._id
      });

      // Reassign scheduled / pending followups on this opportunity owned by departing user
      const followupsToReassign = await Followup.find({
        opportunity: opp._id,
        owner: departingUser._id,
        status: { $in: ['scheduled', 'pending', 'overdue'] }
      });

      for (const f of followupsToReassign) {
        f.owner = newOwner._id;
        await f.save();
        reassignedFollowupsCount++;
      }
    }

    // 3. Deactivate departing user account
    departingUser.isActive = false;
    await departingUser.save();

    // 4. Create ONE Notification for newOwner if opportunities were reassigned
    if (reassignedCount > 0) {
      await Notification.create({
        user: newOwner._id,
        message: `📋 You have received ${reassignedCount} active opportunities and ${reassignedFollowupsCount} follow-ups from ${departingUser.name}'s offboarding.`,
        link: '/leads',
        type: 'assignment'
      });
    }

    // 5. Create ONE AuditLog entry
    await AuditLog.create({
      user: req.user._id,
      action: 'USER_OFFBOARDED',
      entity: 'User',
      entityId: departingUser._id,
      reason: `Offboarded ${departingUser.name} (${departingUser.email}). Reassigned ${reassignedCount} opportunities and ${reassignedFollowupsCount} followups to ${newOwner.name}. Reason: ${reason.trim()}`,
      metadata: {
        departingUserId: departingUser._id,
        departingUserName: departingUser.name,
        newOwnerId: newOwner._id,
        newOwnerName: newOwner.name,
        reassignedCount,
        reassignedFollowupsCount,
        reason: reason.trim()
      }
    });

    sendAdminAlert({
      subject: `Employee Offboarded: ${departingUser.name}`,
      message: `Employee ${departingUser.name} (${departingUser.email}) was offboarded by ${req.user.name}. ${reassignedCount} active opportunities and ${reassignedFollowupsCount} follow-ups reassigned to ${newOwner.name}. Reason: ${reason.trim()}`
    });

    res.status(200).json({
      success: true,
      message: `Employee ${departingUser.name} offboarded successfully. ${reassignedCount} opportunities reassigned to ${newOwner.name}.`,
      deactivatedUser: {
        _id: departingUser._id,
        name: departingUser.name,
        email: departingUser.email,
        employeeId: departingUser.employeeId
      },
      reassignedCount,
      reassignedFollowupsCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get count of active opportunities owned by a user (for offboarding modal count)
 * @route   GET /api/users/:id/active-opportunities-count
 * @access  Private (admin, super_admin)
 */
const getUserActiveOppCount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const count = await Opportunity.countDocuments({ owner: id, isActive: true });
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateOwnProfile,
  offboardUser,
  getUserActiveOppCount
};
