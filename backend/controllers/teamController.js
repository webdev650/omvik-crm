const Team = require('../models/Team');
const User = require('../models/User');

const createTeam = async (req, res, next) => {
  try {
    const { name, description, teamLeadId, memberIds, projectId } = req.body;

    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      return res.status(400).json({ message: 'Team with this name already exists' });
    }

    const team = await Team.create({
      name: name.trim(),
      description,
      teamLeadId: teamLeadId || null,
      memberIds: memberIds || [],
      projectId: projectId || null
    });

    // Update teamId for team lead and members if provided
    if (teamLeadId) {
      await User.findByIdAndUpdate(teamLeadId, { teamId: team._id });
    }
    if (memberIds && memberIds.length > 0) {
      const mongoose = require('mongoose');
      const objectIdMembers = memberIds.map((id) => new mongoose.Types.ObjectId(id));
      await User.updateMany(
        { _id: { $in: objectIdMembers } },
        { teamId: team._id }
      );
    }

    res.status(201).json({ success: true, team });
  } catch (error) {
    next(error);
  }
};

const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find()
      .populate('teamLeadId', 'name email role')
      .populate('memberIds', 'name email role')
      .populate('projectId', 'name code');

    res.json({ success: true, count: teams.length, teams });
  } catch (error) {
    next(error);
  }
};

const getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('teamLeadId', 'name email role')
      .populate('memberIds', 'name email role')
      .populate('projectId', 'name code');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ success: true, team });
  } catch (error) {
    next(error);
  }
};

const updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ success: true, team });
  } catch (error) {
    next(error);
  }
};

const addMemberToTeam = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (!team.memberIds.some((id) => id.toString() === userId.toString())) {
      team.memberIds.push(userId);
      await team.save();
    }

    await User.findByIdAndUpdate(userId, { teamId: team._id });

    res.json({ success: true, message: 'Member added to team', team });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  addMemberToTeam
};
