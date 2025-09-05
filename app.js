require('dotenv').config();





const express = require('express')
const app = express()
app.set("trust proxy", 1);

const port = process.env.PORT || 3030;

const mongoose = require('mongoose');
const Listing = require("./models/listing.js")
const path  = require("path")
const methodOverride=require("method-override")
const ejsMate = require("ejs-mate")
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const Review = require("./models/review.js");
const flash = require("connect-flash")
const review = require('./models/review.js');
const session = require("express-session")
const MongoStore = require('connect-mongo');
const passport = require("passport")
const LocalStrategy = require("passport-local")
const User = require("./models/user.js"); 
const { log } = require('console');
const { isLoggedIn , isOwner,isReviewAuthor} = require("./middleware.js")
const { saveRedirectUrl} = require("./middleware.js")
const geocoder = require("./utils/geocode"); 
const Booking = require("./models/booking"); // import your model
const nodemailer = require("nodemailer");

















// setup mail transporter
const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,  // from .env
    pass: process.env.MAIL_PASS   // Gmail App Password
  }
});


const dbUrl = process.env.ATLASDB_URL;
const store = MongoStore.create({
  mongoUrl:dbUrl,
  crypto :{
    secret : process.env.SECRET,
  },
  touchAfter : 24 * 3600
})


store.on("error",(err)=>{
  console.log("ERROR IN MONGO SESSION STORE",err);
  
})


const isProduction = process.env.NODE_ENV === 'production'; // Add this line

const sessionOption ={
  store ,
  secret: process.env.SECRET,
  resave : false,
 saveUninitialized: true,
 cookie : {
   expires :Date.now() + 7 * 24 * 60 * 60 * 1000,
   maxAge :  7 * 24 * 60 * 60 * 1000,
   httpOnly : true,
    secure: isProduction, // Critical for HTTPS
    sameSite: isProduction ? 'none' : 'lax' // Required for cross-site cookies
   
 }
}






app.use(session(sessionOption))
app.use(flash())


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());










app.set("view engine","ejs")
app.set("views",path.join(__dirname,"views"))
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"))
app.engine("ejs",ejsMate)
app.use(express.static(path.join(__dirname,"/public")))

app.use((req,res,next)=>{
  res.locals.success = req.flash("success")
   res.locals.error = req.flash("error");
   res.locals.currUser = req.user;
  next()
})






main().then(()=>{
    console.log("connected to DB"); 
})
.catch(err => console.log(err));

async function main() {
 await mongoose.connect(dbUrl);


  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}




const moment = require("moment");
const multer = require("multer");


const Patient = require("./models/patient");
const Visit = require("./models/visit");
const Appointment = require("./models/appointment");
const Medication = require("./models/medication");
const Consent = require("./models/consent");

// Multer (disk) — for quick start. Later swap to Cloudinary/S3.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "public", "uploads")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, ""))
});
const upload = multer({ storage });

// Expose moment globally to views
app.use((req, res, next) => {
  res.locals.moment = moment;
  next();
});

// CREATE patient (form + save)
app.get("/patients/new", (req, res) => res.render("patients/new"));

app.post("/patients", async (req, res) => {
  const p = await Patient.create(req.body);
  res.redirect(`/patients/${p._id}`);
});

// PATIENT DASHBOARD
// app.get("/patients/:id", async (req, res, next) => {
//   try {
//     const patient = await Patient.findById(req.params.id);
//     const [visits, appts, meds, consents] = await Promise.all([
//       Visit.find({ patient: patient._id }).sort({ visitDate: -1 }).limit(10),
//       Appointment.find({ patient: patient._id }).sort({ startAt: 1 }).limit(10),
//       Medication.find({ patient: patient._id }).sort({ startDate: -1 }).limit(10),
//       Consent.find({ patient: patient._id }).sort({ uploadedAt: -1 }).limit(10)
//     ]);
//     res.render("patients/dashboard", { patient, visits, appts, meds, consents });
//   } catch (e) { next(e); }
// });
// app.get("/patients/:id", async (req, res, next) => {
//     console.log("📊 Loading patient dashboard for ID:", req.params.id);
    
//     try {
//         const patient = await Patient.findById(req.params.id);
//         if (!patient) {
//             console.log("❌ Patient not found:", req.params.id);
//             req.flash("error", "Patient not found");
//             return res.redirect("/listings");
//         }

//         console.log("✅ Patient found:", patient.name);

//         // Fetch all data with improved queries
//         const [visits, appointments, medications, consents, opdHistory, onlineHistory] = await Promise.all([
//             Visit.find({ patient: patient._id }).sort({ visitDate: -1 }).limit(10),
//             Appointment.find({ patient: patient._id }).sort({ startAt: 1 }).limit(10),
//             Medication.find({ patient: patient._id }).sort({ startDate: -1 }).limit(10),
//             Consent.find({ patient: patient._id }).sort({ uploadedAt: -1 }).limit(10),
//             OpdBook.find({ 
//                 $or: [
//                     { patientEmail: patient.email },
//                     { patientId: patient._id }
//                 ]
//             }).populate("hospitalId").sort({ createdAt: -1 }).limit(5),
//             Booking.find({ 
//                 $or: [
//                     { patientEmail: patient.email },
//                     { bookedBy: patient._id }
//                 ]
//             }).sort({ createdAt: -1 }).limit(5)
//         ]);

//         // Calculate comprehensive statistics
//         const stats = {
//             totalVisits: await Visit.countDocuments({ patient: patient._id }),
//             totalAppointments: await Appointment.countDocuments({ patient: patient._id }),
//             totalOPD: await OpdBook.countDocuments({ 
//                 $or: [
//                     { patientEmail: patient.email },
//                     { patientId: patient._id }
//                 ]
//             }),
//             totalOnline: await Booking.countDocuments({ 
//                 $or: [
//                     { patientEmail: patient.email },
//                     { bookedBy: patient._id }
//                 ]
//             }),
//             totalMedications: await Medication.countDocuments({ patient: patient._id })
//         };

//         console.log("📈 Dashboard Statistics:", stats);
//         console.log(`📋 Recent Data: ${visits.length} visits, ${opdHistory.length} OPD, ${onlineHistory.length} online`);

//         res.render("patients/dashboard", { 
//             patient, 
//             visits, 
//             appointments: appointments, 
//             medications, 
//             consents,
//             opdHistory,
//             onlineHistory,
//             stats
//         });

