const mongoose = require('mongoose');
require('dotenv').config();
require('../models/Customer');
require('../models/Project');
require('../models/Opportunity');
require('../models/User');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');

async function testFetch() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/omvik-crm');
  const id = '6a9fa4040a4868f29807f8aa';

  const customer = await Customer.findById(id);
  const allOpportunities = await Opportunity.find({ customer: id });
  const oppIds = allOpportunities.map((o) => o._id);

  const bookings = await Booking.find({
    $or: [{ customer: id }, { opportunity: { $in: oppIds } }]
  })
    .populate('project', 'name code location propertyType')
    .populate('opportunity', 'stage value')
    .populate('assignedTo', 'name email role')
    .sort({ bookingDate: -1 });

  console.log('Customer:', customer?.name);
  console.log('Opportunities Count:', allOpportunities.length);
  console.log('Bookings Count:', bookings.length);
  if (bookings.length > 0) {
    console.log('Booking 0 ID:', bookings[0]._id);
    console.log('Booking 0 Opportunity Stage:', bookings[0].opportunity?.stage);
    console.log('Booking 0 Customer ID:', bookings[0].customer);
  }

  await mongoose.disconnect();
}

testFetch();
