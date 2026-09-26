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

// Default targets as requested: Twilio message on 7738122051, SOS call on 7738122051
const TWILIO_SMS_RECIPIENT = process.env.TWILIO_SMS_RECIPIENT || process.env.TWILIO_TEST_VERIFIED_NUMBER || "+917738122051";
const TWILIO_CALL_RECIPIENT = process.env.TWILIO_CALL_RECIPIENT || "+917738122051";

/**
 * Format phone number to international E.164 format (+91XXXXXXXXXX)
 */
function formatPhone(phone, defaultFallback) {
  if (!phone || typeof phone !== "string") return defaultFallback;
  const cleaned = phone.trim().replace(/\s+/g, "");
  if (!cleaned) return defaultFallback;
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (cleaned.startsWith("+")) return cleaned;
  return digits ? `+${digits}` : defaultFallback;
}

/**
 * Dispatch an Emergency SOS SMS via Twilio API
 * Always sends alert directly to responder phone +917738122051 with login form details
 * @param {Object} sosData SOS details from mobile app
 * @returns {Promise<Object>} Result of Twilio dispatch
 */
export async function sendSosSms(sosData = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || TWILIO_AUTH_TOKEN;
  const senderPhone = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER).replace(/\s+/g, "");

  if (!accountSid || !authToken) {
    console.warn("[Twilio SOS SMS] Twilio credentials missing in environment");
    return {
      success: false,
      error: "Twilio credentials not configured",
      skipped: true
    };
  }

  // Guaranteed destination: Always deliver to responder number +917738122051
  const targetPhone = "+917738122051";

  // Extract user info and emergency contact provided in login form
  const callerName = sosData.userName || sosData.user_name || sosData.reporter || sosData.name || "Citizen";
  const callerPhone = sosData.userPhone || sosData.user_phone || sosData.phone || "Not specified";
  const rawEmergency = sosData.emergencyNumber || sosData.emergency_number || sosData.emergencyPhone || sosData.emergency_phone || "7738122051";
  const emergencyContact = formatPhone(rawEmergency, "+917738122051");
  const role = sosData.role || "Citizen";
  const address = sosData.address || sosData.location || "Powai, Mumbai";
  const lat = sosData.lat != null ? Number(sosData.lat).toFixed(4) : (sosData.latitude != null ? Number(sosData.latitude).toFixed(4) : "19.1044");
  const lng = sosData.lng != null ? Number(sosData.lng).toFixed(4) : (sosData.longitude != null ? Number(sosData.longitude).toFixed(4) : "72.8974");
  const sosId = sosData.id || sosData.sos_id || `SOS-${Date.now().toString().slice(-4)}`;
  const team = sosData.assignedTeam || sosData.assigned_team || "Municipal Flood Rescue Fleet";

  // Clean data fields for single-segment standard SMS (under 160 characters)
  const cleanName = String(callerName).trim().slice(0, 25);
  const cleanUserPhone = String(callerPhone).replace(/[^\d+]/g, "").slice(-13) || "N/A";
  const cleanEmergency = String(rawEmergency).replace(/[^\d+]/g, "").slice(-13) || "7738122051";
  const cleanLat = Number(lat).toFixed(4);
  const cleanLng = Number(lng).toFixed(4);

  // Exact single-segment message containing login form user info, emergency contact, and Google Maps location
  const messageBody = `VarshaRaksha SOS Alert\nUser: ${cleanName} (${cleanUserPhone})\nEmergency Contact: ${cleanEmergency}\nLocation: https://maps.google.com/?q=${cleanLat},${cleanLng}`;

  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const sendToNumber = async (recipient) => {
    const bodyParams = new URLSearchParams({
      From: senderPhone,
      To: recipient,
      Body: messageBody
    });

    console.log(`[Twilio SOS] Sending SMS from ${senderPhone} to recipient ${recipient} (User: ${cleanName} · Phone: ${cleanUserPhone} · Emergency No: ${cleanEmergency})...`);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: bodyParams.toString(),
          signal: AbortSignal.timeout(6000)
        });

        const data = await res.json();

        if (!res.ok) {
          console.error(`[Twilio SOS SMS Error for ${recipient}]`, data);
          return {
            success: false,
            error: data.message || `Twilio HTTP error ${res.status}`,
            code: data.code,
            targetPhone: recipient,
            registeredEmergencyNumber: cleanEmergency
          };
        }

        console.log(`✅ [Twilio SOS] SMS successfully queued! SID: ${data.sid}, To: ${recipient}, Status: ${data.status}`);
        return {
          success: true,
          sid: data.sid,
          status: data.status,
          from: senderPhone,
          to: recipient,
          registeredEmergencyNumber: cleanEmergency,
          timestamp: data.date_created
        };
      } catch (err) {
        if (attempt === 2) {
          console.error(`[Twilio SOS SMS Network Error for ${recipient}]`, err);
          return {
            success: false,
            error: err.message,
            targetPhone: recipient,
            registeredEmergencyNumber: cleanEmergency
          };
        }
      }
    }
  };

  return await sendToNumber(targetPhone);
}