//     } catch (e) { 
//         console.error("❌ Dashboard Error:", e);
//         next(e); 
//     }
// });
app.get("/patients/:id", async (req, res, next) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.redirect("/listings");

        console.log("📊 Loading enhanced patient dashboard for:", patient.name);

        // Fetch all data
        const [visits, appointments, medications, consents, opdHistory, onlineHistory] = await Promise.all([
            Visit.find({ patient: patient._id }).sort({ visitDate: -1 }).limit(10),
            Appointment.find({ patient: patient._id }).sort({ startAt: 1 }).limit(10),
            Medication.find({ patient: patient._id }).sort({ startDate: -1 }).limit(10),
            Consent.find({ patient: patient._id }).sort({ uploadedAt: -1 }).limit(10),
            OpdBook.find({ 
                $or: [{ patientEmail: patient.email }, { patientId: patient._id }]
            }).populate("hospitalId").sort({ createdAt: -1 }),
            Booking.find({ 
                $or: [{ patientEmail: patient.email }, { bookedBy: patient._id }]
            }).sort({ createdAt: -1 })
        ]);

        // 📈 ANALYTICS CALCULATIONS

        // 1. Visit Frequency Analysis
        const allAppointments = [...opdHistory, ...onlineHistory, ...visits];
        const visitFrequency = calculateVisitFrequency(allAppointments);

        // 2. Consultation Mode Breakdown
        const consultationModes = {
            opd: opdHistory.length,
            online: onlineHistory.length,
            inPerson: visits.length,
            scheduled: appointments.length
        };

        // 3. Most Visited Hospitals
        const hospitalStats = calculateHospitalStats(opdHistory);

        // 4. Health Issues/Conditions Analysis
        const healthIssues = analyzeHealthIssues([...onlineHistory, ...visits, ...appointments]);

        // 5. Monthly Activity Trends (last 12 months)
        const monthlyTrends = calculateMonthlyTrends([...opdHistory, ...onlineHistory, ...visits]);

        // 6. Doctor/Specialist Visits
        const doctorStats = analyzeDoctorVisits([...opdHistory, ...onlineHistory, ...appointments]);

        // 7. Medication Compliance
        const medicationAnalysis = analyzeMedications(medications);

        // Basic stats
        const stats = {
            totalVisits: visits.length,
            totalAppointments: appointments.length,
            totalOPD: opdHistory.length,
            totalOnline: onlineHistory.length,
            totalMedications: medications.length,
            totalConsents: consents.length
        };

        // Prepare analytics data for charts
        const analytics = {
            visitFrequency,
            consultationModes,
            hospitalStats,
            healthIssues,
            monthlyTrends,
            doctorStats,
            medicationAnalysis,
            totalAppointments: stats.totalOPD + stats.totalOnline + stats.totalVisits
        };

        console.log("📊 Analytics Summary:", {
            totalAppointments: analytics.totalAppointments,
            mostVisitedHospital: hospitalStats.mostVisited?.name,
            consultationPreference: getPreferredMode(consultationModes)
        });

        res.render("patients/dashboard", { 
            patient, 
            visits, 
            appointments, 
            medications, 
            consents, 
            opdHistory, 
            onlineHistory, 
            stats,
            analytics // ✅ New analytics data
        });

    } catch (e) { 
        console.error("Dashboard Error:", e);
        next(e); 
    }
});

// 📊 ANALYTICS HELPER FUNCTIONS

function calculateVisitFrequency(appointments) {
    const now = new Date();
    const periods = {
        thisMonth: 0,
        last3Months: 0,
        last6Months: 0,
        thisYear: 0,
        total: appointments.length
    };

    appointments.forEach(apt => {
        const date = new Date(apt.createdAt || apt.visitDate || apt.date);
        const monthsAgo = (now - date) / (1000 * 60 * 60 * 24 * 30);

        if (monthsAgo <= 1) periods.thisMonth++;
        if (monthsAgo <= 3) periods.last3Months++;
        if (monthsAgo <= 6) periods.last6Months++;
        if (monthsAgo <= 12) periods.thisYear++;
    });

    return {
        ...periods,
        avgPerMonth: periods.thisYear / 12,
        frequency: getFrequencyLabel(periods.avgPerMonth)
    };
}

function calculateHospitalStats(opdHistory) {
    const hospitalCounts = {};
    
    opdHistory.forEach(appointment => {
        const hospitalName = appointment.hospitalId?.name || 'Unknown Hospital';
        hospitalCounts[hospitalName] = (hospitalCounts[hospitalName] || 0) + 1;
    });

    const sortedHospitals = Object.entries(hospitalCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([name, count]) => ({ name, count, percentage: (count / opdHistory.length * 100).toFixed(1) }));

    return {
        mostVisited: sortedHospitals[0],
        all: sortedHospitals,
        totalHospitals: Object.keys(hospitalCounts).length
    };
}

function analyzeHealthIssues(appointments) {
    const issues = {};
    
    appointments.forEach(apt => {
        const issue = apt.prescription || apt.notes || apt.reason || 'General Consultation';
        const key = issue.toLowerCase();
        issues[key] = (issues[key] || 0) + 1;
    });

    return Object.entries(issues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([issue, count]) => ({ 
            issue: issue.charAt(0).toUpperCase() + issue.slice(1), 
            count,
            percentage: (count / appointments.length * 100).toFixed(1)
        }));
}

function calculateMonthlyTrends(appointments) {
    const monthlyData = {};
    const last12Months = [];
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = { opd: 0, online: 0, visits: 0, month: date.toLocaleDateString('en', { month: 'short', year: 'numeric' }) };
    }

    appointments.forEach(apt => {
        const date = new Date(apt.createdAt || apt.visitDate || apt.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[key]) {
            if (apt.slotType) monthlyData[key].opd++;
            else if (apt.roomId) monthlyData[key].online++;
            else monthlyData[key].visits++;
        }
    });

    return Object.values(monthlyData);
}

function analyzeDoctorVisits(appointments) {
    const doctors = {};
    
    appointments.forEach(apt => {
        const doctorName = apt.doctorName || apt.doctor || 'Unknown Doctor';
        if (!doctors[doctorName]) {
            doctors[doctorName] = { name: doctorName, visits: 0, lastVisit: null };
        }
        doctors[doctorName].visits++;
        const visitDate = new Date(apt.createdAt || apt.startAt || apt.date);
        if (!doctors[doctorName].lastVisit || visitDate > doctors[doctorName].lastVisit) {
            doctors[doctorName].lastVisit = visitDate;
        }
    });

    return Object.values(doctors)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);
}

function analyzeMedications(medications) {
    const active = medications.filter(med => !med.endDate || new Date(med.endDate) > new Date());
    const completed = medications.filter(med => med.endDate && new Date(med.endDate) <= new Date());
    
    return {
        total: medications.length,
        active: active.length,
        completed: completed.length,
        categories: getMedicationCategories(medications)
    };
}

function getMedicationCategories(medications) {
    const categories = {};
    medications.forEach(med => {
        const category = med.category || 'General';
        categories[category] = (categories[category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, count]) => ({ name, count }));
}

function getFrequencyLabel(avgPerMonth) {
    if (avgPerMonth >= 2) return 'High';
    if (avgPerMonth >= 1) return 'Regular';
    if (avgPerMonth >= 0.5) return 'Moderate';
    return 'Low';
}

function getPreferredMode(modes) {
    const max = Math.max(modes.opd, modes.online, modes.inPerson);
    if (max === modes.opd) return 'OPD';
    if (max === modes.online) return 'Online';
    return 'In-Person';
}

// ADD alert
app.post("/patients/:id/alerts", async (req, res) => {
  await Patient.findByIdAndUpdate(req.params.id, { $addToSet: { alerts: req.body.alert } });
  res.redirect(`/patients/${req.params.id}#alerts`);
});

// ADD emergency contact
app.post("/patients/:id/emergency", async (req, res) => {
  await Patient.findByIdAndUpdate(req.params.id, { $push: { emergencyContacts: req.body } });
  res.redirect(`/patients/${req.params.id}#emergency`);
});

// CREATE visit
app.post("/patients/:id/visits", async (req, res) => {
  await Visit.create({ ...req.body, patient: req.params.id });
  res.redirect(`/patients/${req.params.id}#visits`);
});

// CREATE appointment
app.post("/patients/:id/appointments", async (req, res) => {
  await Appointment.create({ ...req.body, patient: req.params.id });
  res.redirect(`/patients/${req.params.id}#appointments`);
});

// CREATE medication
app.post("/patients/:id/medications", async (req, res) => {
  await Medication.create({ ...req.body, patient: req.params.id });
  res.redirect(`/patients/${req.params.id}#medications`);
});

// UPLOAD consent/report
app.post("/patients/:id/consents", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      req.flash("error", "Please select a file to upload");
      return res.redirect(`/patients/${req.params.id}#consents`);
    }

    await Consent.create({
      patient: req.params.id,
      type: req.body.type || "General",
      filename: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    });

    req.flash("success", "Consent / report uploaded successfully!");
    res.redirect(`/patients/${req.params.id}#consents`);
  } catch (err) {
    console.error("Consent upload error:", err);
    req.flash("error", "Failed to upload consent / report");
    res.redirect(`/patients/${req.params.id}#consents`);
  }
});
// PRINT (simple printable view)
app.get("/patients/:id/print", async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    const visits = await Visit.find({ patient: patient._id }).sort({ visitDate: -1 });
    res.render("patients/print", { patient, visits });
  } catch (e) { next(e); }
});











