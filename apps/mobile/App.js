import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

const BLUE = "#0A5FE7",
  NAVY = "#071A3A",
  SKY = "#EAF3FF",
  BG = "#F5F8FD",
  TEXT = "#12243F",
  MUTED = "#71819A",
  RED = "#E84848",
  ORANGE = "#F2A900",
  GREEN = "#12A56B";

// Safe fetch with timeout compatible with React Native Hermes/JSC
async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Detect developer machine IP automatically from Expo Metro bundler
function getDevServerIp() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || "";
  const ip = hostUri.split(":")[0];
  if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
    return ip;
  }
  return "192.168.29.32";
}

const DEFAULT_API = (() => {
  if (Platform.OS === "web") return "http://localhost:5001/api";
  const devIp = getDevServerIp();
  return `http://${devIp}:5001/api`;
})();

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API);
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState("Home");
  const [reportOpen, setReportOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Active zone (defaults to first zone or matched zone)
  const activeZone = zones[0] || {
    name: "Station Road",
    ward: "Ward 72",
    risk: 0,
    cause: "Normal drainage",
    rainfall: 0,
    waterLevel: 0,
    reports: 0
  };

  const fetchLiveData = async () => {
    try {
      const [zRes, aRes] = await Promise.all([
        fetchWithTimeout(`${apiUrl}/zones`),
        fetchWithTimeout(`${apiUrl}/alerts`)
      ]);
      if (zRes.ok) {
        const zData = await zRes.json();
        setZones(zData);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAlerts(aData);
      }
    } catch (err) {
      console.warn("Could not reach API:", apiUrl, err.message);
      // Fallback try: if on Android emulator and LAN IP failed, try 10.0.2.2 or vice-versa
      if (Platform.OS === "android" && !apiUrl.includes("10.0.2.2")) {
        const emuUrl = "http://10.0.2.2:5001/api";
        try {
          const [zRes, aRes] = await Promise.all([
            fetchWithTimeout(`${emuUrl}/zones`, {}, 4000),
            fetchWithTimeout(`${emuUrl}/alerts`, {}, 4000)
          ]);
          if (zRes.ok) {
            setApiUrl(emuUrl);
            setZones(await zRes.json());
          }
          if (aRes.ok) setAlerts(await aRes.json());
        } catch {}
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLiveData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 12000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  if (!role) return <RoleScreen onSelect={setRole} />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            Varsha<Text style={{ color: BLUE }}>Raksha</Text>
          </Text>
          <Text style={s.sub}>Real-time live flood intelligence</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.liveDot} />
          <Text style={s.live}>LIVE SENSORS</Text>
        </View>
      </View>

      {tab === "Home" && (
        <Home
          role={role}
          zone={activeZone}
          alerts={alerts}
          userAddress={userAddress}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onReport={() => setReportOpen(true)}
        />
      )}
      {tab === "Alerts" && <AlertsScreen alerts={alerts} zone={activeZone} onRefresh={onRefresh} refreshing={refreshing} />}
      {tab === "Report" && (
        <ReportScreen
          role={role}
          apiUrl={apiUrl}
          onClose={() => setTab("Home")}
          onSaved={(r) => {
            setReports([r, ...reports]);
            fetchLiveData();
            setTab("Home");
          }}
        />
      )}
      {tab === "Map" && <MapScreen zones={zones} userLoc={userLoc} />}
      {tab === "Profile" && (
        <ProfileScreen
          role={role}
          apiUrl={apiUrl}
          onUpdateApiUrl={(u) => {
            setApiUrl(u);
            fetchLiveData();
          }}
        />
      )}

      <View style={s.nav}>
        {[
          ["Home", "home"],
          ["Alerts", "notifications"],
          ["Report", "add-circle"],
          ["Map", "map"],
          ["Profile", "person"]
        ].map(([name, icon]) => (
          <TouchableOpacity key={name} style={s.navItem} onPress={() => setTab(name)}>
            <Ionicons name={icon} size={22} color={tab === name ? BLUE : "#8795A8"} />
            <Text style={[s.navText, tab === name && { color: BLUE }]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={reportOpen} transparent animationType="slide">
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Report waterlogging</Text>
            <Text style={s.modalSub}>
              Submit live ground truth with your GPS location & photo evidence. Real reports update municipal ward risks
              immediately.
            </Text>
            <TouchableOpacity
              style={s.primary}
              onPress={() => {
                setReportOpen(false);
                setTab("Report");
              }}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={s.primaryText}>Create real incident report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancel} onPress={() => setReportOpen(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function RoleScreen({ onSelect }) {
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: "#F4F8FF" }]}>
      <View style={s.roleTop}>
        <View style={s.logoCircle}>
          <MaterialCommunityIcons name="weather-pouring" size={31} color="#fff" />
        </View>
        <Text style={s.roleBrand}>
          Varsha<Text style={{ color: "#4AB9FF" }}>Raksha</Text>
        </Text>
        <Text style={s.roleTag}>Street-level real flood intelligence</Text>
      </View>
      <View style={s.roleCard}>
        <Text style={s.roleTitle}>How are you using the app?</Text>
        <Text style={s.roleSub}>Your role customizes the safety checklists and early warning signals.</Text>
        <TouchableOpacity style={s.roleBtn} onPress={() => onSelect("Resident")}>
          <View style={s.roleIcon}>
            <Ionicons name="home-outline" size={22} color={BLUE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.roleBtnTitle}>Resident</Text>
            <Text style={s.roleBtnSub}>Receive live alerts and report street flooding</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#A3B0C2" />
        </TouchableOpacity>
        <TouchableOpacity style={s.roleBtn} onPress={() => onSelect("Vendor")}>
          <View style={s.roleIcon}>
            <Ionicons name="storefront-outline" size={22} color={BLUE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.roleBtnTitle}>Shopkeeper / Vendor</Text>
            <Text style={s.roleBtnSub}>Protect inventory and monitor road accessibility</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#A3B0C2" />
        </TouchableOpacity>
        <View style={s.roleInfo}>
          <Ionicons name="shield-checkmark" size={17} color={BLUE} />
          <Text style={s.roleInfoText}>Location attaches directly to real incident reports for municipal action.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Home({ role, zone, alerts, userAddress, refreshing, onRefresh, onReport }) {
  const isRed = zone.risk >= 75;
  const isOrange = zone.risk >= 45 && zone.risk < 75;
  const statusColor = isRed ? RED : isOrange ? ORANGE : GREEN;
  const statusText = isRed ? "RED · TAKE ACTION" : isOrange ? "ORANGE · ELEVATED RISK" : "GREEN · NORMAL DRAINAGE";

  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={s.greeting}>
        <View>
          <Text style={s.hello}>Good afternoon 👋</Text>
          <Text style={s.area}>
            {userAddress ? userAddress : `${zone.name} · ${zone.ward}`}
          </Text>
        </View>
        <View style={s.avatar}>
          <Text style={{ color: BLUE, fontWeight: "800" }}>{role === "Vendor" ? "V" : "R"}</Text>
        </View>
      </View>

      <View style={s.riskCard}>
        <View style={s.riskTop}>
          <View>
            <Text style={s.cardLabel}>LIVE FLOOD RISK SCORE</Text>
            <Text style={s.riskRoad}>{zone.name}</Text>
          </View>
          <View style={[s.riskCircle, { borderColor: statusColor }]}>
            <Text style={s.riskNum}>{zone.risk}</Text>
            <Text style={s.riskOut}>/100</Text>
          </View>
        </View>
        <View style={s.riskStatus}>
          <View style={[s.riskDot, { backgroundColor: statusColor }]} />
          <Text style={{ color: statusColor, fontWeight: "800", fontSize: 11 }}>{statusText}</Text>
          <Text style={s.eta}>{zone.rainfall > 0 ? `${zone.rainfall}mm Open-Meteo` : "Direct Sensors"}</Text>
        </View>
        <View style={s.riskStats}>
          <Mini label="Live Rainfall" value={`${zone.rainfall ?? 0} mm`} />
          <Mini label="Ground Water" value={`${zone.waterLevel ?? 0} cm`} />
          <Mini label="Citizen Reports" value={`${zone.reports ?? 0}`} />
        </View>
      </View>

      <TouchableOpacity style={s.warning} onPress={onReport}>
        <View style={s.warningIcon}>
          <Ionicons name="camera" size={19} color={BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.warningTitle}>Submit live flood report</Text>
          <Text style={s.warningText}>Attach photo + GPS to update ward risk for everyone.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#8E9BAE" />
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Live Sensor Feeds</Text>
      <View style={s.signalGrid}>
        <Signal
          icon="rainy-outline"
          title="Open-Meteo Rain"
          value={`${zone.rainfall ?? 0} mm`}
          note="Live API"
          color="#2E8BEA"
        />
        <Signal
          icon="water-outline"
          title="Ground Depth"
          value={`${zone.waterLevel ?? 0} cm`}
          note={zone.waterLevel > 30 ? "High" : "Normal"}
          color={zone.waterLevel > 30 ? RED : GREEN}
        />
        <Signal
          icon="git-merge-outline"
          title="Drainage Cause"
          value={zone.cause || "Normal"}
          note="Engine Analysis"
          color={ORANGE}
        />
        <Signal
          icon="shield-checkmark-outline"
          title="Citizen Signals"
          value={`${zone.reports ?? 0} reports`}
          note="Verified"
          color={GREEN}
        />
      </View>

      {role === "Vendor" && (
        <View style={s.vendorCard}>
          <View>
            <Text style={s.vendorTitle}>Shop protection checklist</Text>
            <Text style={s.vendorText}>Move stock higher · protect power sockets · check shutters</Text>
          </View>
          <Ionicons name="checkmark-circle" size={25} color={GREEN} />
        </View>
      )}

      <Text style={s.sectionTitle}>Live Alerts ({alerts.length})</Text>
      {alerts.length === 0 ? (
        <View style={s.noAlertBox}>
          <Ionicons name="checkmark-circle-outline" size={22} color={GREEN} />
          <Text style={s.noAlertText}>All monitored areas are currently within safe thresholds.</Text>
        </View>
      ) : (
        alerts.map((a) => <AlertMini key={a.id} a={a} />)
      )}

      <Text style={s.sectionTitle}>Quick actions</Text>
      <View style={s.quick}>
        <Quick icon="camera" label="Report flood" onPress={onReport} />
        <Quick icon="navigate" label="Safe route" />
        <Quick icon="business" label="Shelters" />
        <Quick icon="call" label="Emergency" />
      </View>
    </ScrollView>
  );
}

function Mini({ label, value }) {
  return (
    <View>
      <Text style={s.miniLabel}>{label}</Text>
      <Text style={s.miniValue}>{value}</Text>
    </View>
  );
}

function Signal({ icon, title, value, note, color }) {
  return (
    <View style={s.signal}>
      <View style={[s.signalIcon, { backgroundColor: color + "16" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.signalTitle}>{title}</Text>
      <Text style={s.signalValue}>{value}</Text>
      <Text style={s.signalNote}>{note}</Text>
    </View>
  );
}

function AlertMini({ a }) {
  const c = a.level === "RED" ? RED : ORANGE;
  return (
    <View style={s.alertMini}>
      <View style={[s.alertLevel, { backgroundColor: c + "16" }]}>
        <Ionicons name="warning" size={16} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.alertTitle}>{a.title}</Text>
        <Text style={s.alertText}>{a.message}</Text>
        <Text style={s.alertTime}>
          {a.zoneName || a.zoneId} · ETA {a.eta}
        </Text>
      </View>
    </View>
  );
}

function Quick({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={s.quickItem} onPress={onPress}>
      <Ionicons name={icon} size={19} color={BLUE} />
      <Text style={s.quickItemText}>{label}</Text>
    </TouchableOpacity>
  );
}

function AlertsScreen({ alerts, zone, onRefresh, refreshing }) {
  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={s.screenTitle}>Live alerts</Text>
      <Text style={s.screenSub}>Real-time warnings from live rainfall and citizen evidence</Text>
      {alerts.length === 0 ? (
        <View style={s.noAlertBig}>
          <Ionicons name="shield-checkmark" size={36} color={GREEN} />
          <Text style={{ fontWeight: "800", marginTop: 8, color: TEXT }}>No active warnings</Text>
          <Text style={{ fontSize: 11, color: MUTED, textAlign: "center", marginTop: 4 }}>
            Monitored zones are below risk alert thresholds.
          </Text>
        </View>
      ) : (
        alerts.map((a) => (
          <View style={s.bigAlert} key={a.id}>
            <View style={s.bigAlertHead}>
              <View style={[s.alertPill, { backgroundColor: (a.level === "RED" ? RED : ORANGE) + "16" }]}>
                <Text style={{ color: a.level === "RED" ? RED : ORANGE, fontSize: 10, fontWeight: "800" }}>
                  {a.level}
                </Text>
              </View>
              <Text style={s.alertId}>{a.id}</Text>
            </View>
            <Text style={s.bigAlertTitle}>{a.title}</Text>
            <Text style={s.bigAlertText}>{a.message}</Text>
            <View style={s.bigAlertFoot}>
              <Text>📍 {a.zoneName || zone.name}</Text>
              <Text>⏱ {a.eta}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ReportScreen({ role, apiUrl, onSaved, onClose }) {
  const [note, setNote] = useState("");
  const [loc, setLoc] = useState(null);
  const [locAddress, setLocAddress] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [water, setWater] = useState("ankle");
  const [submitting, setSubmitting] = useState(false);

  const getLoc = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant location access to attach real coordinates.");
        return;
      }
      const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLoc(l.coords);

      // Call server reverse geocode
      try {
        const res = await fetchWithTimeout(`${apiUrl}/geocode?lat=${l.coords.latitude}&lng=${l.coords.longitude}`);
        if (res.ok) {
          const geo = await res.json();
          setLocAddress(geo.road ? `${geo.road}, ${geo.ward}` : geo.displayName);
        }
      } catch {
        setLocAddress(`${l.coords.latitude.toFixed(4)}, ${l.coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      Alert.alert("GPS Error", err.message);
    }
  };

  const pick = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.5
      });
      if (!r.canceled && r.assets?.[0]) {
        setPhotoUri(r.assets[0].uri);
      }
    } catch (err) {
      Alert.alert("Photo Error", err.message);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        role,
        waterLevel: water,
        note,
        photo: Boolean(photoUri),
        photoUrl: photoUri,
        lat: loc?.latitude ?? 19.132,
        lng: loc?.longitude ?? 72.848,
        address: locAddress || "Station Road, Ward 72"
      };

      const res = await fetchWithTimeout(`${apiUrl}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, 10000);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      Alert.alert("Report Received", `Your report was assigned ID: ${data.id}. Ward risk engine has updated.`, [
        {
          text: "OK",
          onPress: () => onSaved(data)
        }
      ]);
    } catch (err) {
      Alert.alert("Submission Failed", `Could not connect to API (${apiUrl}): ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 130 }}>
      <TouchableOpacity onPress={onClose} style={s.back}>
        <Ionicons name="arrow-back" size={20} />
        <Text style={{ marginLeft: 6, fontWeight: "600" }}>Back</Text>
      </TouchableOpacity>
      <Text style={s.screenTitle}>Report waterlogging</Text>
      <Text style={s.screenSub}>Real-time ground truth updates municipal dispatch and alert streams.</Text>
      <View style={s.reportCard}>
        <Text style={s.inputLabel}>1. Add photo evidence</Text>
        <TouchableOpacity style={s.photoBox} onPress={pick}>
          {photoUri ? (
            <>
              <Ionicons name="checkmark-circle" size={31} color={GREEN} />
              <Text style={s.photoDone}>Photo evidence attached</Text>
            </>
          ) : (
            <>
              <Ionicons name="camera-outline" size={29} color={BLUE} />
              <Text style={s.photoBoxText}>Take / Choose waterlogging photo</Text>
              <Text style={s.photoHint}>Used for computer vision verification</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.inputLabel}>2. Attach real GPS location</Text>
        <TouchableOpacity style={s.locationBtn} onPress={getLoc}>
          <Ionicons name={loc ? "checkmark-circle" : "location"} size={18} color={loc ? GREEN : BLUE} />
          <Text style={{ flex: 1, fontSize: 11 }}>
            {locAddress ? `GPS: ${locAddress}` : loc ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : "Tap to attach current GPS location"}
          </Text>
        </TouchableOpacity>

        <Text style={s.inputLabel}>3. Water depth on road</Text>
        <View style={s.choiceRow}>
          {["ankle", "knee", "waist"].map((x) => (
            <TouchableOpacity
              key={x}
              style={[s.choice, water === x && s.choiceOn]}
              onPress={() => setWater(x)}
            >
              <Text style={water === x ? { color: "#fff", fontWeight: "800" } : { fontSize: 12 }}>
                {x} ({x === "ankle" ? "15cm" : x === "knee" ? "45cm" : "90cm"})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.inputLabel}>4. Notes / drain status</Text>
        <TextInput
          style={s.textarea}
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="e.g. water rising near blocked drain or gutter..."
          placeholderTextColor="#9aa8b8"
        />

        <View style={s.reportPreview}>
          <MaterialCommunityIcons name="brain" size={20} color={BLUE} />
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitle}>Live Verification Engine</Text>
            <Text style={s.previewText}>
              Your report combines with Open-Meteo rainfall models to score flood probability.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={s.primaryWide} onPress={submit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={s.primaryText}>Submit real report to authority</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MapScreen({ zones, userLoc }) {
  return (
    <View style={s.mapScreen}>
      <Text style={s.screenTitle}>Risk map</Text>
      <Text style={s.screenSub}>Monitored zones with live rainfall & citizen reports</Text>
      <ScrollView style={{ flex: 1 }}>
        {zones.map((z) => {
          const isRed = z.risk >= 75;
          const isOrange = z.risk >= 45 && z.risk < 75;
          const color = isRed ? RED : isOrange ? ORANGE : GREEN;
          return (
            <View key={z.id} style={s.zoneCard}>
              <View style={[s.zoneCardDot, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.zoneCardName}>{z.name}</Text>
                <Text style={s.zoneCardMeta}>
                  {z.ward} · Rain: {z.rainfall ?? 0} mm · Water: {z.waterLevel ?? 0} cm
                </Text>
                <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Cause: {z.cause}</Text>
              </View>
              <View style={[s.zoneScoreBadge, { backgroundColor: color + "18" }]}>
                <Text style={{ color, fontWeight: "900", fontSize: 14 }}>{z.risk}</Text>
                <Text style={{ color, fontSize: 8 }}>/100</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProfileScreen({ role, apiUrl, onUpdateApiUrl }) {
  const [editingIp, setEditingIp] = useState(false);
  const [tempIp, setTempIp] = useState(apiUrl);

  return (
    <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 110 }}>
      <Text style={s.screenTitle}>Profile & settings</Text>
      <Text style={s.screenSub}>{role} account · Connected to live backend</Text>
      <View style={s.profileHero}>
        <View style={s.profileAvatar}>
          <Text style={{ color: BLUE, fontWeight: "800", fontSize: 20 }}>{role === "Vendor" ? "V" : "R"}</Text>
        </View>
        <View>
          <Text style={s.profileName}>{role === "Vendor" ? "Local Shopkeeper" : "Area Resident"}</Text>
          <Text style={s.profileArea}>Ward 72 · Active Sensor Region</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Backend API Connection</Text>
      <View style={s.settingCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingTitle}>API Endpoint</Text>
            <Text style={s.settingSub}>{apiUrl}</Text>
          </View>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditingIp(!editingIp)}>
            <Text style={{ color: BLUE, fontSize: 11, fontWeight: "700" }}>{editingIp ? "Close" : "Change IP"}</Text>
          </TouchableOpacity>
        </View>

        {editingIp && (
          <View style={{ marginTop: 12 }}>
            <TextInput
              style={s.ipInput}
              value={tempIp}
              onChangeText={setTempIp}
              placeholder="e.g. http://192.168.29.32:5001/api"
            />
            <TouchableOpacity
              style={s.saveIpBtn}
              onPress={() => {
                onUpdateApiUrl(tempIp);
                setEditingIp(false);
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>Save API URL</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={s.sectionTitle}>Alert preferences</Text>
      {[
        "Real-time GPS proximity alerts",
        "High-risk (Red) push notifications",
        "SMS emergency alerts",
        "WhatsApp notifications"
      ].map((x, i) => (
        <View style={s.settingRow} key={x}>
          <View>
            <Text style={s.settingTitle}>{x}</Text>
            <Text style={s.settingSub}>
              {i === 0
                ? "Uses real coordinates"
                : i === 1
                ? "Always enabled for severe floods"
                : "Active notification channel"}
            </Text>
          </View>
          <View style={s.switchOn}>
            <View style={s.switchKnob} />
          </View>
        </View>
      ))}

      <View style={s.confidence}>
        <Ionicons name="shield-checkmark" size={20} color={BLUE} />
        <Text style={{ flex: 1, fontSize: 10, color: "#63758f", lineHeight: 14 }}>
          VarshaRaksha combines Open-Meteo meteorological radar with real citizen ground truth to safeguard streets.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    height: 70,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E6ECF4"
  },
  brand: { fontSize: 21, fontWeight: "800", color: NAVY },
  sub: { fontSize: 9, color: MUTED, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: GREEN },
  live: { fontSize: 9, color: GREEN, fontWeight: "800" },
  body: { flex: 1, paddingHorizontal: 17 },
  greeting: { paddingVertical: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hello: { fontSize: 17, fontWeight: "800", color: TEXT },
  area: { fontSize: 10, color: MUTED, marginTop: 4 },
  avatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  riskCard: { backgroundColor: NAVY, borderRadius: 20, padding: 18, elevation: 5 },
  riskTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontSize: 9, color: "#8fa8d0", fontWeight: "800", letterSpacing: 1 },
  riskRoad: { fontSize: 18, color: "#fff", fontWeight: "800", marginTop: 5 },
  riskCircle: {
    width: 70,
    height: 70,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d2a58"
  },
  riskNum: { fontSize: 25, color: "#fff", fontWeight: "900" },
  riskOut: { fontSize: 8, color: "#9db4d7", marginTop: -2 },
  riskStatus: { marginTop: 17, flexDirection: "row", alignItems: "center", gap: 6 },
  riskDot: { width: 7, height: 7, borderRadius: 7 },
  eta: { marginLeft: "auto", fontSize: 9, color: "#B5C6E2" },
  riskStats: {
    borderTopWidth: 1,
    borderTopColor: "#1e3b69",
    marginTop: 15,
    paddingTop: 13,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  miniLabel: { fontSize: 8, color: "#8fa8d0" },
  miniValue: { fontSize: 12, color: "#fff", fontWeight: "800", marginTop: 3 },
  warning: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 13,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: "#E2EAF5"
  },
  warningIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  warningTitle: { fontSize: 11, fontWeight: "800", color: TEXT },
  warningText: { fontSize: 9, color: MUTED, marginTop: 3 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: TEXT, marginTop: 20, marginBottom: 9 },
  signalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  signal: { width: "48%", backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5EBF4" },
  signalIcon: { width: 31, height: 31, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 7 },
  signalTitle: { fontSize: 9, color: MUTED },
  signalValue: { fontSize: 13, fontWeight: "800", color: TEXT, marginTop: 3 },
  signalNote: { fontSize: 8, color: MUTED, marginTop: 2 },
  vendorCard: {
    marginTop: 13,
    backgroundColor: "#ECF9F4",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  vendorTitle: { fontSize: 11, fontWeight: "800", color: "#147D59" },
  vendorText: { fontSize: 9, color: "#4A7D6B", marginTop: 3, maxWidth: 280 },
  alertMini: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5EBF4",
    marginBottom: 8
  },
  alertLevel: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  alertTitle: { fontSize: 10, fontWeight: "800", color: TEXT },
  alertText: { fontSize: 9, color: MUTED, lineHeight: 13, marginTop: 2 },
  alertTime: { fontSize: 8, color: "#9AA7B7", marginTop: 5 },
  noAlertBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5EBF4",
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  noAlertText: { fontSize: 10, color: MUTED, flex: 1 },
  noAlertBig: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 35,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5EBF4",
    marginTop: 10
  },
  quick: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  quickItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#E5EBF4"
  },
  quickItemText: { fontSize: 8, color: TEXT },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 75,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5EBF4",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9
  },
  navItem: { alignItems: "center", gap: 3, width: 65 },
  navText: { fontSize: 8, color: "#8795A8" },
  modalBack: { flex: 1, justifyContent: "flex-end", backgroundColor: "#06162d88" },
  modal: { backgroundColor: "#fff", padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: "900", color: TEXT },
  modalSub: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 6, marginBottom: 18 },
  primary: { backgroundColor: BLUE, borderRadius: 12, height: 47, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  cancel: { height: 45, alignItems: "center", justifyContent: "center" },
  roleTop: { alignItems: "center", paddingTop: 70, paddingBottom: 25 },
  logoCircle: { width: 72, height: 72, borderRadius: 24, backgroundColor: BLUE, alignItems: "center", justifyContent: "center", elevation: 7 },
  roleBrand: { fontSize: 31, fontWeight: "900", color: NAVY, marginTop: 17 },
  roleTag: { fontSize: 11, color: MUTED, marginTop: 5 },
  roleCard: { backgroundColor: "#fff", marginHorizontal: 18, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: "#E2EAF5" },
  roleTitle: { fontSize: 18, fontWeight: "900", color: TEXT },
  roleSub: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 5, marginBottom: 14 },
  roleBtn: { borderWidth: 1, borderColor: "#E4EBF4", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 10 },
  roleIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  roleBtnTitle: { fontSize: 11, fontWeight: "800", color: TEXT },
  roleBtnSub: { fontSize: 9, color: MUTED, marginTop: 3 },
  roleInfo: { backgroundColor: "#F1F6FD", padding: 10, borderRadius: 11, flexDirection: "row", gap: 7, alignItems: "center" },
  roleInfoText: { fontSize: 8, color: "#647793", flex: 1, lineHeight: 12 },
  screenTitle: { fontSize: 21, fontWeight: "900", color: TEXT, marginTop: 20 },
  screenSub: { fontSize: 10, color: MUTED, marginTop: 4, marginBottom: 16 },
  bigAlert: { backgroundColor: "#fff", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: "#E5EBF4", marginBottom: 10 },
  bigAlertHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  alertId: { fontSize: 8, color: "#9AA7B7" },
  bigAlertTitle: { fontSize: 13, fontWeight: "900", marginTop: 12, color: TEXT },
  bigAlertText: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 5 },
  bigAlertFoot: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#EDF1F6", flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: MUTED },
  back: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  reportCard: { backgroundColor: "#fff", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#E5EBF4" },
  inputLabel: { fontSize: 10, fontWeight: "800", color: TEXT, marginTop: 10, marginBottom: 8 },
  photoBox: { height: 140, borderRadius: 14, borderWidth: 1.5, borderColor: "#C9D8EC", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F8FBFF" },
  photoBoxText: { fontSize: 10, color: TEXT, fontWeight: "600" },
  photoHint: { fontSize: 8, color: MUTED },
  photoDone: { fontSize: 11, color: GREEN, fontWeight: "800" },
  locationBtn: { height: 45, borderRadius: 11, borderWidth: 1, borderColor: "#DCE6F3", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: "#DCE6F3", alignItems: "center", justifyContent: "center" },
  choiceOn: { backgroundColor: BLUE, borderColor: BLUE },
  textarea: { height: 85, borderRadius: 11, borderWidth: 1, borderColor: "#DCE6F3", padding: 11, textAlignVertical: "top", fontSize: 11, color: TEXT },
  reportPreview: { marginTop: 12, backgroundColor: "#EEF5FF", borderRadius: 12, padding: 11, flexDirection: "row", gap: 9 },
  previewTitle: { fontSize: 10, fontWeight: "800", color: BLUE },
  previewText: { fontSize: 8, color: "#61748E", lineHeight: 12, marginTop: 2 },
  primaryWide: { height: 48, backgroundColor: BLUE, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, marginTop: 16 },
  mapScreen: { flex: 1, paddingHorizontal: 17 },
  zoneCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5EBF4",
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  zoneCardDot: { width: 10, height: 10, borderRadius: 10 },
  zoneCardName: { fontSize: 12, fontWeight: "800", color: TEXT },
  zoneCardMeta: { fontSize: 9, color: MUTED, marginTop: 3 },
  zoneScoreBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  profileHero: { backgroundColor: "#fff", borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E5EBF4" },
  profileAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 13, fontWeight: "800", color: TEXT },
  profileArea: { fontSize: 9, color: MUTED, marginTop: 3 },
  settingCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E5EBF4" },
  settingRow: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#EDF1F5", paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingTitle: { fontSize: 11, fontWeight: "800", color: TEXT },
  settingSub: { fontSize: 8, color: MUTED, marginTop: 3 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: SKY },
  ipInput: { height: 40, borderWidth: 1, borderColor: "#DCE6F3", borderRadius: 9, paddingHorizontal: 10, fontSize: 11, color: TEXT, marginBottom: 8 },
  saveIpBtn: { height: 36, backgroundColor: BLUE, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  switchOn: { width: 35, height: 20, borderRadius: 20, backgroundColor: BLUE, padding: 3 },
  switchKnob: { width: 14, height: 14, borderRadius: 14, backgroundColor: "#fff", marginLeft: 15 },
  confidence: { marginTop: 15, backgroundColor: "#EEF5FF", padding: 11, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center" }
});
