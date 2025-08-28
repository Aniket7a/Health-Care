const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: String,
  manufacturer: String,
  batchNumber: String,
  manufacturingDate: Date,
  expiryDate: Date,
  stock: Number,
  price: Number,
  pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Medicine", medicineSchema);