const Pharmacy = require("./models/Pharmacy");
const Medicine = require("./models/Medicine");

// ====== SESSION ======
app.use(session({
  secret: "secretkey",
  resave: false,
  saveUninitialized: true
}));
// ====== Pharmacy Signup ======
app.get("/pharmacy/signup", (req, res) => {
  res.render("pharmacy_signup");
});

app.post("/pharmacy/signup", async (req, res) => {
  const { name, email, password, address } = req.body;
  
  // check if email already exists
  const existing = await Pharmacy.findOne({ email });
  if (existing) {
    return res.send("Pharmacy already registered with this email.");
  }

  const newPharmacy = new Pharmacy({ name, email, password, address });
  await newPharmacy.save();
  res.redirect("/pharmacy/login");

});


// ====== Pharmacy Login (demo only, no hashing) ======
app.get("/pharmacy/login", (req, res) => {
  res.render("pharmacy_login");
});

app.post("/pharmacy/login", async (req, res) => {
  const { email, password } = req.body;
  const pharmacy = await Pharmacy.findOne({ email, password });
  if (pharmacy) {
    req.session.pharmacyId = pharmacy._id;
    res.redirect("/pharmacy/dashboard");
  } else {
    res.send("Invalid credentials");
  }
});


// ====== Pharmacy Dashboard ======
app.get("/pharmacy/dashboard", async (req, res) => {
  if (!req.session.pharmacyId) return res.redirect("/pharmacy/login");

  const medicines = await Medicine.find({ pharmacyId: req.session.pharmacyId });
  res.render("pharmacy_dashboard", { medicines });
});

app.post("/pharmacy/add", async (req, res) => {
  if (!req.session.pharmacyId) return res.redirect("/pharmacy/login");

  const med = new Medicine({
    ...req.body,
    pharmacyId: req.session.pharmacyId
  });
  await med.save();
  res.redirect("/pharmacy/dashboard");
});


// ====== Pharmacy Edit Medicine ======
// show edit form
app.get("/pharmacy/edit/:id", async (req, res) => {
  if (!req.session.pharmacyId) return res.redirect("/pharmacy/login");

  const medicine = await Medicine.findOne({ 
    _id: req.params.id, 
    pharmacyId: req.session.pharmacyId 
  });

  if (!medicine) return res.send("Medicine not found or unauthorized");

  res.render("pharmacy_edit", { medicine });
});

// handle update
app.post("/pharmacy/edit/:id", async (req, res) => {
  if (!req.session.pharmacyId) return res.redirect("/pharmacy/login");

  await Medicine.findOneAndUpdate(
    { _id: req.params.id, pharmacyId: req.session.pharmacyId },
    { ...req.body, lastUpdated: Date.now() }
  );

  res.redirect("/pharmacy/dashboard");
});


// ====== Patients View All Pharmacies ======
app.get("/pharmacies", async (req, res) => {
  const pharmacies = await Pharmacy.find();
  res.render("pharmacies_list", { pharmacies });
});

// ====== Patient View One Pharmacy ======
app.get("/pharmacy/:id", async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.id);
  res.render("pharmacy_detail", { pharmacy });
});

// ====== Patient View Medicines of Pharmacy ======
app.get("/pharmacy/:id/medicines", async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.id);
  const medicines = await Medicine.find({ pharmacyId: req.params.id });
  res.render("pharmacy_medicines", { pharmacy, medicines });
});
































// logout
app.get("/logout",(req,res,next)=>{
  req.logout((err) =>{
    if(err){next(err)}
    req.flash("success","you are logged out !")
    res.redirect("/listings")
  })
})

app.get("/video-call", isLoggedIn, (req, res) => {
  res.render("videoCall");
});




app.get("/", (req, res) => {
  res.redirect("/listings"); // or render a home page like "home.ejs"
});



app.get("/listings", async(req,res)=>{
 const allListings = await Listing.find({})
res.render("listings/index.ejs", { allListings });

})


app.get("/listings/new",isLoggedIn,(req,res)=>{
  
    res.render("listings/new.ejs")
})



app.get("/listings/new1",(req,res)=>{
    res.render("listings/new1.ejs")
})


//sign up form
app.get("/signup",(req,res)=>{
   res.render("users/signup.ejs")
})

// app.post("/signup",async(req,res)=>{
//    console.log("🔥 POST /signup hit");
//   console.log("📦 req.body =", req.body);
//   try{
//     let{username , email , password} = req.body
//       console.log("📩 Signup Request Received:", username, email);
//   const newUser = new User ({email,username})
//   const registeredUser = await User.register(newUser , password)
//   // console.log(registeredUser);



//   req.login(registeredUser,(err)=>{
//     if (err) {
//       return next(err);
//     }
//     req.flash("success","user was registered sucessfully")
//   res.redirect("/listings")
//   })
  
  
//   }
//   catch(err){
//     req.flash("error",err.message)
//     res.redirect("/signup")
//   }
// })








app.post("/signup", async (req, res, next) => {
  console.log("🔥 POST /signup hit");
  try {
    let { username, email, password } = req.body;

    const newUser = new User({ email, username });
    const registeredUser = await User.register(newUser, password);
    console.log("✅ User registered:", registeredUser._id);

    // Patient record
    await Patient.create({
      opid: registeredUser._id.toString(),
      _id: registeredUser._id,
      name: username,
      email: email
    });
    console.log("✅ Patient created");

    // login user
    req.login(registeredUser, (err) => {
      if (err) {
        console.error("❌ req.login failed:", err);
        req.flash("error", "Login failed, try logging in manually");
        return res.redirect("/login");
      }
      console.log("✅ req.login success, redirecting...");
      req.flash("success", "User was registered successfully");
      return res.redirect("/listings");
    });

  } catch (err) {
    console.error("❌ Signup error:", err);
    req.flash("error", err.message);
    res.redirect("/signup");
  }
});



// login form 
app.get("/login",(req,res)=>{
  res.render("users/login.ejs")
})

// app.post("/login", saveRedirectUrl ,passport.authenticate("local",{ failureRedirect : "/login" , failureFlash : true}),async(req,res)=>{
//     req.flash("success","Welcome to HealthMed!")
//     let redirectUrl = res.locals.redirectUrl || "/listings"
//     res.redirect(redirectUrl)
// })
app.post("/login",
  saveRedirectUrl,
  passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }),
  async (req, res) => {
    // ✅ Ensure Patient exists
    let patient = await Patient.findById(req.user._id);
    if (!patient) {
      patient = await Patient.create({
        _id: req.user._id,
         opid: req.user._id.toString(),
        name: req.user.username,
        email: req.user.email
      });
    }

    req.flash("success", "Welcome to HealthMed!");
    let redirectUrl = res.locals.redirectUrl || `/listings`;
    res.redirect(redirectUrl);
  }
);













