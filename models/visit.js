const mongoose = require("mongoose");
const { Schema } = mongoose;

const visitSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorName: String,
  department: String,                // e.g., "Public Health Dentistry"
  summary: String,                   // notes
  visitDate: { type: Date, default: Date.now }
},{ timestamps:true });

module.exports = mongoose.model("Visit", visitSchema);
