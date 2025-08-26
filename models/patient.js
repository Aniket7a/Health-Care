const mongoose = require("mongoose");
const { Schema } = mongoose;

const emergencyContactSchema = new Schema({
  name: String,
  relation: String,
  phone: String
},{_id:false});

const patientSchema = new Schema({
  opid: { type: String, index: true },          // e.g., 220324022
  firstName: String,
  lastName: String,
  gender: { type: String, enum: ["Male","Female","Other"] },
  bloodGroup: String,                                          // "O +ve"
  dob: Date,                                                   // compute age
  phone: String,
  address: String,
  pincode: String,
  photoUrl: String,
  alerts: [String],                                            // e.g., ["Allergic to Walnut"]
  emergencyContacts: [emergencyContactSchema]
},{ timestamps:true });

patientSchema.virtual("age").get(function(){
  if(!this.dob) return null;
  const diff = Date.now() - this.dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
});

patientSchema.virtual("fullName").get(function(){
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

module.exports = mongoose.model("Patient", patientSchema);
