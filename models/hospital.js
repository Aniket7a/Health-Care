const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: String,
  category: String,   // General Medicine, Cardiology, Skin, etc.
  slots: [String],    // ["10:00 AM", "2:00 PM"]
  onlineSlots: [String],  // new field
  email: String,
  slotCapacity: { type: Number, default: 15 }, // max patients per slot
  bookedSlots: { type: Map, of: Number, default: {} } // track count for each slot
});

const roomSchema = new mongoose.Schema({
  type: String,       // ICU, Private, General Ward
  total: Number,
  available: Number
});

const hospitalSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String, // (can hash later with bcrypt)
  address: String,
  phone: String,

  doctors: [doctorSchema],
  rooms: [roomSchema],
  ambulances: { type: Number, default: 0 }
});

module.exports = mongoose.model("Hospital", hospitalSchema);
