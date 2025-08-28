const mongoose = require("mongoose");

const pharmacySchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String, // hash later
  address: String
});

module.exports = mongoose.model("Pharmacy", pharmacySchema);
