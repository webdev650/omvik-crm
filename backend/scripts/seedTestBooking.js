const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Customer = require('../models/Customer');
const Project = require('../models/Project');
const Opportunity = require('../models/Opportunity');
const Booking = require('../models/Booking');
const User = require('../models/User');

dotenv.config();

async function seedTestBooking() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/omvik-crm');
    console.log('MongoDB Connected for Seeding...');

    // 1. Find or create an admin/user
    let user = await User.findOne({ role: 'super_admin' }) || await User.findOne();
    if (!user) {
      console.log('No user found to assign.');
      process.exit(1);
    }

    // 2. Find or create Project
    let project = await Project.findOne({ code: 'OHT' });
    if (!project) {
      project = await Project.create({
        name: 'Omvik Heritage Towers',
        code: 'OHT',
        location: 'Jubilee Hills, Hyderabad',
        propertyType: 'Apartment',
        status: 'active'
      });
    }

    // 3. Find or create Customer
    let customer = await Customer.findOne({ primaryMobile: '+919876543210' });
    if (!customer) {
      customer = await Customer.create({
        name: 'Anand Sharma',
        primaryMobile: '+919876543210',
        email: 'anand.sharma@example.com',
        city: 'Hyderabad',
        address: 'Flat 502, Green Avenue, Jubilee Hills'
      });
    }

    // 4. Find or create Won Opportunity
    let opportunity = await Opportunity.findOne({ customer: customer._id, project: project._id });
    if (!opportunity) {
      opportunity = await Opportunity.create({
        customer: customer._id,
        project: project._id,
        owner: user._id,
        stage: 'won',
        source: 'WEBSITE',
        isActive: true
      });
    } else {
      opportunity.stage = 'won';
      await opportunity.save();
    }

    // 5. Delete existing booking for clean test, then create fresh booking
    await Booking.deleteMany({ customer: customer._id });

    const totalCost = 8000000; // 80 Lakhs
    const totalPaid = 5000000; // 50 Lakhs

    const booking = await Booking.create({
      opportunity: opportunity._id,
      customer: customer._id,
      project: project._id,
      contact: customer.primaryMobile,
      location: customer.city,
      projectType: 'Apartment',
      unitNumber: 'A-502',
      sqftArea: 1850,
      bhk: '3BHK',
      bookingDate: new Date('2026-08-15'),
      finalPrice: 8000000,
      totalCost,
      totalPaid,
      probableRegistrationDate: new Date('2026-11-30'),
      status: 'construction_in_progress',
      assignedTo: user._id,
      createdBy: user._id,
      remarks: 'Initial 50L payment received via RTGS. Balance 30L due on registration.'
    });

    console.log('\n========================================');
    console.log('✅ TEST BOOKING SEEDED SUCCESSFULLY!');
    console.log('Customer ID:', customer._id.toString());
    console.log('Customer Name:', customer.name);
    console.log('Unit Number:', booking.unitNumber);
    console.log('Total Cost:', booking.totalCost);
    console.log('Total Paid:', booking.totalPaid);
    console.log('Payment Remaining (Virtual):', booking.paymentRemaining);
    console.log('% Payment Received (Virtual):', `${booking.paymentPercentage}%`);
    console.log('========================================\n');

    // 6. Test formula update: update totalPaid to 8,000,000
    booking.totalPaid = 8000000;
    await booking.save();
    console.log('Formula Verification Test (After Full Payment):');
    console.log('Updated Total Paid:', booking.totalPaid);
    console.log('Updated Payment Remaining (Virtual):', booking.paymentRemaining);
    console.log('Updated % Payment Received (Virtual):', `${booking.paymentPercentage}%\n`);

    // Reset back to partial payment (50L) for initial display
    booking.totalPaid = 5000000;
    await booking.save();

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedTestBooking();
