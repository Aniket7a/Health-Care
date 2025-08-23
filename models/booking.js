const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true },   // ✅ new
  gender: { type: String, required: true },
  age: { type: Number, required: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  prescription: { type: String, required: true },
  patientPhone: { type: String, required: true },
  date: { type: String, required: true }, // you could use Date type
  slot: { type: String, required: true },
  doctorEmail: { type: String, required: true },

  // video consultation room
  roomId: { type: String, required: true },  // ✅ new

  // relations
  createdAt: { type: Date, default: Date.now },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" // logged-in user who booked
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
