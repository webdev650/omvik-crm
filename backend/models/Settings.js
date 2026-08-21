const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      default: 'default'
    },
    workStartTime: {
      type: String,
      default: '10:00'
    },
    workStartGraceMinutes: {
      type: Number,
      default: 30
    },
    lunchWindowStart: {
      type: String,
      default: '13:00'
    },
    lunchWindowEnd: {
      type: String,
      default: '14:00'
    }
  },
  {
    timestamps: true
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

async function getOrCreateSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      workStartTime: '10:00',
      workStartGraceMinutes: 30,
      lunchWindowStart: '13:00',
      lunchWindowEnd: '14:00'
    });
  }
  return settings;
}

module.exports = {
  Settings,
  getOrCreateSettings
};
