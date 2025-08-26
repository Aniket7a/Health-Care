const mongoose = require("mongoose");
const { Schema } = mongoose;

const medicationSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  itemId: String,                   // Rx ID
  name: String,                     // Zerodel SP
  dose: String,                     // e.g., "1 tab"
  frequency: String,                // e.g., "BD"
  startDate: Date,
  endDate: Date,
  instructions: String
},{ timestamps:true });

module.exports = mongoose.model("Medication", medicationSchema);