/**
 * Dispatch an Emergency SOS Voice Call via Twilio API
 * Always calls responder number +917738122051 with user info from login form
 * @param {Object} sosData SOS details from mobile app
 * @returns {Promise<Object>} Result of Twilio call dispatch
 */
export async function sendSosCall(sosData = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || TWILIO_AUTH_TOKEN;
  const senderPhone = (process.env.TWILIO_PHONE_NUMBER || TWILIO_PHONE_NUMBER).replace(/\s+/g, "");

  if (!accountSid || !authToken) {
    console.warn("[Twilio SOS Call] Twilio credentials missing in environment");
    return {
      success: false,
      error: "Twilio credentials not configured",
      skipped: true
    };
  }

  // Always call +917738122051
  const targetPhone = "+917738122051";

  const callerName = sosData.userName || sosData.user_name || sosData.reporter || sosData.name || "Citizen";
  const callerPhone = sosData.userPhone || sosData.user_phone || sosData.phone || "Not specified";
  const rawEmergency = sosData.emergencyNumber || sosData.emergency_number || sosData.emergencyPhone || "7738122051";
  const address = sosData.address || sosData.location || "Powai, Mumbai";
  const lat = sosData.lat != null ? Number(sosData.lat).toFixed(4) : (sosData.latitude != null ? Number(sosData.latitude).toFixed(4) : "19.1044");
  const lng = sosData.lng != null ? Number(sosData.lng).toFixed(4) : (sosData.longitude != null ? Number(sosData.longitude).toFixed(4) : "72.8974");
  const team = sosData.assignedTeam || sosData.assigned_team || "Municipal Flood Rescue Squad";

  const cleanAddress = String(address || "Powai, Mumbai").replace(/[\r\n]+/g, " ").trim().slice(0, 40);
  const cleanName = String(callerName).trim().slice(0, 30);
  const cleanPhone = String(callerPhone).replace(/[^\d+]/g, "").slice(-13) || "Not provided";
  const cleanEmergency = String(rawEmergency).replace(/[^\d+]/g, "").slice(-13) || "7738122051";

  // TwiML payload to speak automated voice alert when recipient answers
  const twimlMessage = `<Response><Say voice="alice" language="en-IN">Emergency Flood SOS Alert from VarshaRaksha. Citizen ${cleanName}, phone number ${cleanPhone}, emergency contact number ${cleanEmergency}, has triggered an urgent distress signal at ${cleanAddress}. Immediate rescue team ${team} has been dispatched. Coordinates: latitude ${lat}, longitude ${lng}. Please check SMS for live Google Maps link.</Say></Response>`;

  try {
    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const bodyParams = new URLSearchParams({
      From: senderPhone,
      To: targetPhone,
      Twiml: twimlMessage
    });

    console.log(`[Twilio SOS] Placing Voice Call from ${senderPhone} to emergency responder ${targetPhone} (Caller: ${cleanName} · Phone: ${cleanPhone} · Emergency No: ${cleanEmergency})...`);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Twilio SOS Call Error]", data);
      return {
        success: false,
        error: data.message || `Twilio HTTP error ${res.status}`,
        code: data.code,
        targetPhone
      };
    }

    console.log(`✅ [Twilio SOS] Voice Call initiated! SID: ${data.sid}, To: ${targetPhone}, Status: ${data.status}`);
    return {
      success: true,
      sid: data.sid,
      status: data.status,
      from: senderPhone,
      to: targetPhone,
      timestamp: data.date_created
    };
  } catch (err) {
    console.error("[Twilio SOS Call Network Error]", err);
    return {
      success: false,
      error: err.message,
      targetPhone
    };
  }
}

/**
 * Dispatch both Twilio SMS (to 7738122051) and Twilio Voice Call (to 7738122051) concurrently
 */
export async function dispatchTwilioSos(sosData = {}) {
  const [smsResult, callResult] = await Promise.allSettled([
    sendSosSms(sosData),
    sendSosCall(sosData)
  ]);

  return {
    sms: smsResult.status === "fulfilled" ? smsResult.value : { success: false, error: smsResult.reason?.message },
    call: callResult.status === "fulfilled" ? callResult.value : { success: false, error: callResult.reason?.message }
  };
}
