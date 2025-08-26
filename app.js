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
app.get("/patients/:id", async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    const [visits, appts, meds, consents] = await Promise.all([
      Visit.find({ patient: patient._id }).sort({ visitDate: -1 }).limit(10),
      Appointment.find({ patient: patient._id }).sort({ startAt: 1 }).limit(10),
      Medication.find({ patient: patient._id }).sort({ startDate: -1 }).limit(10),
      Consent.find({ patient: patient._id }).sort({ uploadedAt: -1 }).limit(10)
    ]);
    res.render("patients/dashboard", { patient, visits, appts, meds, consents });
  } catch (e) { next(e); }
});

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

    // ✅ Build correct base URL (works for Render or localhost)
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const roomLink = `${baseUrl}/videocall?room=${roomId}`;

    // Save booking in DB
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

    // Send emails
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
      text: `
      Hello ${patientName},
      Your video consultation is confirmed.
      🔗 Join: ${roomLink}
      `
    };

    await mailTransporter.sendMail(doctorMail);
    await mailTransporter.sendMail(patientMail);

    req.flash("success", "Booking confirmed! Details sent to doctor and patient.");
    res.redirect(`/videocall?room=${roomId}`);
  } catch (err) {
    console.error(err);
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