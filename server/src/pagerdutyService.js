import dotenv from "dotenv";
dotenv.config();

const PAGERDUTY_API_KEY = process.env.PAGERDUTY_API_KEY || "";
const PAGERDUTY_ROUTING_KEY = process.env.PAGERDUTY_ROUTING_KEY || "";
const PAGERDUTY_SERVICE_ID = process.env.PAGERDUTY_SERVICE_ID || "P9JO4HS";
const PAGERDUTY_ESCALATION_POLICY = process.env.PAGERDUTY_ESCALATION_POLICY || "PK0K5RX";
const NGO_EMERGENCY_NUMBER = process.env.NGO_EMERGENCY_NUMBER || "7977661625";
const PAGERDUTY_FROM_EMAIL = process.env.PAGERDUTY_FROM_EMAIL || "authority@varsharaksha.org";

/**
 * Trigger PagerDuty Emergency Incident & Call Notification
 * Dispatches high-urgency rescue escalation to NGO Coordinator (7977661625) & Police Dispatch
 */
export async function triggerPagerDutySos(sosData) {
  const dedupKey = `SOS-${sosData.id || Date.now()}`;
  const address = sosData.address || "Station Road, Mumbai";
  const lat = sosData.lat || 19.132;
  const lng = sosData.lng || 72.848;
  const callerName = sosData.userName || "Citizen / Shopkeeper";
  const callerRole = sosData.role || "Shop Owner";

  const results = {
    eventsApi: null,
    restApi: null,
    targetPhone: NGO_EMERGENCY_NUMBER,
    timestamp: new Date().toISOString()
  };

  // 1. Trigger PagerDuty Events API v2
  try {
    const eventsPayload = {
      routing_key: PAGERDUTY_ROUTING_KEY,
      event_action: "trigger",
      dedup_key: dedupKey,
      payload: {
        summary: `🚨 FLOOD SOS RESCUE DISPATCH: ${callerName} (${callerRole}) at ${address} - Call ${NGO_EMERGENCY_NUMBER}`,
        source: "VarshaRaksha Emergency Command",
        severity: "critical",
        component: "Municipal Flood Rescue Fleet",
        group: "Immediate Disaster Dispatch",
        custom_details: {
          sos_id: sosData.id,
          target_emergency_phone: NGO_EMERGENCY_NUMBER,
          caller_name: callerName,
          caller_role: callerRole,
          location: address,
          coordinates: `${lat}, ${lng}`,
          google_maps: `https://www.google.com/maps?q=${lat},${lng}`,
          assigned_team: sosData.assignedTeam || "Rapid Emergency Drainage Squad",
          eta: sosData.eta || "4–6 min"
        }
      }
    };

    const res = await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventsPayload)
    });

    if (res.ok) {
      const data = await res.json();
      results.eventsApi = { status: "success", data };
      console.log(`[PagerDuty] Events API v2 triggered successfully: dedup_key=${dedupKey}`);
    } else {
      const errText = await res.text();
      results.eventsApi = { status: "failed", error: errText };
      console.warn(`[PagerDuty] Events API v2 failed: ${errText}`);
    }
  } catch (err) {
    results.eventsApi = { status: "error", message: err.message };
    console.warn(`[PagerDuty] Events API error: ${err.message}`);
  }

  // 2. Trigger PagerDuty REST API Incident with Immediate Escalation Policy (Calls 7977661625)
  try {
    const incidentPayload = {
      incident: {
        type: "incident",
        title: `🚨 EMERGENCY FLOOD SOS: ${callerName} at ${address} (Dispatch to ${NGO_EMERGENCY_NUMBER})`,
        service: {
          id: PAGERDUTY_SERVICE_ID,
          type: "service_reference"
        },
        escalation_policy: {
          id: PAGERDUTY_ESCALATION_POLICY,
          type: "escalation_policy_reference"
        },
        urgency: "high",
        body: {
          type: "incident_body",
          details: `Immediate SOS rescue request triggered via VarshaRaksha mobile app.\n` +
            `• Caller: ${callerName} (${callerRole})\n` +
            `• Target Emergency Dispatch Number: ${NGO_EMERGENCY_NUMBER}\n` +
            `• Location: ${address} (${lat}, ${lng})\n` +
            `• Map Link: https://www.google.com/maps?q=${lat},${lng}\n` +
            `• Assigned Unit: ${sosData.assignedTeam || "Rapid Dewatering Squad"}`
        }
      }
    };

    const res = await fetch("https://api.pagerduty.com/incidents", {
      method: "POST",
      headers: {
        "Authorization": `Token token=${PAGERDUTY_API_KEY}`,
        "Accept": "application/vnd.pagerduty+json;version=2",
        "Content-Type": "application/json",
        "From": PAGERDUTY_FROM_EMAIL
      },
      body: JSON.stringify(incidentPayload)
    });

    if (res.ok) {
      const data = await res.json();
      results.restApi = { status: "success", incident: data.incident };
      console.log(`[PagerDuty] REST Incident created: ID=${data.incident?.id} (Calling ${NGO_EMERGENCY_NUMBER})`);
    } else {
      const errText = await res.text();
      results.restApi = { status: "failed", error: errText };
      console.warn(`[PagerDuty] REST Incident creation failed: ${errText}`);
    }
  } catch (err) {
    results.restApi = { status: "error", message: err.message };
    console.warn(`[PagerDuty] REST Incident error: ${err.message}`);
  }

  return results;
}
