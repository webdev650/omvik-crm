const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');

// @desc    Get all users (Admin view with populated team)
// @route   GET /api/users
// @access  Private (super_admin, admin, director)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('teamId', 'name description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users
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

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
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

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'telecaller',
      teamId: teamId || null,
      projectIds: projectIds || [],
      isActive: true
    });

    // If user is assigned to a team, update team's memberIds list
    if (teamId) {
      const team = await Team.findById(teamId);
      if (team && !team.memberIds.some(id => id.toString() === user._id.toString())) {
        team.memberIds.push(user._id);
        await team.save();
      }
    }

    const createdUser = await User.findById(user._id)
      .select('-password')
      .populate('teamId', 'name description');

    res.status(201).json({
      success: true,
      message: 'Employee user created successfully',
      user: createdUser
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
      new: true,
      runValidators: true
    })
      .select('-password')
      .populate('teamId', 'name description');

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser
};
