const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  gender: { type: String, required: true },
  age: { type: Number, required: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  prescription: { type: String, required: true },
  patientPhone: { type: String, required: true },
  date: { type: String, required: true }, // can change to Date if needed
  slot: { type: String, required: true },
  doctorEmail: { type: String, required: true },

  // relations
  createdAt: { type: Date, default: Date.now },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" // whoever booked the slot
  }
});

module.exports = mongoose.model("Booking", bookingSchema);

