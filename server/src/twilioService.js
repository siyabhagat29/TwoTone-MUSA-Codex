import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "+17655635185";
// Verified phone number for testing as designated by user
const TWILIO_TEST_VERIFIED_NUMBER = process.env.TWILIO_TEST_VERIFIED_NUMBER || "+917738122051";

/**
 * Dispatch an Emergency SOS SMS via Twilio API
 * @param {Object} sosData SOS details from mobile app
 * @returns {Promise<Object>} Result of Twilio dispatch
 */
export async function sendSosSms(sosData = {}) {
  const accountSid = TWILIO_ACCOUNT_SID;
  const authToken = TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn("[Twilio SOS] Twilio credentials missing in environment");
    return {
      success: false,
      error: "Twilio credentials not configured",
      skipped: true
    };
  }

  // Format the target phone number. Per instructions, send all test SMS to the verified phone number +917738122051
  const targetPhone = TWILIO_TEST_VERIFIED_NUMBER.replace(/\s+/g, "");
  const senderPhone = TWILIO_PHONE_NUMBER.replace(/\s+/g, "");

  const callerName = sosData.userName || "Citizen";
  const callerPhone = sosData.userPhone || "Not provided";
  const emergencyContact = sosData.emergencyNumber || "Not specified";
  const role = sosData.role || "Citizen";
  const address = sosData.address || "Live GPS Location";
  const lat = sosData.lat != null ? Number(sosData.lat).toFixed(4) : "19.1320";
  const lng = sosData.lng != null ? Number(sosData.lng).toFixed(4) : "72.8480";
  const sosId = sosData.id || `SOS-${Date.now().toString().slice(-4)}`;
  const team = sosData.assignedTeam || "Municipal Flood Rescue Fleet";
  const eta = sosData.eta || "4–6 min";

  // Format message: SOS requester, phone number, and location of the SOS button pressed
  const shortName = callerName.trim().slice(0, 20);
  const cleanPhone = (callerPhone || "").replace(/[^\d+]/g, "").slice(-13);
  const cleanAddress = (address || "Active Location").replace(/[\r\n]+/g, " ").trim().slice(0, 32);
  const cleanLat = Number(lat).toFixed(4);
  const cleanLng = Number(lng).toFixed(4);

  const messageBody = `VARSHARAKSHA SOS: ${shortName} (Ph: ${cleanPhone}). Location: ${cleanAddress} (GPS: ${cleanLat},${cleanLng}) https://maps.google.com/?q=${cleanLat},${cleanLng}`;

  try {
    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const bodyParams = new URLSearchParams({
      From: senderPhone,
      To: targetPhone,
      Body: messageBody
    });

    console.log(`[Twilio SOS] Sending SMS from ${senderPhone} to verified test number ${targetPhone} (Registered Emergency: ${emergencyContact})...`);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Twilio SOS Error]", data);
      return {
        success: false,
        error: data.message || `Twilio HTTP error ${res.status}`,
        code: data.code,
        targetPhone,
        registeredEmergencyNumber: emergencyContact
      };
    }

    console.log(`✅ [Twilio SOS] SMS successfully queued! SID: ${data.sid}, Status: ${data.status}`);
    return {
      success: true,
      sid: data.sid,
      status: data.status,
      from: senderPhone,
      to: targetPhone,
      registeredEmergencyNumber: emergencyContact,
      timestamp: data.date_created
    };
  } catch (err) {
    console.error("[Twilio SOS Network Error]", err);
    return {
      success: false,
      error: err.message,
      targetPhone,
      registeredEmergencyNumber: emergencyContact
    };
  }
}