// // CREATE ROUTE
// app.post("/listings", isLoggedIn,
//  wrapAsync(async(req,res,next)=>{
//    // let{title , description , immage , price , country ,locations}= req.body
//   if(!req.body.listing){
//     throw new ExpressError(400,"send vaild data")
//   }
  
//      let newlisting = new Listing(req.body.listing);
//      newlisting.owner = req.user._id;
//    await newlisting.save();
   
//    req.flash("success","New Listing Created")
//    res.redirect("/listings")


// }))
// CREATE ROUTE
app.post("/listings", isLoggedIn,
 wrapAsync(async(req, res, next) => {
  if (!req.body.listing) {
    throw new ExpressError(400, "Send valid data");
  }

  // Step 1: Get location from form
  const { location } = req.body.listing;

  // Step 2: Geocode location to get lat/lng
  const geoData = await geocoder.geocode(location);

  if (!geoData.length) {
    req.flash("error", "Invalid location");
    return res.redirect("/listings/new");
  }

  // Step 3: Create new listing with geocoded data
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.lat = geoData[0].latitude;
  newListing.lng = geoData[0].longitude;

  await newListing.save();

  req.flash("success", "New Listing Created");
  res.redirect("/listings");
}));



// delete 
app.delete("/listings/:id",isLoggedIn,isOwner,
  wrapAsync(async(req,res)=>{
      let { id} = req.params;
  let dlt =  await  Listing.findByIdAndDelete(id);
  console.log(dlt);
   req.flash("success"," Listing Deleted")
  res.redirect("/listings")
  
}))

//reviewsroute
app.post("/listings/:id/reviews", isLoggedIn , async(req,res)=>{
  let listing  =await Listing.findById(req.params.id)
  let newReview = new Review(req.body.review)
 newReview.author = req.user._id;
  listing.reviews.push(newReview)
  await newReview.save();
  await listing.save();

   req.flash("success","New Review Created")
 res.redirect(`/listings/${listing._id}`);
})





//update route
app.put("/listings/:id" ,isLoggedIn,isOwner,
  wrapAsync(async(req,res)=>{
    let { id} = req.params;
   

  await  Listing.findByIdAndUpdate(id,{...req.body.listing})
   req.flash("success"," Listing Updated")
  res.redirect(`/listings/${id}`)
}))






// edit route
app.get("/listings/:id/edit",isLoggedIn,isOwner,
  wrapAsync(async(req,res)=>{
    let{id}= req.params;
  const listing=  await Listing.findById(id);
    res.render("listings/edit.ejs",{listing})
}))


// show route
app.get("/listings/:id",
  wrapAsync(async(req,res)=>{
    let{id}= req.params;
  const listing=  await Listing.findById(id).populate({
    path: "reviews",
    populate :{
    path : "author"
    },
  }).populate("owner");
console.log(listing);


   // Calculate average rating
    let totalRating = 0;
    if (listing.reviews.length > 0) {
        totalRating = listing.reviews.reduce((sum, review) => sum + review.rating, 0);
    }
    const avgRating = listing.reviews.length ? (totalRating / listing.reviews.length).toFixed(1) : "N/A";

  res.render("listings/test.ejs",{ listing , avgRating})
}))


// delete review route
app.delete("/listings/:id/reviews/:reviewId", isLoggedIn,isReviewAuthor, async (req,res)=>{
      let {id , reviewId }=req.params;
      await Listing.findByIdAndUpdate(id ,{$pull : {reviews : reviewId}})
      Review.findByIdAndDelete(reviewId)
       req.flash("success","Review Deleted")
      res.redirect(`/listings/${id}`)
})

// app.post("/book-slot", isLoggedIn, async (req, res) => {
//   try {
//     const { patientName, patientPhone, slot, doctorEmail } = req.body;

//     // Mail content
//     const mailOptions = {
//       from: process.env.MAIL_USER,
//       to: doctorEmail,
//       subject: `📅 New Booking from ${patientName}`,
//       text: `Patient: ${patientName}\nPhone: ${patientPhone}\nSlot: ${slot}`
//     };

//     // Send email
//     await mailTransporter.sendMail(mailOptions);  // ✅ use mailTransporter

//     req.flash("success", "Booking confirmed & doctor notified!");
//     res.redirect("/listings");
//   } catch (err) {
//     console.error("❌ Email error:", err);
//     req.flash("error", "Booking saved, but email not sent.");
//     res.redirect("/listings");
//   }
// });



// cookies
// app.post("/book-slot", isLoggedIn, async (req, res) => {
//   try {
//     const {
//       patientName,
//       gender,
//       age,
//       address,
//       pincode,
//       prescription,
//       date,
//       slot,
//       doctorEmail,
//       patientPhone
//     } = req.body;

//     // Mail content
//     const mailOptions = {
//       from: process.env.MAIL_USER,
//       to: doctorEmail,
//       subject: `📅 New Booking from ${patientName}`,
//       text: `
//       🧑 Patient Details:
//       --------------------
//       Name: ${patientName}
//       Gender: ${gender}
//       Age: ${age}
//       Phone: ${patientPhone}
//       Address: ${address}
//       Pincode: ${pincode}

//       📝 Prescription / Issue:
//       ${prescription}

//       📅 Appointment:
//       Date: ${date}
//       Time: ${slot}
//       `
//     };

//     // Send email
//     await mailTransporter.sendMail(mailOptions);

//     req.flash("success", "Booking confirmed & doctor notified!");
//     res.redirect("/listings");
//   } catch (err) {
//     console.error("❌ Email error:", err);
//     req.flash("error", "Booking saved, but email not sent.");
//     res.redirect("/listings");
//   }
// });

// Helper function to generate cabin IDs
const generateRoomId = () => {
  const randomNum = Math.floor(10 + Math.random() * 90);
  return `cabin${randomNum}`;
};

// app.post("/book-slot", isLoggedIn, async (req, res) => {
//   try {
//     const {
//       patientName,
//       gender,
//       age,
//       address,
//       pincode,
//       prescription,
//       date,
//       slot,
//       doctorEmail,
//       patientPhone,
//       patientEmail
//     } = req.body;

//     // Generate room
//     const roomId = generateRoomId();

//     // ✅ Build correct base URL (works for Render or localhost)
//     const baseUrl = `${req.protocol}://${req.get("host")}`;
//     const roomLink = `${baseUrl}/videocall?room=${roomId}`;

//     // Save booking in DB
//     const booking = new Booking({
//       patientName,
//       patientEmail,
//       gender,
//       age,
//       address,
//       pincode,
//       prescription,
//       patientPhone,
//       date,
//       slot,
//       doctorEmail,
//       roomId,
//       bookedBy: req.user._id
//     });
//     await booking.save();

//     // Send emails
//     const doctorMail = {
//   from: process.env.MAIL_USER,
//   to: doctorEmail,
//   subject: `📅 New Booking from ${patientName}`,
//   html: `
//     <h2>New Patient Booking</h2>
//     <p><b>Patient Name:</b> ${patientName}</p>
//     <p><b>Email:</b> ${patientEmail}</p>
//     <p><b>Phone:</b> ${patientPhone}</p>
//     <p><b>Gender:</b> ${gender}</p>
//     <p><b>Age:</b> ${age}</p>
//     <p><b>Address:</b> ${address}</p>
//     <p><b>Pincode:</b> ${pincode}</p>
//     <p><b>Prescription / Issue:</b> ${prescription}</p>
//     <p><b>Date:</b> ${date}</p>
//     <p><b>Slot:</b> ${slot}</p>
//     <hr>
//     <p><b>Video Consultation Link:</b> 
//       <a href="${roomLink}" target="_blank">Join Meeting</a>
//     </p>
//   `
// };

