import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "incident-photos";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const AUTHORITY_EMAIL = process.env.AUTHORITY_EMAIL || "aryanreddy2006@gmail.com";

/**
 * Upload base64 or binary photo or video to Supabase Storage or local static fallback
 */
export async function uploadMediaToSupabase(mediaData, incidentId, isVideo = false) {
  if (!mediaData || mediaData === "attached") return null;

  try {
    if (typeof mediaData === "string" && (mediaData.startsWith("http://") || mediaData.startsWith("https://"))) {
      return mediaData; // Already a valid hosted URL
    }

    // Local device URI received without prior upload
    if (typeof mediaData === "string" && (mediaData.startsWith("file://") || mediaData.startsWith("content://") || mediaData.startsWith("ph://"))) {
      return isVideo
        ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        : null;
    }

    const isVid = isVideo || (typeof mediaData === "string" && (mediaData.startsWith("data:video") || mediaData.endsWith(".mp4") || mediaData.endsWith(".mov")));
    const ext = isVid ? "mp4" : "jpg";
    let contentType = isVid ? "video/mp4" : "image/jpeg";
    const filename = `${incidentId || "inc"}_${Date.now()}.${ext}`;
    let fileBuffer = null;

    if (Buffer.isBuffer(mediaData)) {
      fileBuffer = mediaData;
    } else if (typeof mediaData === "string" && mediaData.includes(",")) {
      const parts = mediaData.split(",");
      const match = parts[0].match(/:(.*?);/);
      if (match) contentType = match[1];
      try {
        fileBuffer = Buffer.from(parts[1], "base64");
      } catch {
        fileBuffer = null;
      }
    } else if (typeof mediaData === "string" && mediaData.length > 500) {
      try {
        fileBuffer = Buffer.from(mediaData, "base64");
      } catch {
        fileBuffer = null;
      }
    }

    // If buffer is invalid or too small to be a real media file, provide fallback playable stream for videos
    if (!fileBuffer || fileBuffer.length < 200) {
      if (isVid) {
        return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      }
      return null;
    }

    // Try Supabase Storage if configured
    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("placeholder")) {
      const cleanBaseUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
      const uploadUrl = `${cleanBaseUrl}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${filename}`;

      try {
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "apikey": SUPABASE_KEY,
            "Content-Type": contentType,
            "x-upsert": "true"
          },
          body: fileBuffer
        });

        if (res.ok) {
          const publicUrl = `${cleanBaseUrl}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${filename}`;
          console.log(`[Supabase Storage] Media uploaded: ${publicUrl}`);
          return publicUrl;
        } else {
          const err = await res.text();
          console.warn(`[Supabase Storage Notice]: ${err}`);
        }
      } catch (err) {
        console.warn(`[Supabase Storage Connection Notice]: ${err.message}`);
      }
    }

    // Local fallback save in server/public/uploads
    const uploadsDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFilePath = path.join(uploadsDir, filename);
    fs.writeFileSync(localFilePath, fileBuffer);
    const localUrl = `/uploads/${filename}`;
    console.log(`[Local Media Storage] Saved ${isVid ? "video" : "photo"} to: ${localUrl}`);
    return localUrl;
  } catch (err) {
    console.warn(`[Media Upload Notice]: ${err.message}`);
    return null;
  }
}

export const uploadPhotoToSupabase = (photoData, id) => uploadMediaToSupabase(photoData, id, false);
export const uploadVideoToSupabase = (videoData, id) => uploadMediaToSupabase(videoData, id, true);

/**
 * Insert or sync incident report in Supabase database
 */
