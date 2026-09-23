require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Project = require('../models/Project');

async function seed() {
  console.log('----------------------------------------------------');
  console.log('🏗️ SEEDING OFFICIAL OMVIK REALCON PROJECTS');
  console.log('----------------------------------------------------\n');

  await connectDB();

  // Parent project for Acre Bhoomi (code ACB), with two phases as sub-projects.
  let acreBhoomi = await Project.findOne({
    $or: [{ code: 'ACB' }, { projectCode: 'ACB' }]
  });

  if (!acreBhoomi) {
    acreBhoomi = await Project.create({
      name: 'Acre Bhoomi',
      code: 'ACB',
      projectCode: 'ACB',
      location: 'Odisha',
      builder: 'My City Odisha',
      parentProject: null,
      status: 'active',
      isActive: true
    });
    console.log(`Created Parent Project: ${acreBhoomi.code} — ${acreBhoomi.name}`);
  } else {
    acreBhoomi.name = 'Acre Bhoomi';
    acreBhoomi.code = 'ACB';
    acreBhoomi.projectCode = 'ACB';
    acreBhoomi.location = 'Odisha';
    acreBhoomi.builder = 'My City Odisha';
    acreBhoomi.parentProject = null;
    acreBhoomi.status = 'active';
    acreBhoomi.isActive = true;
    await acreBhoomi.save();
    console.log(`Updated Parent Project: ${acreBhoomi.code} — ${acreBhoomi.name}`);
  }

  const projects = [
    {
      code: 'AB1',
      projectCode: 'AB1',
      name: 'Acre Bhoomi Phase I',
      location: 'Mendhasala',
      builder: 'My City Odisha',
      parentProject: acreBhoomi._id
    },
    {
      code: 'AB2',
      projectCode: 'AB2',
      name: 'Acre Bhoomi Phase II',
      location: 'Malipada',
      builder: 'My City Odisha',
      parentProject: acreBhoomi._id
    },
    {
      code: 'OSA',
      projectCode: 'OSA',
      name: 'Om Sai Ashrya',
      location: 'Nakhara',
      builder: 'Om Sai Developers',
      parentProject: null
    },
    {
      code: 'DDV',
      projectCode: 'DDV',
      name: 'Divya Dham Villa',
      location: 'Puri',
      builder: 'Utkarsh',
      parentProject: null
    },
    {
      code: 'VAS',
      projectCode: 'VAS',
      name: 'Vasundhara',
      location: 'Haladiapada',
      builder: 'My City Odisha',
      parentProject: null
    }
  ];

  for (const p of projects) {
    let exists = await Project.findOne({
      $or: [{ code: p.code }, { projectCode: p.projectCode }]
    });

    if (exists) {
      exists.name = p.name;
      exists.code = p.code;
      exists.projectCode = p.projectCode;
      exists.location = p.location;
      exists.builder = p.builder;
      exists.parentProject = p.parentProject;
      exists.status = 'active';
      exists.isActive = true;
      await exists.save();
      console.log(`Updated: ${exists.code} — ${exists.name}`);
    } else {
      const created = await Project.create({
        ...p,
        status: 'active',
        isActive: true
      });
      console.log(`Created: ${created.code} — ${created.name}`);
    }
  }

  console.log('\n====================================================');
  console.log('✅ ALL OFFICIAL PROJECTS SEEDED SUCCESSFULLY');
  console.log('====================================================\n');

  const allProjects = await Project.find({ isActive: true }).select('name code projectCode location builder parentProject');
  allProjects.forEach((proj, idx) => {
    const parentText = proj.parentProject ? ` (Parent: ${proj.parentProject})` : '';
    console.log(` ${idx + 1}. [${proj.code}] ${proj.name} - Location: ${proj.location || 'N/A'} | Developer: ${proj.builder || 'N/A'}${parentText}`);
  });

  await mongoose.connection.close();
}

seed().catch(async (err) => {
  console.error('❌ Project Seeding Error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