//     const patientMail = {
//       from: process.env.MAIL_USER,
//       to: patientEmail,
//       subject: "✅ Your Consultation Link",
//       text: `
//       Hello ${patientName},
//       Your video consultation is confirmed.
//       🔗 Join: ${roomLink}
//       `
//     };

//     await mailTransporter.sendMail(doctorMail);
//     await mailTransporter.sendMail(patientMail);

//     req.flash("success", "Booking confirmed! Details sent to doctor and patient.");
//     res.redirect(`/videocall?room=${roomId}`);
//   } catch (err) {
//     console.error(err);
//     req.flash("error", "Booking failed.");
//     res.redirect("/listings");
//   }
// });


// REPLACE your existing /book-slot route
app.post("/book-slot", isLoggedIn, async (req, res) => {
  try {
    const {
      patientName,
      gender,
      age,
      address,
      pincode,
      prescription,
      date,
      slot,
      doctorEmail,
      patientPhone,
      patientEmail
    } = req.body;

    // Generate room
    const roomId = generateRoomId();
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const roomLink = `${baseUrl}/videocall?room=${roomId}`;

    // ✅ NEW: Find or update patient record
    let patient = await Patient.findById(req.user._id);
    if (patient) {
      // Update patient info if needed
      await Patient.findByIdAndUpdate(req.user._id, {
        name: patientName,
        email: patientEmail,
        phone: patientPhone,
        gender,
        age: parseInt(age),
        address,
        pincode
      });
    }

    // Save booking
    const booking = new Booking({
      patientName,
      patientEmail,
      gender,
      age,
      address,
      pincode,
      prescription,
      patientPhone,
      date,
      slot,
      doctorEmail,
      roomId,
      bookedBy: req.user._id
    });
    await booking.save();

    // ✅ NEW: Auto-create appointment record for history
    await Appointment.create({
      patient: req.user._id,
      doctor: doctorEmail,
      startAt: new Date(date + ' ' + slot),
      notes: `Online consultation - ${prescription}`,
      status: "Scheduled",
      type: "Online Consultation",
      location: "Video Call",
      roomId: roomId
    });

    // Send emails (your existing email code)
    const doctorMail = {
      from: process.env.MAIL_USER,
      to: doctorEmail,
      subject: `📅 New Booking from ${patientName}`,
      html: `
        <h2>New Patient Booking</h2>
        <p><b>Patient Name:</b> ${patientName}</p>
        <p><b>Email:</b> ${patientEmail}</p>
        <p><b>Phone:</b> ${patientPhone}</p>
        <p><b>Gender:</b> ${gender}</p>
        <p><b>Age:</b> ${age}</p>
        <p><b>Address:</b> ${address}</p>
        <p><b>Pincode:</b> ${pincode}</p>
        <p><b>Prescription / Issue:</b> ${prescription}</p>
        <p><b>Date:</b> ${date}</p>
        <p><b>Slot:</b> ${slot}</p>
        <hr>
        <p><b>Video Consultation Link:</b> 
          <a href="${roomLink}" target="_blank">Join Meeting</a>
        </p>
      `
    };

    const patientMail = {
      from: process.env.MAIL_USER,
      to: patientEmail,
      subject: "✅ Your Consultation Link",
      text: `Hello ${patientName}, Your video consultation is confirmed. 🔗 Join: ${roomLink}`
    };

    await mailTransporter.sendMail(doctorMail);
    await mailTransporter.sendMail(patientMail);

    req.flash("success", "Booking confirmed! Details sent to doctor and patient.");
    res.redirect(`/videocall?room=${roomId}`);

  } catch (err) {
    console.error("Online Booking Error:", err);
    req.flash("error", "Booking failed.");
    res.redirect("/listings");
  }
});







app.get("/book-slot", isLoggedIn, (req, res) => {
  res.render("bookings/new.ejs");
});
app.get("/bookings/new", (req, res) => {
  res.render("bookings/new");  // renders new.ejs
});













// app.get("/videocall", (req, res) => {
//   res.render("videocall"); // loads views/videocall.ejs
// });
// Add these routes to your existing app.js

// // Room creation route
// app.get("/create-room", isLoggedIn, (req, res) => {
//   const roomId = generateRoomId();
//   res.redirect(`/videocall?room=${roomId}`);
// });

// // Room joining route
// app.post("/join-room", isLoggedIn, (req, res) => {
//   const { roomId } = req.body;
//   res.redirect(`/videocall?room=${roomId}`);
// });

// // Updated video call route to accept room parameter
// app.get("/videocall", isLoggedIn, (req, res) => {
//   const roomId = req.query.room;
//   if (!roomId) {
//     req.flash("error", "Room ID is required");
//     return res.redirect("/join-room-page");
//   }
//   res.render("videocall", { roomId });
// });

// // Route for the room joining page
// app.get("/join-room-page", isLoggedIn, (req, res) => {
//   res.render("join-room");
// });

// // Helper function to generate room IDs
// function generateRoomId() {
//   return Math.random().toString(36).substring(2, 8).toUpperCase();
// }

// // Update Socket.IO handling for better room management
// io.on("connection", (socket) => {
//   console.log("🔗 User connected:", socket.id);

//   socket.on("join", (roomId) => {
//     socket.join(roomId);
//     socket.roomId = roomId;
    
//     // Notify others in the room that a new user joined
//     socket.to(roomId).emit("user-joined", socket.id);
    
//     // Send room info to the newly joined user
//     io.to(socket.id).emit("room-info", {
//       roomId,
//       users: Array.from(io.sockets.adapter.rooms.get(roomId) || [])
//     });
    
//     console.log(`User ${socket.id} joined room ${roomId}`);
//   });

//   socket.on("offer", (data) => {
//     socket.to(data.roomId).emit("offer", {
//       offer: data.offer,
//       from: socket.id
//     });
//   });

//   socket.on("answer", (data) => {
//     socket.to(data.roomId).emit("answer", {
//       answer: data.answer,
//       from: socket.id
//     });
//   });

//   socket.on("ice-candidate", (data) => {
//     socket.to(data.roomId).emit("ice-candidate", {
//       candidate: data.candidate,
//       from: socket.id
//     });
//   });

//   socket.on("end-call", (data) => {
//     socket.to(data.roomId).emit("end-call", { from: socket.id });
//   });

//   socket.on("disconnect", () => {
//     console.log("❌ User disconnected:", socket.id);
//     if (socket.roomId) {
//       socket.to(socket.roomId).emit("user-left", socket.id);
//     }
//   });
// });







app.get("/join-room", (req, res) => {
  res.render("join-room"); // room input page
});
app.get("/mental", (req, res) => {
  res.render("mental"); // room input page
});
app.get("/profile", (req, res) => {
  res.render("profile"); // room input page
});




app.get("/videocall", (req, res) => {
  const room = req.query.room || "defaultRoom";
  res.render("videocall", { room });
});



// //new
// // Show patient form
// app.get("/patients/new", (req, res) => {
//   res.render("patients/new");
// });

// // Show patient dashboard
// app.get("/patients/:id", (req, res) => {
//   // later you can fetch from DB, for now just render view
//   res.render("patients/dashboard");
// });










const Hospital = require("./models/hospital");

// ====== Hospital Signup ======
app.get("/hospital/signup", (req, res) => {
  res.render("hospital_signup"); // views/hospital_signup.ejs
});