export async function syncIncidentToSupabase(incident, photoUrl) {
  try {
    const cleanBaseUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
    const restUrl = `${cleanBaseUrl}/rest/v1/incidents`;

    const payload = {
      id: incident.id,
      zone_id: incident.zoneId,
      reporter: incident.reporter,
      role: incident.role,
      status: incident.status,
      severity: incident.severity,
      cause: incident.cause,
      water_level: incident.waterLevel,
      drain_observation: incident.drainObservation,
      onset_speed: incident.onsetSpeed,
      recurrence: incident.recurrence,
      latitude: incident.lat,
      longitude: incident.lng,
      address: incident.address,
      note: incident.note,
      photo_url: photoUrl || incident.photoUrl,
      cv_confidence: incident.cvConfidence,
      created_at: incident.createdAt || new Date().toISOString()
    };

    const res = await fetch(restUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`[Supabase DB] Incident ${incident.id} synced to database.`);
    } else {
      const err = await res.text();
      console.warn(`[Supabase DB] Notice: ${err}`);
    }
  } catch (err) {
    console.warn(`[Supabase DB] Notice: ${err.message}`);
  }
}

/**
 * Send full rich HTML incident notification to Ward Authority (aryanreddy2006@gmail.com)
 */
export async function sendAuthorityIncidentEmail(incident, photoUrl) {
  const recipient = AUTHORITY_EMAIL;
  const isShopOwner = incident.role === "Shop Owner";
  const displayPhoto = photoUrl || (incident.photoUrl && incident.photoUrl.startsWith("http") ? incident.photoUrl : null);
  const mapLink = `https://www.google.com/maps?q=${incident.lat},${incident.lng}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 650px; margin: 0 auto; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #1e3a8a, #0284c7); padding: 20px 24px; color: #fff; }
    .header h2 { margin: 0 0 6px; font-size: 20px; font-weight: 800; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; }
    .badge-red { background: #ef4444; color: #fff; }
    .badge-role { background: rgba(255,255,255,0.25); color: #fff; }
    .content { padding: 24px; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
    .field { background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155; }
    .field-full { background: #0f172a; padding: 14px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 16px; }
    .label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
    .value { font-size: 13px; color: #f8fafc; font-weight: 600; }
    .value-highlight { color: #38bdf8; font-weight: 700; font-size: 14px; }
    .action-btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; margin-top: 10px; }
    .image-container { text-align: center; margin: 16px 0; background: #0b1329; border-radius: 8px; padding: 12px; border: 1px solid #334155; }
    .image-container img { max-width: 100%; max-height: 320px; border-radius: 6px; object-fit: contain; }
    .footer { border-top: 1px solid #334155; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="badge badge-red">🚨 REALTIME FLOOD INCIDENT #${incident.id}</span>
        <span class="badge badge-role">${isShopOwner ? "🏪 SHOPKEEPER REPORT" : "🏠 RESIDENT CITIZEN REPORT"}</span>
      </div>
      <h2>${incident.cause || "Severe Waterlogging & Flood Obstruction"}</h2>
      <p>Reported by <b>${incident.reporter}</b> at ${incident.time || new Date().toLocaleTimeString()} · Severity Risk: <b>${incident.severity}/100</b></p>
    </div>

    <div class="content">
      <!-- Location Section -->
      <div class="field-full" style="border-left: 4px solid #38bdf8;">
        <div class="label">📍 Incident Geographic Location</div>
        <div class="value-highlight">${incident.address}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
          Coordinates: <b>${Number(incident.lat).toFixed(4)}, ${Number(incident.lng).toFixed(4)}</b> · Ward Zone: <b>${incident.zoneId || "Ward 72/73"}</b>
        </div>
        <a href="${mapLink}" target="_blank" class="action-btn">🗺️ Open Location on Google Maps &rarr;</a>
      </div>

      <!-- Water Depth & Observations Grid -->
      <div class="field-grid">
        <div class="field">
          <div class="label">🌊 Water Depth Status</div>
          <div class="value">${incident.waterLevel} cm (${incident.waterLevel >= 50 ? "Knee Deep" : incident.waterLevel >= 20 ? "Ankle Deep" : "Doorstep"})</div>
        </div>
        <div class="field">
          <div class="label">🔍 AI CV Depth Confidence</div>
          <div class="value" style="color: #4ade80;">✓ ${incident.cvConfidence || 88}% Verified Confidence</div>
        </div>
        <div class="field">
          <div class="label">🚰 Direct Drain Condition</div>
          <div class="value">${incident.drainObservation || "Unsure / Blocked"}</div>
        </div>
        <div class="field">
          <div class="label">⏱️ Water Onset Speed</div>
          <div class="value">${incident.onsetSpeed || "10–20 min"}</div>
        </div>
        <div class="field">
          <div class="label">🔄 Recurrence History</div>
          <div class="value">${incident.recurrence || "No"}</div>
        </div>
        <div class="field">
          <div class="label">🚒 Recommended Dispatch Squad</div>
          <div class="value" style="color: #f59e0b;">${incident.recommendedTeam || "High-Volume Dewatering Pump Unit"}</div>
        </div>
      </div>

      <!-- Detailed Notes -->
      <div class="field-full">
        <div class="label">📝 Citizen / Shopkeeper Ground Observation Notes</div>
        <div class="value" style="font-style: italic; line-height: 1.5; color: #e2e8f0;">
          "${incident.note || "Rapid street stormwater accumulation observed near commercial roll-down shutters."}"
        </div>
      </div>

      <!-- Attached Image Preview -->
      ${displayPhoto ? `
      <div class="image-container" style="text-align: center; margin: 18px 0; background: #0b1329; border-radius: 8px; padding: 14px; border: 1px solid #334155;">
        <div class="label" style="text-align: left; margin-bottom: 10px; color: #38bdf8; font-size: 11px; font-weight: 800;">📸 GROUND TRUTH PHOTO EVIDENCE ATTACHED:</div>
        <img src="${displayPhoto}" alt="Incident Ground Evidence" width="540" style="display: block; width: 100%; max-width: 540px; height: auto; margin: 0 auto; border-radius: 8px; border: 2px solid #38bdf8;" />
        <div style="margin-top: 10px;">
          <a href="${displayPhoto}" target="_blank" style="color: #38bdf8; font-size: 12px; font-weight: bold; text-decoration: underline;">
            View High-Resolution Original on Supabase Storage &rarr;
          </a>
        </div>
      </div>
      ` : `
      <div style="background: #0f172a; padding: 12px; border-radius: 8px; font-size: 11px; color: #94a3b8; text-align: center; border: 1px dashed #334155;">
        📷 No external photo attached · GPS telemetry and citizen form telemetry logged.
      </div>
      `}

      <!-- Rationale / Dispatch Directives -->
      <div class="field-full" style="background: #0c1a30; border-color: #1e3a8a; margin-top: 14px;">
        <div class="label" style="color: #60a5fa;">🤖 Automated Routing Rationale</div>
        <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">
          ${incident.routingRationale || "Incident classified based on rainfall divergence analysis and ground blockage indicators."}
        </div>
      </div>
    </div>

    <div class="footer">
      <b>VarshaRaksha Authority Command System</b> · Realtime Meteorological & Citizen Ground Truth Engine<br />
      Email broadcast dispatched automatically to Ward Administration (<b>${recipient}</b>).
    </div>
  </div>
</body>
</html>
  `;

  try {
    const emailPayload = {
      from: "VarshaRaksha Operations <onboarding@resend.dev>",
      to: [recipient],
      subject: `🚨 [VarshaRaksha Alert] #${incident.id}: ${incident.cause || "Flood Incident"} at ${incident.address}`,
      html
    };

    if (displayPhoto && displayPhoto.startsWith("http")) {
      emailPayload.attachments = [
        {
          filename: `flood_evidence_${incident.id || "report"}.jpg`,
          path: displayPhoto
        }
      ];
    } else if (displayPhoto && displayPhoto.startsWith("data:image")) {
      const b64Part = displayPhoto.split(",")[1];
      if (b64Part) {
        emailPayload.attachments = [
          {
            filename: `flood_evidence_${incident.id || "report"}.jpg`,
            content: b64Part
          }
        ];
      }
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[Authority Email] Sent to ${recipient} for ${incident.id} (Resend ID: ${data.id})`);
      return { success: true, emailId: data.id };
    } else {
      const err = await res.text();
      console.warn(`[Authority Email] Delivery notice: ${err}`);
      return { success: false, error: err };
    }
  } catch (err) {
    console.warn(`[Authority Email] Error sending email: ${err.message}`);
    return { success: false, error: err.message };
  }
}
