const axios = require("axios");

/**
 * Send a regular transactional SMS (booking alerts, notifications)
 * @param {string} to  - e.g. "9198xxxxxxxx"
 * @param {string} message - text content (must match your DLT template if enforced)
 */
async function sendTransactionalSMS(to, message) {
  if (!process.env.MSG91_AUTHKEY || !process.env.MSG91_SENDER_ID) {
    throw new Error("MSG91 env vars missing");
  }

  // MSG91 v2 Transactional SMS API
  const payload = {
    sender: process.env.MSG91_SENDER_ID, // 6 letters, DLT approved
    route: "4",                          // '4' is transactional route
    country: "91",
    sms: [
      { to: [to], message }
    ]
  };

  const res = await axios.post(
    "https://api.msg91.com/api/v2/sendsms",
    payload,
    {
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json"
      },
      params: { country: "91" }
    }
  );

  return res.data;
}

/**
 * Send/verify OTP using MSG91 OTP API
 */
async function sendOTP(mobile, otp) {
  // mobile must be like "9198xxxxxxxx"
  const res = await axios.post(
    "https://api.msg91.com/api/v5/otp",
    {
      mobile,
      otp,
      template_id: process.env.MSG91_OTP_TEMPLATE_ID
    },
    {
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json"
      }
    }
  );
  return res.data;
}

async function verifyOTP(mobile, otp) {
  const res = await axios.post(
    "https://api.msg91.com/api/v5/otp/verify",
    { mobile, otp },
    {
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json"
      }
    }
  );
  return res.data;
}

module.exports = { sendTransactionalSMS, sendOTP, verifyOTP };