app.post("/hospital/signup", async (req, res) => {
  const { name, email, password, address, phone } = req.body;

  const existing = await Hospital.findOne({ email });
  if (existing) return res.send("Hospital already registered with this email.");

  const hospital = new Hospital({ name, email, password, address, phone });
  await hospital.save();
  req.session.hospitalId = hospital._id;

  res.redirect("/hospital/dashboard");
});

// ====== Hospital Login ======
app.get("/hospital/login", (req, res) => {
  res.render("hospital_login");
});

app.post("/hospital/login", async (req, res) => {
  const { email, password } = req.body;
  const hospital = await Hospital.findOne({ email, password });

  if (!hospital) return res.send("Invalid credentials");
  req.session.hospitalId = hospital._id;

  res.redirect("/hospital/dashboard");
});

// ====== Hospital Dashboard ======
// ====== Hospital Dashboard ======
app.get("/hospital/dashboard", async (req, res) => {
  if (!req.session.hospitalId) return res.redirect("/hospital/login");

  const hospital = await Hospital.findById(req.session.hospitalId);

  // Count of all patients who booked OPD
  const patientCount = await OpdBook.countDocuments({ hospitalId: req.session.hospitalId });

  // Fetch all OPD bookings for this hospital
  const opdBookings = await OpdBook.find({ hospitalId: req.session.hospitalId }).sort({ createdAt: -1 });

  res.render("hospital_dashboard", { hospital, patientCount, opdBookings });
});


// ====== Doctors ======
// Add doctor (with OPD + Online slots)
// ====== Doctors ======
// Add doctor (with OPD + Online slots)
app.post("/hospital/doctors/add", async (req, res) => {
  if (!req.session.hospitalId) return res.redirect("/hospital/login");

  const { name, category, slots, onlineSlots, email } = req.body;

  await Hospital.findByIdAndUpdate(req.session.hospitalId, {
    $push: {
      doctors: {
        name,
        category,
        slots: slots ? slots.split(",").map(s => s.trim()) : [],
        onlineSlots: onlineSlots ? onlineSlots.split(",").map(s => s.trim()) : [],
        email
      }
    }
  });

  res.redirect("/hospital/dashboard");
});

// Edit doctor slots
app.post("/hospital/doctors/:docId/edit", async (req, res) => {
  const { slots, onlineSlots } = req.body;

  await Hospital.updateOne(
    { _id: req.session.hospitalId, "doctors._id": req.params.docId },
    {
      $set: {
        "doctors.$.slots": slots ? slots.split(",").map(s => s.trim()) : [],
        "doctors.$.onlineSlots": onlineSlots ? onlineSlots.split(",").map(s => s.trim()) : []
      }
    }
  );

  res.redirect("/hospital/dashboard");
});


// Remove doctor
app.post("/hospital/doctors/:docId/delete", async (req, res) => {
  await Hospital.findByIdAndUpdate(req.session.hospitalId, {
    $pull: { doctors: { _id: req.params.docId } }
  });

  res.redirect("/hospital/dashboard");
});

// ====== Rooms ======
// Add room type
app.post("/hospital/rooms/add", async (req, res) => {
  const { type, total } = req.body;

  await Hospital.findByIdAndUpdate(req.session.hospitalId, {
    $push: { rooms: { type, total: parseInt(total), available: parseInt(total) } }
  });

  res.redirect("/hospital/dashboard");
});

// Update room availability
app.post("/hospital/rooms/:roomId/update", async (req, res) => {
  if (!req.session.hospitalId) return res.redirect("/hospital/login");

  const { available, total } = req.body;

  await Hospital.updateOne(
    { _id: req.session.hospitalId, "rooms._id": req.params.roomId },
    {
      $set: {
        "rooms.$.available": parseInt(available),
        "rooms.$.total": parseInt(total)
      }
    }
  );

  res.redirect("/hospital/dashboard");
});

// ====== Ambulances ======
app.post("/hospital/ambulances/update", async (req, res) => {
  const { count } = req.body;

  await Hospital.findByIdAndUpdate(req.session.hospitalId, { ambulances: parseInt(count) });
  res.redirect("/hospital/dashboard");
});

// ====== Hospital List & Detail ======
app.get("/hospitals", async (req, res) => {
  const hospitals = await Hospital.find();
  res.render("hospitals_list", { hospitals });
});

app.get("/hospitals/:id", async (req, res) => {
  const hospital = await Hospital.findById(req.params.id);
  res.render("hospital_detail", { hospital });
});




















const OpdBook = require("./models/opdbook");


// Show OPD booking form
// app.get("/opd/new", async (req, res) => {
//   const { hospitalId, doctorId, slot } = req.query;
//   const hospital = await Hospital.findById(hospitalId);
//   const doctor = hospital.doctors.id(doctorId);

//   // Check if slot is full
//   const bookedCount = doctor.bookedSlots.get(slot) || 0;
//   const isFull = bookedCount >= doctor.slotCapacity;

//   if (isFull) return res.send("Sorry, this slot is fully booked");

//   res.render("bookings/opdForm", { hospital, doctor, slot });
// });
app.get("/opd/new", async (req, res) => {
    const { hospitalId, doctorId, slot } = req.query;
    const hospital = await Hospital.findById(hospitalId);
    const doctor = hospital.doctors.id(doctorId);

    // Check if slot is full
    const bookedCount = doctor.bookedSlots.get(slot) || 0;
    const isFull = bookedCount >= (doctor.slotCapacity || 10);

    if (isFull) return res.send("Sorry, this slot is fully booked");

    // Pass user info to template if logged in
    const currentUser = req.user || null;
    
    res.render("bookings/opdForm", { 
        hospital, 
        doctor, 
        slot, 
        currentUser 
    });
});

// Handle OPD booking submission
// app.post("/opd", async (req, res) => {
//   const { hospitalId, doctorId, doctorName, slotTime, patientName, patientEmail, patientPhone } = req.body;

//   const hospital = await Hospital.findById(hospitalId);
//   const doctor = hospital.doctors.id(doctorId);

//   // Check if slot is full
//   const bookedCount = doctor.bookedSlots.get(slotTime) || 0;
//   if (bookedCount >= doctor.slotCapacity) {
//     return res.send("Sorry, this slot is fully booked");
//   }
//   const PDFDocument = require("pdfkit");
// const fs = require("fs");

// // Show and download OPD slip
// app.get("/opd/:id/slip/download", async (req, res) => {
//   const booking = await OpdBook.findById(req.params.id).populate("hospitalId");

//   if (!booking) return res.status(404).send("Booking not found");

//   const doc = new PDFDocument({ size: "A4", margin: 50 });

//   // Set response headers
//   res.setHeader('Content-Type', 'application/pdf');
//   res.setHeader('Content-Disposition', `attachment; filename=OPD_Slip_${booking._id}.pdf`);

//   // Pipe PDF to response
//   doc.pipe(res);

//   // PDF content
//   doc
//     .fontSize(20)
//     .text("Hospital OPD Booking Slip", { align: "center" })
//     .moveDown();

//   doc.fontSize(14)
//     .text(`Hospital Name: ${booking.hospitalId.name}`)
//     .text(`Hospital Email: ${booking.hospitalId.email}`)
//     .text(`Hospital Phone: ${booking.hospitalId.phone}`)
//     .moveDown();

//   doc.text(`Patient Name: ${booking.patientName}`)
//     .text(`Patient Email: ${booking.patientEmail}`)
//     .text(`Patient Phone: ${booking.patientPhone}`)
//     .moveDown();

