const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  patientName: String,
  patientPhone: String,
  slot: String,
  doctorEmail: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", bookingSchema);
