const Booking = require('../models/Booking');
const Opportunity = require('../models/Opportunity');
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');

// @desc    Create a new booking for an opportunity
// @route   POST /api/bookings
// @access  Private (admin, super_admin, director, team_lead, or opportunity owner)
const createBooking = async (req, res, next) => {
  try {
    const {
      opportunityId,
      customerId,
      projectId,
      contact,
      location,
      projectType,
      unitNumber,
      sqftArea,
      bhk,
      bookingDate,
      finalPrice,
      totalCost,
      totalPaid,
      probableRegistrationDate,
      status,
      assignedTo,
      remarks
    } = req.body;

    if (!opportunityId) {
      return res.status(400).json({ message: 'Opportunity ID is required' });
    }

    const opportunity = await Opportunity.findById(opportunityId)
      .populate('customer')
      .populate('project')
      .populate('owner');

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    const custObj = opportunity.customer || {};
    const projObj = opportunity.project || {};
    const ownerObj = opportunity.owner || {};

    const targetCustomerId = customerId || custObj._id;
    const targetProjectId = projectId || projObj._id;
    const defaultContact = contact || custObj.primaryMobile || '';
    const defaultLocation = location || custObj.city || projObj.location || '';
    const defaultProjectType = projectType || projObj.propertyType || 'Apartment';
    const defaultAssignedTo = assignedTo || ownerObj._id || req.user._id;

    const booking = await Booking.create({
      opportunity: opportunity._id,
      customer: targetCustomerId,
      project: targetProjectId,
      contact: defaultContact,
      location: defaultLocation,
      projectType: defaultProjectType,
      unitNumber: unitNumber || '',
      sqftArea: sqftArea ? Number(sqftArea) : 0,
      bhk: bhk || null,
      bookingDate: bookingDate ? new Date(bookingDate) : new Date(),
      finalPrice: Number(finalPrice || 0),
      totalCost: Number(totalCost || finalPrice || 0),
      totalPaid: Number(totalPaid || 0),
      probableRegistrationDate: probableRegistrationDate ? new Date(probableRegistrationDate) : null,
      status: status || 'booked',
      assignedTo: defaultAssignedTo,
      createdBy: req.user._id,
      remarks: remarks || ''
    });

    // Create Audit Log entry
    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_BOOKING',
      entity: 'Booking',
      entityId: booking._id,
      reason: `Booking recorded for opportunity ${opportunity._id}`,
      metadata: { finalPrice, totalCost, totalPaid }
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name primaryMobile alternateMobile email city address')
      .populate('project', 'name code location propertyType')
      .populate('opportunity', 'stage value')
      .populate('assignedTo', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings for a customer (scoped)
// @route   GET /api/bookings/customer/:customerId
// @access  Private
const getBookingsByCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const scopeFilter = req.dataScope || req.scopeFilter || {};

    const filter = { customer: customerId, ...scopeFilter };

    const bookings = await Booking.find(filter)
      .populate('customer', 'name primaryMobile alternateMobile email city address')
      .populate('project', 'name code location propertyType')
      .populate('opportunity', 'stage value')
      .populate('assignedTo', 'name email role')
      .sort({ bookingDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking details, status, or totalPaid
// @route   PATCH /api/bookings/:id
// @access  Private
const updateBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      contact,
      location,
      projectType,
      unitNumber,
      sqftArea,
      bhk,
      bookingDate,
      finalPrice,
      totalCost,
      totalPaid,
      probableRegistrationDate,
      status,
      assignedTo,
      remarks
    } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // --- OWNERSHIP ENFORCEMENT FOR TELECALLERS ---
    // Telecallers may only update bookings where they are assignedTo or createdBy.
    // They cannot reassign a booking to a different user.
    if (req.user.role === 'telecaller') {
      const userId = req.user._id.toString();
      const isOwner =
        booking.assignedTo?.toString() === userId ||
        booking.createdBy?.toString() === userId;
      if (!isOwner) {
        return res.status(403).json({
          message: 'You are not authorized to update this booking'
        });
      }
      if (req.body.assignedTo !== undefined) {
        return res.status(403).json({
          message: 'Telecallers cannot reassign bookings'
        });
      }
    }

    if (totalPaid !== undefined) booking.totalPaid = Number(totalPaid);
    if (status !== undefined) booking.status = status;
    if (contact !== undefined) booking.contact = contact;
    if (location !== undefined) booking.location = location;
    if (projectType !== undefined) booking.projectType = projectType;
    if (unitNumber !== undefined) booking.unitNumber = unitNumber;
    if (sqftArea !== undefined) booking.sqftArea = Number(sqftArea);
    if (bhk !== undefined) booking.bhk = bhk;
    if (bookingDate !== undefined) booking.bookingDate = new Date(bookingDate);
    if (finalPrice !== undefined) booking.finalPrice = Number(finalPrice);
    if (totalCost !== undefined) booking.totalCost = Number(totalCost);
    if (probableRegistrationDate !== undefined) {
      booking.probableRegistrationDate = probableRegistrationDate ? new Date(probableRegistrationDate) : null;
    }
    if (assignedTo !== undefined) booking.assignedTo = assignedTo;
    if (remarks !== undefined) booking.remarks = remarks;

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name primaryMobile alternateMobile email city address')
      .populate('project', 'name code location propertyType')
      .populate('opportunity', 'stage value')
      .populate('assignedTo', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking by opportunity ID
// @route   GET /api/bookings/opportunity/:opportunityId
// @access  Private
const getBookingByOpportunityId = async (req, res, next) => {
  try {
    const { opportunityId } = req.params;
    // Apply data-scope so telecallers cannot retrieve another user's booking
    // by supplying an opportunity ID that happens to belong to someone else.
    const scopeFilter = req.dataScope || {};
    const booking = await Booking.findOne({
      opportunity: opportunityId,
      ...scopeFilter
    })
      .populate('customer', 'name primaryMobile alternateMobile email city address')
      .populate('project', 'name code location propertyType')
      .populate('opportunity', 'stage value')
      .populate('assignedTo', 'name email role');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookingsByCustomer,
  updateBooking,
  getBookingByOpportunityId
};