//   doc.text(`Doctor Name: ${booking.doctorName}`)
//     .text(`Slot Type: ${booking.slotType}`)
//     .text(`Slot Time: ${booking.slotTime}`)
//     .moveDown();

//   doc.text(`Booking ID: ${booking._id}`, { align: "right" });

//   doc.end();
// });


//   // Increment booked count
//   doctor.bookedSlots.set(slotTime, bookedCount + 1);
//   await hospital.save();

//   // Save OPD booking
//   const booking = new OpdBook({
//     hospitalId,
//     doctorId,
//     doctorName,
//     slotTime,
//     slotType: "OPD",
//     patientName,
//     patientEmail,
//     patientPhone
//   });

//   await booking.save();
//   res.redirect(`/opd/${booking._id}/slip`);
// });
app.post("/opd", async (req, res) => {
    console.log("🔥 OPD Booking Started");
    console.log("📦 Request Body:", req.body);
    
    const { hospitalId, doctorId, doctorName, slotTime, patientName, patientEmail, patientPhone } = req.body;

    try {
        // Step 1: Verify hospital exists
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            console.log("❌ Hospital not found:", hospitalId);
            return res.status(404).send("Hospital not found");
        }
        console.log("✅ Hospital found:", hospital.name);

        // Step 2: Verify doctor exists
        const doctor = hospital.doctors.id(doctorId);
        if (!doctor) {
            console.log("❌ Doctor not found:", doctorId);
            return res.status(404).send("Doctor not found");
        }
        console.log("✅ Doctor found:", doctor.name);

        // Step 3: Check slot availability
        const bookedCount = doctor.bookedSlots.get(slotTime) || 0;
        console.log(`📊 Slot ${slotTime} - Booked: ${bookedCount}, Capacity: ${doctor.slotCapacity}`);
        
        if (bookedCount >= (doctor.slotCapacity || 10)) {
            console.log("❌ Slot is full");
            return res.send("Sorry, this slot is fully booked");
        }

        // Step 4: Handle Patient Record (KEY FIX)
        let patient;
        let patientId = null;
        
        // If user is logged in, use their ID
        if (req.user) {
            console.log("👤 User is logged in:", req.user._id);
            patientId = req.user._id;
            
            // Find or update existing patient record
            patient = await Patient.findById(req.user._id);
            if (patient) {
                console.log("✅ Updating existing patient record");
                await Patient.findByIdAndUpdate(req.user._id, {
                    name: patientName,
                    email: patientEmail,
                    phone: patientPhone
                });
            } else {
                console.log("👤 Creating patient record for logged-in user");
                patient = await Patient.create({
                    _id: req.user._id,
                    opid: req.user._id.toString(),
                    name: patientName,
                    email: patientEmail,
                    phone: patientPhone,
                    createdAt: new Date()
                });
            }
        } else {
            // If user not logged in, find by email or create new
            console.log("🔍 Looking for patient with email:", patientEmail);
            patient = await Patient.findOne({ email: patientEmail });
            
            if (!patient) {
                console.log("👤 Creating new patient record");
                patient = await Patient.create({
                    name: patientName,
                    email: patientEmail,
                    phone: patientPhone,
                    opid: `PAT_${Date.now()}`,
                    createdAt: new Date()
                });
            } else {
                console.log("✅ Existing patient found:", patient._id);
                await Patient.findByIdAndUpdate(patient._id, {
                    name: patientName,
                    phone: patientPhone
                });
            }
            patientId = patient._id;
        }

        console.log("✅ Patient ID for booking:", patientId);

        // Step 5: Update doctor's booked slots
        doctor.bookedSlots.set(slotTime, bookedCount + 1);
        await hospital.save();
        console.log("✅ Doctor slot updated");

        // Step 6: Create OPD booking record (FIXED with proper patientId)
        console.log("💾 Creating OPD booking");
        const booking = new OpdBook({
            hospitalId,
            doctorId,
            doctorName,
            slotTime,
            slotType: "OPD",
            patientName,
            patientEmail,
            patientPhone,
            patientId: patientId, // ✅ Now correctly linked
            status: 'Confirmed',
            createdAt: new Date()
        });

        const savedBooking = await booking.save();
        console.log("✅ OPD Booking saved:", savedBooking._id);

        // Step 7: Create appointment record for history (FIXED with correct patientId)
        console.log("📅 Creating appointment history record");
        const appointmentRecord = await Appointment.create({
            patient: patientId, // ✅ Now uses correct patientId
            doctor: doctorName,
            startAt: new Date(), // You can customize this date
            notes: `OPD Appointment at ${hospital.name} - Slot: ${slotTime}`,
            status: "Scheduled",
            type: "OPD",
            location: hospital.name,
            createdAt: new Date()
        });
        console.log("✅ Appointment history created:", appointmentRecord._id);

        console.log("🎉 OPD Booking completed successfully");
        res.redirect(`/opd/${savedBooking._id}/slip`);

    } catch (err) {
        console.error("❌ OPD Booking Error:", err);
        console.error("Stack trace:", err.stack);
        res.status(500).send(`Error processing OPD booking: ${err.message}`);
    }
});






// Hospital Dashboard OPD Bookings
app.get("/hospital/opd-bookings", async (req, res) => {
    if (!req.session.hospitalId) return res.redirect("/hospital/login");

    // Fetch hospital info
    const hospital = await Hospital.findById(req.session.hospitalId);

    // Fetch all OPD bookings for this hospital
    const opdBookings = await OpdBook.find({ hospitalId: req.session.hospitalId }).sort({ createdAt: -1 });

    res.render("hospital_dashboard_opd", { hospital, opdBookings });
});




const QRCode = require("qrcode");

// Cancel booking
app.post("/hospital/opd/:id/cancel", async (req, res) => {
  await OpdBook.findByIdAndUpdate(req.params.id, { status: "Cancelled" });
  res.redirect("/hospital/dashboard");
});

// Confirm booking
app.post("/hospital/opd/:id/confirm", async (req, res) => {
  await OpdBook.findByIdAndUpdate(req.params.id, { status: "Confirmed" });
  res.redirect("/hospital/dashboard");
});

// Reschedule booking
app.post("/hospital/opd/:id/reschedule", async (req, res) => {
  const { newSlotTime } = req.body;
  await OpdBook.findByIdAndUpdate(req.params.id, { slotTime: newSlotTime });
  res.redirect("/hospital/dashboard");
});

