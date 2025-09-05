// models/opdbook.js
// const mongoose = require("mongoose");

// const opdBookSchema = new mongoose.Schema({
//   hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
//   doctorId: { type: mongoose.Schema.Types.ObjectId },
//   doctorName: String,
//   slotTime: String,
//   slotType: { type: String, enum: ["OPD", "Online"], default: "OPD" },
//   patientName: String,
//   patientEmail: String,
//   patientPhone: String,
//   status: { type: String, enum: ["Pending", "Confirmed", "Cancelled"], default: "Pending" },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("opdbook", opdBookSchema);
// models/opdbook.js
const mongoose = require("mongoose");

// const opdBookSchema = new mongoose.Schema({
//   hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
//   doctorId: { type: mongoose.Schema.Types.ObjectId },
//   doctorName: String,
//   slotTime: String,
//   slotType: { type: String, enum: ["OPD", "Online"], default: "OPD" },
//   patientId: {
//   type: mongoose.Schema.Types.ObjectId,
//   ref: 'Patient'
// },
//   patientName: String,
//   patientEmail: String,
//   patientPhone: String,
//   status: { type: String, enum: ["Pending", "Confirmed", "Cancelled"], default: "Pending" },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("OpdBook", opdBookSchema);


const opdBookSchema = new mongoose.Schema({
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    doctorName: {
        type: String,
        required: true
    },
    slotTime: {
        type: String,
        required: true
    },
    slotType: {
        type: String,
        default: "OPD"
    },
    patientName: {
        type: String,
        required: true
    },
    patientEmail: {
        type: String,
        required: true
    },
    patientPhone: {
        type: String,
        required: true
    },
    // ✅ ADD THIS FIELD if missing
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('OpdBook', opdBookSchema);
