const Project = require('../models/Project');

const createProject = async (req, res, next) => {
  try {
    const { name, code, location, builder, propertyType, status, description, managerId, parentProject } = req.body;

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
      managerId: managerId || null,
      parentProject: parentProject || null
    });

    await project.populate([
      { path: 'managerId', select: 'name email role' },
      { path: 'parentProject', select: 'name code' }
    ]);

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const isFlat = req.query.flat === 'true';

    const allProjects = await Project.find({ isActive: true })
      .populate('managerId', 'name email role')
      .populate('parentProject', 'name code')
      .lean();

    if (isFlat) {
      return res.json({ success: true, count: allProjects.length, projects: allProjects });
    }

    // Default: Return projects nested under top-level parents
    const parentMap = new Map();
    const topLevelProjects = [];

    // First pass: identify top-level projects
    allProjects.forEach((p) => {
      if (!p.parentProject) {
        p.subProjects = [];
        parentMap.set(p._id.toString(), p);
        topLevelProjects.push(p);
      }
    });

    // Second pass: attach sub-projects to their parents
    allProjects.forEach((p) => {
      if (p.parentProject) {
        const parentId = (p.parentProject._id || p.parentProject).toString();
        if (parentMap.has(parentId)) {
          parentMap.get(parentId).subProjects.push(p);
        } else {
          // Fallback if parent is missing
          p.subProjects = [];
          topLevelProjects.push(p);
        }
      }
    });

    res.json({
      success: true,
      count: topLevelProjects.length,
      flatCount: allProjects.length,
      projects: topLevelProjects,
      flatProjects: allProjects
    });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('managerId', 'name email role')
      .populate('parentProject', 'name code');

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
    }).populate([
      { path: 'managerId', select: 'name email role' },
      { path: 'parentProject', select: 'name code' }
    ]);

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
