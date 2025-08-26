const mongoose = require("mongoose");
const { Schema } = mongoose;

const consentSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  type: { type: String, default: "General" }, // or "Surgery", etc.
  filename: String,
  fileUrl: String,                  // path under /uploads
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Consent", consentSchema);