// QR Code Slip
// QR Code Slip
app.get("/opd/:id/slip", async (req, res) => {
  try {
    const booking = await OpdBook.findById(req.params.id).populate("hospitalId");
    if (!booking) return res.status(404).send("Booking not found");

    // ✅ Store booking details in JSON format for QR
    const qrData = JSON.stringify({
      bookingId: booking._id,
      patient: booking.patientName,
      doctor: booking.doctorName,
      slot: booking.slotTime,
      status: booking.status,
      hospital: booking.hospitalId?.name
    });

    const qrCode = await QRCode.toDataURL(qrData);

    res.render("bookings/opdSlip", { 
      booking,
      qrCode,
      hospital: booking.hospitalId
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading OPD slip");
  }
});

// Confirm booking
app.post("/hospital/opd/:id/confirm", async (req, res) => {
  try {
    await OpdBook.findByIdAndUpdate(req.params.id, { status: "Confirmed" });
    res.redirect("/hospital/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error confirming booking");
  }
});

// Cancel booking
app.post("/hospital/opd/:id/cancel", async (req, res) => {
  try {
    await OpdBook.findByIdAndUpdate(req.params.id, { status: "Cancelled" });
    res.redirect("/hospital/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cancelling booking");
  }
});
// API: Get latest visits and appointments for a patient
app.get("/patients/:id/data", async (req, res) => {
  try {
    const patientId = req.params.id;

    const patient = await Patient.findById(patientId);
    const visits = await Visit.find({ patientId }).sort({ visitDate: -1 });
    const appts = await Appointment.find({ patientId }).sort({ startAt: -1 });

    res.json({ patient, visits, appts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch patient data" });
  }
});





// ✅ ADD: Patient appointment history route
// app.get("/patients/:id/history", isLoggedIn, async (req, res) => {
//   try {
//     const patientId = req.params.id;
//     const patient = await Patient.findById(patientId);
    
//     if (!patient) {
//       req.flash("error", "Patient not found");
//       return res.redirect("/listings");
//     }

//     // Fetch all appointment types
//     const [opdAppointments, onlineAppointments, visits, appointments] = await Promise.all([
//       OpdBook.find({ patientEmail: patient.email }).populate("hospitalId").sort({ createdAt: -1 }),
//       Booking.find({ patientEmail: patient.email }).sort({ createdAt: -1 }),
//       Visit.find({ patient: patientId }).sort({ visitDate: -1 }),
//       Appointment.find({ patient: patientId }).sort({ startAt: -1 })
//     ]);

//     res.render("patients/history", { 
//       patient, 
//       opdAppointments, 
//       onlineAppointments, 
//       visits, 
//       appointments 
//     });

//   } catch (err) {
//     console.error("Error fetching patient history:", err);
//     req.flash("error", "Error loading patient history");
//     res.redirect("/listings");
//   }
// });
// app.get("/patients/:id/history", async (req, res) => {
//     console.log("🔍 Fetching patient history for ID:", req.params.id);
    
//     try {
//         const patientId = req.params.id;
//         const patient = await Patient.findById(patientId);
        
//         if (!patient) {
//             console.log("❌ Patient not found:", patientId);
//             req.flash("error", "Patient not found");
//             return res.redirect("/listings");
//         }

//         console.log("✅ Patient found:", patient.name, patient.email);

//         // Fetch all appointment types with detailed logging
//         console.log("📊 Fetching appointment history...");
        
//         const opdAppointments = await OpdBook.find({ 
//             $or: [
//                 { patientEmail: patient.email },
//                 { patientId: patient._id }
//             ]
//         }).populate("hospitalId").sort({ createdAt: -1 });
        
//         const onlineAppointments = await Booking.find({ 
//             $or: [
//                 { patientEmail: patient.email },
//                 { bookedBy: patient._id }
//             ]
//         }).sort({ createdAt: -1 });
        
//         const visits = await Visit.find({ patient: patientId }).sort({ visitDate: -1 });
//         const appointments = await Appointment.find({ patient: patientId }).sort({ startAt: -1 });

//         console.log("📈 History Summary:");
//         console.log(`   - OPD Appointments: ${opdAppointments.length}`);
//         console.log(`   - Online Appointments: ${onlineAppointments.length}`);
//         console.log(`   - Visits: ${visits.length}`);
//         console.log(`   - Scheduled Appointments: ${appointments.length}`);

//         // Debug: Log recent OPD appointments
//         if (opdAppointments.length > 0) {
//             console.log("📋 Recent OPD appointments:");
//             opdAppointments.slice(0, 3).forEach((appt, index) => {
//                 console.log(`   ${index + 1}. ${appt.doctorName} at ${appt.hospitalId?.name || 'Unknown'} - ${appt.slotTime}`);
//             });
//         }

//         res.render("patients/history", { 
//             patient, 
//             opdAppointments, 
//             onlineAppointments, 
//             visits, 
//             appointments 
//         });

//     } catch (err) {
//         console.error("❌ Error fetching patient history:", err);
//         req.flash("error", "Error loading patient history");
//         res.redirect("/listings");
//     }
// });
app.get("/patients/:id/history", async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            req.flash("error", "Patient not found");
            return res.redirect("/listings");
        }

        console.log("📊 Fetching history for patient:", patient.name, patient.email);

        // ✅ FIXED: Query both by email AND patientId for comprehensive results
        const opdAppointments = await OpdBook.find({ 
            $or: [
                { patientEmail: patient.email },
                { patientId: patient._id }
            ]
        }).populate("hospitalId").sort({ createdAt: -1 });

        const onlineAppointments = await Booking.find({ 
            $or: [
                { patientEmail: patient.email }, 
                { bookedBy: patient._id }
            ]
        }).sort({ createdAt: -1 });
        
        const visits = await Visit.find({ patient: patient._id }).sort({ visitDate: -1 });
        const appointments = await Appointment.find({ patient: patient._id }).sort({ startAt: -1 });

        console.log(`📈 History loaded - OPD: ${opdAppointments.length}, Online: ${onlineAppointments.length}, Visits: ${visits.length}, Appointments: ${appointments.length}`);

        res.render("patients/history", { 
            patient, 
            opdAppointments, 
            onlineAppointments, 
            visits, 
            appointments 
        });
    } catch (err) {
        console.error("History Error:", err);
        req.flash("error", "Error loading patient history");
        res.redirect("/listings");
    }
});

// ✅ ADD: My appointments route for logged-in patients
app.get("/my-appointments", isLoggedIn, async (req, res) => {
  try {
    let patient = await Patient.findById(req.user._id);
    if (!patient) {
      patient = await Patient.create({
        _id: req.user._id,
        opid: req.user._id.toString(),
        name: req.user.username,
        email: req.user.email
      });
    }
    res.redirect(`/patients/${patient._id}/history`);
  } catch (err) {
    console.error("My Appointments Error:", err);
    req.flash("error", "Error accessing your appointments");
    res.redirect("/listings");
  }
});

// ✅ ADD: My dashboard route for logged-in patients
app.get("/my-dashboard", isLoggedIn, async (req, res) => {
  try {
    let patient = await Patient.findById(req.user._id);
    if (!patient) {
      patient = await Patient.create({
        _id: req.user._id,
        opid: req.user._id.toString(),
        name: req.user.username,
        email: req.user.email
      });
    }
    res.redirect(`/patients/${patient._id}`);
  } catch (err) {
    console.error("My Dashboard Error:", err);
    req.flash("error", "Error accessing your dashboard");
    res.redirect("/listings");
  }
});











// Debug: Check all OPD bookings
app.get("/debug/all-opd", async (req, res) => {
    try {
        const allOpdBookings = await OpdBook.find({}).populate("hospitalId");
        const totalCount = await OpdBook.countDocuments({});
        res.json({
            total: totalCount,
            bookings: allOpdBookings
        });
    } catch (err) {
        res.json({ error: err.message });
    }
});

// Debug: Check OPD for specific patient
app.get("/debug/opd-for-patient/:email", async (req, res) => {
    try {
        const email = req.params.email;
        const patient = await Patient.findOne({ email });
        const byEmail = await OpdBook.find({ patientEmail: email });
        const byPatientId = await OpdBook.find({ patientId: patient?._id });
        
        res.json({
            patient,
            byEmail: byEmail.length,
            byPatientId: byPatientId.length,
            emailResults: byEmail,
            patientIdResults: byPatientId
        });
    } catch (err) {
        res.json({ error: err.message });
    }
});





app.get("/getcookies",(req,res)=>{
  res.cookie("greet","hello")
  res.send("cookies are send")
})





//ERROR MIDDLEWARE
app.use((err,req,res,next)=>{
  let {statusCode =500 , message="something is wrong"} =err;
  res.status(statusCode).send(message)
})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})