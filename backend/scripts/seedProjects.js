const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('../models/Project');

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Parent project for Acre Bhoomi (code ACB), with two phases as sub-projects.
    const acreBhoomi = await Project.findOneAndUpdate(
      { $or: [{ projectCode: 'ACB' }, { code: 'ACB' }] },
      {
        code: 'ACB',
        projectCode: 'ACB',
        name: 'Acre Bhoomi',
        location: 'Odisha',
        builder: 'My City Odisha',
        parentProject: null,
        status: 'active'
      },
      { upsert: true, new: true }
    );
    console.log(`Ensured Parent Project ACB — ${acreBhoomi.name}`);

    const projects = [
      { projectCode: 'AB1', code: 'AB1', name: 'Acre Bhoomi Phase I', location: 'Mendhasala', builder: 'My City Odisha', parentProject: acreBhoomi._id },
      { projectCode: 'AB2', code: 'AB2', name: 'Acre Bhoomi Phase II', location: 'Malipada', builder: 'My City Odisha', parentProject: acreBhoomi._id },
      { projectCode: 'OSA', code: 'OSA', name: 'Om Sai Ashrya', location: 'Nakhara', builder: 'Om Sai Developers', parentProject: null },
      { projectCode: 'DDV', code: 'DDV', name: 'Divya Dham Villa', location: 'Puri', builder: 'Utkarsh', parentProject: null },
      { projectCode: 'VAS', code: 'VAS', name: 'Vasundhara', location: 'Haladiapada', builder: 'My City Odisha', parentProject: null }
    ];

    for (const p of projects) {
      const exists = await Project.findOne({
        $or: [{ projectCode: p.projectCode }, { code: p.code }, { name: p.name }]
      });
      if (exists) {
        // Update to ensure projectCode, code, and parentProject are set properly
        exists.projectCode = p.projectCode;
        exists.code = p.code;
        if (p.parentProject) exists.parentProject = p.parentProject;
        await exists.save();
        console.log(`Updated existing project: ${exists.projectCode} — ${exists.name}`);
        continue;
      }
      const created = await Project.create({ ...p, status: 'active' });
      console.log(`Created ${created.projectCode} — ${created.name}`);
    }

    console.log('Project Seeding Completed!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
