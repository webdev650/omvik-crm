const Project = require('../models/Project');

const createProject = async (req, res, next) => {
  try {
    const { name, code, location, builder, propertyType, status, description, managerId } = req.body;

    const existingProject = await Project.findOne({
      $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }]
    });

    if (existingProject) {
      return res.status(400).json({ message: 'Project with this name or code already exists' });
    }

    const project = await Project.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      location,
      builder: builder || 'Omvik Realcon',
      propertyType: propertyType || 'Apartment',
      status: status || 'active',
      description,
      managerId: managerId || null
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ isActive: true }).populate('managerId', 'name email role');
    res.json({ success: true, count: projects.length, projects });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('managerId', 'name email role');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject
};
