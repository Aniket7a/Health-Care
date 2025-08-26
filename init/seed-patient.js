require("dotenv").config();
const mongoose = require("mongoose");
const Patient = require("../models/patient");
const Visit = require("../models/visit");
const Appointment = require("../models/appointment");
const Medication = require("../models/medication");

(async()=>{
  await mongoose.connect(process.env.MONGO_URL);
  await Promise.all([Patient.deleteMany({}), Visit.deleteMany({}), Appointment.deleteMany({}), Medication.deleteMany({})]);
  const p = await Patient.create({
    opid:"220324022", firstName:"Linda", lastName:"Joseph", gender:"Female",
    bloodGroup:"O +ve", dob:new Date("1983-01-01"), phone:"9840123456",
    alerts:["Allergic to Walnut"], emergencyContacts:[{name:"Mila Kent", relation:"Sister", phone:"7600123456"}]
  });
  await Visit.create([
    { patient:p._id, doctorName:"Dr. Benjamin Davis", department:"Oral maxillofacial pathology", visitDate:new Date("2024-08-05") },
    { patient:p._id, doctorName:"Dr. Amelia Chia", department:"Public Health Dentistry", visitDate:new Date("2024-08-04") }
  ]);
  await Appointment.create({ patient:p._id, doctorName:"Susan Bones", department:"Public Health Dentistry", startAt:new Date(Date.now()+86400000) });
  await Medication.create({ patient:p._id, itemId:"RI24014", name:"Zerodel SP", dose:"1 tab", frequency:"BD", startDate:new Date("2024-07-22"), endDate:new Date("2024-07-23") });
  console.log("Seeded:", p._id.toString());
  process.exit(0);
})();
