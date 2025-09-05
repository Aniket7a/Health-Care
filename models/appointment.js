const mongoose = require("mongoose");
const { Schema } = mongoose;

const appointmentSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorName: String,
  department: String,
  startAt: Date,
  status: { type: String, enum: ["Scheduled","Completed","Cancelled"], default:"Scheduled" },
  // roomCode: String                   // for Jitsi/Video link if you use it
  type: {
  type: String,
  enum: ['OPD', 'Online Consultation', 'Regular', 'Emergency'],
  default: 'Regular'
},
location: String,
roomId: String, // For online consultations
},{ timestamps:true });

module.exports = mongoose.model("Appointment", appointmentSchema);
