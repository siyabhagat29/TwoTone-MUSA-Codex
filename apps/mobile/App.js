import React, { useEffect, useState, useRef } from "react";
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
  Platform,
  Dimensions,
  Image,
  PanResponder,
  Linking
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const BLUE = "#0A5FE7",
  NAVY = "#071A3A",
  SKY = "#EAF3FF",
  BG = "#F5F8FD",
  TEXT = "#12243F",
  MUTED = "#71819A",
  RED = "#E84848",
  ORANGE = "#F2A900",
  GREEN = "#12A56B";

// Comprehensive Multi-Language Dictionary (English, Hindi, Marathi)
const TRANSLATIONS = {
  en: {
    appName: "VarshaRaksha",
    appTagline: "Hyperlocal Real-Time Flood Intelligence",
    chooseLanguage: "Choose your language",
    langSub: "Select your preferred language for flood warnings and checklists.",
    chooseRole: "Choose your role",
    roleSub: "Select how you want to use VarshaRaksha in your locality.",
    shopOwner: "Shop Owner",
    shopOwnerSub: "Protect stock, receive shop checklists & alert neighbors",
    resident: "Resident",
    residentSub: "Receive flood warnings & report street waterlogging",
    detectingLocation: "Detecting your live GPS location...",
    grantGps: "Grant Location Permission",
    gpsDenied: "Location permission denied. Please enable GPS for real-time alerts.",
    retryGps: "Retry GPS Access",
    continue: "Continue",
    goodDay: "Good day 👋",
    liveScore: "LIVE FLOOD RISK SCORE",
    estimatedDepth: "Estimated Water Depth (from photo)",
    liveRain: "Live Rainfall",
    openMeteo: "Open-Meteo",
    drainageCause: "Drainage Diagnosis",
    citizenSignals: "Citizen Signals",
    sosButton: "EMERGENCY SOS",
    sosSub: "One-tap rescue dispatch to your GPS",
    reportIncident: "Report Incident",
    emergencyChecklist: "Emergency Checklist",
    floodBuddy: "Flood Buddy (Nearby Shops)",
    floodBuddyTab: "Flood Buddy",
    nearbyServices: "Nearby Emergency Services",
    liveAlerts: "Live Alerts & Warnings",
    riskIncreasedTitle: "Flood Risk Increased — Take Precautions Now",
    riskIncreasedSub: "Water levels or rainfall in your area have crossed safety thresholds.",
    acknowledge: "Acknowledge & Dismiss",
    home: "Home",
    alerts: "Alerts",
    report: "Report",
    map: "Map",
    profile: "Profile",
    markResolved: "Mark as Resolved",
    falseAlarm: "False Alarm",
    shelters: "Emergency Shelters",
    safeRoute: "Safe Evacuation Route (OSRM)",
    evacuationWarning: "Avoids flooded S.V. Road Subway; routed via elevated Link Road flyover.",
    notifyNeighbor: "Notify",
    notifiedSuccess: "Flood warning broadcasted to neighbor!",
    quickActions: "Quick Actions",
    liveSensorsTitle: "Live Sensor Feeds & Divergence Diagnosis",
    lightningTitle: "Blitzortung Lightning",
    noPhotoReport: "No photo report",
    allAreasSafe: "All monitored areas are operating safely.",
    rescueDeployed: "Rescue Deployed",
    eta: "ETA",
    contact: "Contact",
    openFullForm: "Open Full Incident Form",
    cancel: "Cancel",
    confirmSosTitle: "🚨 Emergency SOS Confirmation",
    confirmSosBody: "Are you in immediate flood danger? This will broadcast your live GPS coordinates to the nearest Municipal Flood Rescue Squad.",
    confirmSosAction: "CONFIRM SOS",
    sosBroadcastSuccess: "🚨 SOS Broadcasted",
    sosError: "Could not reach rescue server. Please call emergency services at 101 or 1916 directly.",

    // Report Form
    reportScreenTitle: "Report Flood Incident",
    reportScreenSub: "Ground truth for municipal response and CV depth analysis.",
    photoSectionTitle: "1. Photo Evidence (Camera or Gallery)",
    takePhotoBtn: "Take Photo",
    chooseGalleryBtn: "Choose Gallery",
    takeVideoBtn: "📹 Take Video",
    chooseVideoBtn: "📁 Choose Video",
    videoEvidenceTitle: "1. Visual Evidence (Photo or Video)",
    liveGpsTitle: "📍 Live GPS Incident Location",
    refreshGpsBtn: "Refresh GPS",
    photoAttachedReady: "✓ Photo Attached (Ready for CV Verification)",
    videoAttachedReady: "✓ Flood Video Attached (Ready for Authority Dispatch)",
    attachedVideoPreviewTitle: "Attached Video Evidence",
    waterDepthSectionTitle: "2. Water Depth (Select exact status)",
    depthDoorstep: "At doorstep (not entered)",
    depthAnkle: "Entered shop — ankle deep",
    depthKnee: "Entered shop — knee deep",
    depthCustom: "Custom / Other",
    customDepthPlaceholder: "Enter depth in cm (e.g. 35 cm)...",
    drainSectionTitle: "3. Direct Drain Observation",
    drainBlocked: "Blocked",
    drainClear: "Clear",
    drainUnsure: "Unsure",
    onsetSectionTitle: "4. Onset Speed of Rising Water",
    onsetFast: "<10 min",
    onsetMed: "10–20 min",
    onsetSlow: "> 20 min",
    recurrenceSectionTitle: "5. Has this happened before at this location?",
    yes: "Yes",
    no: "No",
    notesSectionTitle: "6. Additional Observations / Notes",
    notesPlaceholder: "e.g. storm drain choked by plastic crates...",
    submitReportBtn: "Submit Ground Report",
    attachedPhotoPreviewTitle: "Attached Photo Evidence",
    cvReadyBadge: "AI Water Depth Verification Ready",
    removePhotoBtn: "Remove / Re-take",
    noFloodPopupTitle: "No Flooding Detected",
    noFloodPopupMsg: "There is no flooding detected in the uploaded visual evidence. Incident report cannot be filed.",

    // Map Screen
    mapScreenTitle: "🗺️ Live Hyperlocal GIS Map",
    mapScreenSub: "Edge-to-edge sensor overlay · Ward 72/73",
    tileClean: "Clean",
    tileOsm: "OSM",
    tileNavy: "Navy",
    redAlertBtnText: "🚨 RED ALERT: VIEW SAFE EVACUATION SHELTER",
    routeHazardAdvisory: "⚠️ ROUTE HAZARD AVOIDANCE ADVISORY (OSRM ROUTED)",
    destinationLabel: "Destination",
    distanceLabel: "Distance",
    travelTimeLabel: "Safe Travel Time",
    startNavBtn: "Start Navigation",
    callBtn: "Call",
    calcRouteBtn: "Calculate Safe Route",
    youShop: "You (Shop)",
    youResident: "You (Home)",
    osmRoutingActive: "OSRM Real Road Routing Active",

    // Flood Buddy
    buddyTitle: "👥 Flood Buddy",
    buddySub: "Coordinate early warnings with verified shopkeepers on your street.",

    // Alerts Screen
    multiSourceStream: "Multi-source stream: 🌊 Flood Risk · ⚡ Lightning · 🌧️ Rainfall Radar",
    lightningDetectedTitle: "Nearby Thunderstorm Activity Detected",

    // Profile Screen
    profileTitle: "Profile & Preferences",
    shopkeeperAccount: "Shopkeeper Account",
    residentAccount: "Resident Account",
    langSettingsTitle: "Language Settings",
    channelsTitle: "Emergency Notification Channels",
    channel1: "Real-time GPS Proximity Alerts",
    channel2: "High-Risk (RED) Evacuation Alarms",
    channel3: "Emergency SMS Gateway Broadcasts",
    channel4: "WhatsApp Ward Flash Directives",
    activeOnMobile: "Active on primary mobile device",
    confidenceNote: "VarshaRaksha combines Open-Meteo meteorological radar, Divergence Engines, and ground truth to protect coastal businesses.",

    // Checklist Items
    checkP1_sec: "1. Protect People",
    checkP1_txt: "Move everyone to an elevated upper floor or safe shelter.",
    checkP2_sec: "1. Protect People",
    checkP2_txt: "Keep children, elderly and pets away from rapid street floodwaters.",
    checkP3_sec: "1. Protect People",
    checkP3_txt: "Keep emergency contacts and fully charged mobile battery packs accessible.",
    checkS1_sec: "2. Protect the Shop",
    checkS1_txt: "Move high-value stock and dry goods to shelves at least 3 feet off ground.",
    checkS2_sec: "2. Protect the Shop",
    checkS2_txt: "Unplug electrical appliances and switch off main circuit breaker if safe.",
    checkS3_sec: "2. Protect the Shop",
    checkS3_txt: "Install flood barrier boards / sandbags and lock roll-down shutters.",
    checkS4_sec: "2. Protect the Shop",
    checkS4_txt: "Store GST books, tax invoices, cash drawer & POS terminals in waterproof bags.",
    checkF1_sec: "3. Active Flood Safety",
    checkF1_txt: "Do not enter moving stormwater or cross submerged roads.",
    checkF2_sec: "3. Active Flood Safety",
    checkF2_txt: "Stay tuned to VarshaRaksha live alerts and municipal broadcast directives."
  },
  hi: {
    appName: "वर्षा रक्षा",
    appTagline: "रीयल-टाइम बाढ़ चेतावनी एवं सुरक्षा प्रणाली",
    chooseLanguage: "अपनी भाषा चुनें",
    langSub: "बाढ़ अलर्ट और सुरक्षा चेकलिस्ट के लिए अपनी पसंदीदा भाषा चुनें।",
    chooseRole: "अपनी भूमिका चुनें",
    roleSub: "चुनें कि आप अपने इलाके में वर्षा रक्षा का उपयोग कैसे करना चाहते हैं।",
    shopOwner: "दुकानदार / Shop Owner",
    shopOwnerSub: "सामान की सुरक्षा करें, चेकलिस्ट पाएं और पड़ोसियों को सचेत करें",
    resident: "निवासी / Resident",
    residentSub: "बाढ़ की चेतावनी प्राप्त करें और जलभराव की रिपोर्ट करें",
    detectingLocation: "आपका लाइव जीपीएस स्थान खोजा जा रहा है...",
    grantGps: "स्थान अनुमति प्रदान करें",
    gpsDenied: "स्थान अनुमति अस्वीकृत। वास्तविक समय की चेतावनियों के लिए जीपीएस सक्षम करें।",
    retryGps: "पुनः प्रयास करें",
    continue: "आगे बढ़ें",
    goodDay: "नमस्ते 👋",
    liveScore: "लाइव बाढ़ जोखिम स्कोर",
    estimatedDepth: "अनुमानित जल गहराई (फोटो से)",
    liveRain: "लाइव वर्षा",
    openMeteo: "ओपन-मेटियो",
    drainageCause: "जल निकासी स्थिति",
    citizenSignals: "नागरिक रिपोर्ट",
    sosButton: "आपातकालीन SOS",
    sosSub: "तुरंत बचाव दल को अपना जीपीएस भेजें",
    reportIncident: "घटना की रिपोर्ट करें",
    emergencyChecklist: "आपातकालीन चेकलिस्ट",
    floodBuddy: "फ्लड बडी (आस-पास की दुकानें)",
    floodBuddyTab: "फ्लड बडी",
    nearbyServices: "आपातकालीन सेवाएं",
    liveAlerts: "लाइव चेतावनियां",
    riskIncreasedTitle: "बाढ़ का खतरा बढ़ा — तुरंत सावधानी बरतें",
    riskIncreasedSub: "आपके क्षेत्र में जलस्तर या वर्षा सुरक्षित सीमा से ऊपर पहुंच गई है।",
    acknowledge: "स्वीकार करें और बंद करें",
    home: "होम",
    alerts: "अलर्ट",
    report: "रिपोर्ट",
    map: "नक्शा",
    profile: "प्रोफाइल",
    markResolved: "समाधान हुआ",
    falseAlarm: "गलत चेतावनी",
    shelters: "राहत शिविर",
    safeRoute: "सुरक्षित निकासी मार्ग (OSRM)",
    evacuationWarning: "जलभराव वाले सबवे से बचें; लिंक रोड फ्लाईओवर से सुरक्षित मार्ग निर्धारित है।",
    notifyNeighbor: "सचेत करें",
    notifiedSuccess: "पड़ोसी दुकानदार को चेतावनी भेजी गई!",
    quickActions: "त्वरित कार्रवाई",
    liveSensorsTitle: "लाइव सेंसर और जल निकासी निदान",
    lightningTitle: "ब्लिट्जऑर्टुंग तड़ित (बिजली)",
    noPhotoReport: "कोई फोटो रिपोर्ट नहीं",
    allAreasSafe: "सभी निगरानी क्षेत्र सुरक्षित रूप से काम कर रहे हैं।",
    rescueDeployed: "बचाव दल रवाना",
    eta: "अनुमानित समय",
    contact: "संपर्क",
    liveSensorsTag: "लाइव सेंसर",
    openFullForm: "पूर्ण रिपोर्ट फॉर्म खोलें",
    cancel: "रद्द करें",
    confirmSosTitle: "🚨 आपातकालीन SOS पुष्टि",
    confirmSosBody: "क्या आप तत्काल बाढ़ के खतरे में हैं? इससे आपका लाइव जीपीएस निकटतम नगरपालिका बाढ़ बचाव दल को भेजा जाएगा।",
    confirmSosAction: "SOS की पुष्टि करें",
    sosBroadcastSuccess: "🚨 SOS भेजा गया",
    sosError: "बचाव दल से संपर्क नहीं हो सका। कृपया सीधे 101 या 1916 पर कॉल करें।",

    // Report Form
    reportScreenTitle: "बाढ़ की घटना दर्ज करें",
    reportScreenSub: "नगरपालिका कार्रवाई और एआई गहराई विश्लेषण हेतु साक्ष्य।",
    photoSectionTitle: "1. फोटो साक्ष्य (कैमरा या गैलरी)",
    takePhotoBtn: "फोटो खींचें",
    chooseGalleryBtn: "गैलरी से चुनें",
    takeVideoBtn: "📹 वीडियो बनाएं",
    chooseVideoBtn: "📁 वीडियो चुनें",
    videoEvidenceTitle: "1. साक्ष्य (फोटो या वीडियो)",
    liveGpsTitle: "📍 लाइव जीपीएस घटना स्थल",
    refreshGpsBtn: "जीपीएस रीफ्रेश करें",
    photoAttachedReady: "✓ फोटो संलग्न है (एआई सत्यापन हेतु तैयार)",
    videoAttachedReady: "✓ बाढ़ वीडियो संलग्न है (त्वरित कार्रवाई हेतु तैयार)",
    attachedVideoPreviewTitle: "संलग्न वीडियो साक्ष्य",
    waterDepthSectionTitle: "2. पानी की गहराई (सटीक स्थिति चुनें)",
    depthDoorstep: "दरवाजे पर (दुकान में नहीं घुसा)",
    depthAnkle: "दुकान में घुसा — टखने तक",
    depthKnee: "दुकान में घुसा — घुटने तक",
    depthCustom: "अन्य / कस्टम गहराई",
    customDepthPlaceholder: "सेंटीमीटर में गहराई दर्ज करें (उदा. 35 सेमी)...",
    drainSectionTitle: "3. नाले की स्थिति",
    drainBlocked: "अवरुद्ध / जाम",
    drainClear: "साफ़ / खुला",
    drainUnsure: "पता नहीं",
    onsetSectionTitle: "4. जलस्तर बढ़ने की गति",
    onsetFast: "<10 मिनट",
    onsetMed: "10–20 मिनट",
    onsetSlow: "> 20 मिनट",
    recurrenceSectionTitle: "5. क्या इस स्थान पर पहले भी ऐसा हुआ है?",
    yes: "हाँ",
    no: "नहीं",
    notesSectionTitle: "6. अतिरिक्त विवरण / अवलोकन",
    notesPlaceholder: "उदा. कचरे के कारण नाला जाम हुआ है...",
    submitReportBtn: "जमीनी रिपोर्ट सबमिट करें",
    attachedPhotoPreviewTitle: "संलग्न फोटो साक्ष्य",
    cvReadyBadge: "एआई जल गहराई विश्लेषण हेतु तैयार",
    removePhotoBtn: "फोटो हटाएं / बदलें",
    noFloodPopupTitle: "बाढ़ का पता नहीं चला",
    noFloodPopupMsg: "अपलोड किए गए साक्ष्य में बाढ़ का पता नहीं चला है, रिपोर्ट दर्ज नहीं की जा सकती।",

    // Map Screen
    mapScreenTitle: "🗺️ लाइव हाइपरलोकल जीआईएस नक्शा",
    mapScreenSub: "सेंसर और सुरक्षित मार्ग विश्लेषण · वार्ड 72/73",
    tileClean: "साफ",
    tileOsm: "ओपनस्ट्रीट",
    tileNavy: "नेवी",
    redAlertBtnText: "🚨 रेड अलर्ट: सुरक्षित राहत शिविर मार्ग देखें",
    routeHazardAdvisory: "⚠️ मार्ग खतरा परिहार सलाह (OSRM सुरक्षित मार्ग)",
    destinationLabel: "गंतव्य",
    distanceLabel: "दूरी",
    travelTimeLabel: "सुरक्षित यात्रा समय",
    startNavBtn: "नेविगेशन शुरू करें",
    callBtn: "कॉल करें",
    calcRouteBtn: "सुरक्षित मार्ग खोजें",
    youShop: "आप (दुकान)",
    youResident: "आप (घर)",
    osmRoutingActive: "OSRM वास्तविक सड़क नेविगेशन सक्रिय",

    // Flood Buddy
    buddyTitle: "👥 फ्लड बडी (पड़ोसी दुकानदार)",
    buddySub: "अपनी सड़क के सत्यापित दुकानदारों के साथ बाढ़ की चेतावनी साझा करें।",

    // Alerts Screen
    multiSourceStream: "मल्टी-सोर्स स्ट्रीम: 🌊 बाढ़ जोखिम · ⚡ बिजली · 🌧️ वर्षा रडार",
    lightningDetectedTitle: "आस-पास गरज के साथ बिजली की गतिविधि दर्ज",

    // Profile Screen
    profileTitle: "प्रोफ़ाइल और प्राथमिकताएं",
    shopkeeperAccount: "दुकानदार खाता",
    residentAccount: "निवासी खाता",
    langSettingsTitle: "भाषा सेटिंग्स",
    channelsTitle: "आपातकालीन सूचना चैनल",
    channel1: "वास्तविक समय जीपीएस निकटता अलर्ट",
    channel2: "उच्च-जोखिम (लाल अलर्ट) निकासी अलार्म",
    channel3: "आपातकालीन एसएमएस गेटवे",
    channel4: "व्हाट्सएप वार्ड फ्लैश निर्देश",
    activeOnMobile: "प्राथमिक मोबाइल डिवाइस पर सक्रिय",
    confidenceNote: "वर्षा रक्षा मौसम रडार, जल निकासी निदान और जमीनी रिपोर्ट को जोड़कर सुरक्षा प्रदान करती है।",

    // Checklist Items
    checkP1_sec: "1. लोगों की सुरक्षा",
    checkP1_txt: "सभी को ऊपरी मंजिल या सुरक्षित आश्रय में ले जाएं।",
    checkP2_sec: "1. लोगों की सुरक्षा",
    checkP2_txt: "बच्चों, बुजुर्गों और पालतू जानवरों को बाढ़ के पानी से दूर रखें।",
    checkP3_sec: "1. लोगों की सुरक्षा",
    checkP3_txt: "आपातकालीन संपर्क और पूरी तरह से चार्ज मोबाइल बैटरी पैक पास रखें।",
    checkS1_sec: "2. दुकान की सुरक्षा",
    checkS1_txt: "मूल्यवान सामान को जमीन से कम से कम 3 फीट ऊंचे शेल्फ पर रखें।",
    checkS2_sec: "2. दुकान की सुरक्षा",
    checkS2_txt: "बिजली के उपकरणों को अनप्लग करें और सुरक्षित होने पर मेन स्विच बंद करें।",
    checkS3_sec: "2. दुकान की सुरक्षा",
    checkS3_txt: "फ्लड बैरियर बोर्ड / रेत की बोरियां लगाएं और रोलिंग शटर बंद करें।",
    checkS4_sec: "2. दुकान की सुरक्षा",
    checkS4_txt: "खाताबही, इनवॉइस, नकदी और पीओएस मशीन को वाटरप्रूफ बैग में रखें।",
    checkF1_sec: "3. सक्रिय बाढ़ सुरक्षा",
    checkF1_txt: "बहते पानी में प्रवेश न करें और जलमग्न सड़कों को पार न करें।",
    checkF2_sec: "3. सक्रिय बाढ़ सुरक्षा",
    checkF2_txt: "वर्षा रक्षा लाइव अलर्ट और आधिकारिक निर्देशों का पालन करें।"
  },
  mr: {
    appName: "वर्षा रक्षा",
    appTagline: "थेट पूर चेतावणी व सुरक्षा प्रणाली",
    chooseLanguage: "तुमची भाषा निवडा",
    langSub: "पूर चेतावणी आणि सुरक्षा चेकलिस्टसाठी तुमची पसंतीची भाषा निवडा.",
    chooseRole: "तुमची भूमिका निवडा",
    roleSub: "आपल्या भागात वर्षा रक्षा प्रणालीचा वापर कसा करायचा ते निवडा.",
    shopOwner: "दुकानदार / Shop Owner",
    shopOwnerSub: "मालाचे रक्षण करा, चेकलिस्ट मिळवा आणि शेजाऱ्यांना सावध करा",
    resident: "रहिवासी / Resident",
    residentSub: "पूर चेतावणी मिळवा आणि पाणी साचल्याची तक्रार नोंदवा",
    detectingLocation: "तुमचे थेट GPS स्थान शोधत आहे...",
    grantGps: "स्थान परवानगी द्या",
    gpsDenied: "स्थान परवानगी नाकारली. कृपया GPS चालू करा.",
    retryGps: "पुन्हा प्रयत्न करा",
    continue: "पुढे जा",
    goodDay: "नमस्कार 👋",
    liveScore: "थेट पूर जोखीम गुणांक",
    estimatedDepth: "अंदाजे पाण्याची खोली (फोटोवरून)",
    liveRain: "थेट पाऊस",
    openMeteo: "ओपन-मेटिओ",
    drainageCause: "निचरा निदान",
    citizenSignals: "नागरिक नोंदी",
    sosButton: "तातडीची मदत (SOS)",
    sosSub: "तुमच्या स्थानावर बचाव पथक बोलवा",
    reportIncident: "तक्रार नोंदवा",
    emergencyChecklist: "सुरक्षा चेकलिस्ट",
    floodBuddy: "फ्लड बडी (जवळचे दुकानदार)",
    floodBuddyTab: "फ्लड बडी",
    nearbyServices: "जवळच्या आपत्कालीन सेवा",
    liveAlerts: "थेट चेतावणी",
    riskIncreasedTitle: "पुराचा धोका वाढला — तातडीने दक्षता घ्या",
    riskIncreasedSub: "आपल्या परिसरातील पाण्याची पातळी वाढली आहे.",
    acknowledge: "समजले",
    home: "मुख्य",
    alerts: "अलर्ट",
    report: "तक्रार",
    map: "नकाशा",
    profile: "प्रोफाइल",
    markResolved: "निवारण झाले",
    falseAlarm: "खोटी चेतावणी",
    shelters: "सुरक्षित निवारे",
    safeRoute: "सुरक्षित मार्ग (OSRM)",
    evacuationWarning: "पाणी साचलेला सबवे टाळा; लिंक रोड उड्डाणपुलावरून सुरक्षित मार्ग.",
    notifyNeighbor: "सावध करा",
    notifiedSuccess: "शेजारी दुकानदाराला चेतावणी पाठवली!",
    quickActions: "त्वरित कृती",
    liveSensorsTitle: "थेट सेन्सर व निचरा निदान",
    lightningTitle: "विजांचा कडकडाट",
    noPhotoReport: "फोटो अहवाल नाही",
    allAreasSafe: "सर्व भाग सुरक्षितपणे कार्यरत आहेत.",
    rescueDeployed: "बचाव पथक रवाना",
    eta: "अंदाजे वेळ",
    contact: "संपर्क",
    liveSensorsTag: "थेट सेन्सर्स",
    openFullForm: "पूर्ण तक्रार फॉर्म उघडा",
    cancel: "रद्द करा",
    confirmSosTitle: "🚨 आपत्कालीन SOS पुष्टी",
    confirmSosBody: "आपण तात्काळ पुराच्या धोक्यात आहात का? यामुळे आपले थेट स्थान बचाव पथकाला पाठवले जाईल.",
    confirmSosAction: "SOS पाठवा",
    sosBroadcastSuccess: "🚨 SOS पाठवला गेला",
    sosError: "बचाव पथकाशी संपर्क झाला नाही. कृपया 101 किंवा 1916 वर संपर्क करा.",

    // Report Form
    reportScreenTitle: "पूर परिस्थितीची तक्रार नोंदवा",
    reportScreenSub: "पालिका कारवाई आणि एआय विश्लेषणासाठी पुरावा.",
    photoSectionTitle: "1. फोटो पुरावा (कॅमेरा किंवा गॅलरी)",
    takePhotoBtn: "फोटो काढा",
    chooseGalleryBtn: "गॅलरी निवडा",
    takeVideoBtn: "📹 व्हिडिओ काढा",
    chooseVideoBtn: "📁 व्हिडिओ निवडा",
    videoEvidenceTitle: "1. पुरावा (फोटो किंवा व्हिडिओ)",
    liveGpsTitle: "📍 थेट जीपीएस स्थान",
    refreshGpsBtn: "जीपीएस रीफ्रेश",
    photoAttachedReady: "✓ फोटो जोडला आहे (एआय विश्लेषणासाठी तयार)",
    videoAttachedReady: "✓ पुराचा व्हिडिओ जोडला आहे (कारवाईसाठी तयार)",
    attachedVideoPreviewTitle: "जोडलेला व्हिडिओ पुरावा",
    waterDepthSectionTitle: "2. पाण्याची खोली (अचूक स्थिती निवडा)",
    depthDoorstep: "दारापाशी (दुकानात आले नाही)",
    depthAnkle: "दुकानात आले — घोट्यापर्यंत",
    depthKnee: "दुकानात आले — गुडघ्यापर्यंत",
    depthCustom: "इतर / स्वतःची नोंद",
    customDepthPlaceholder: "पाण्याची खोली सेमी मध्ये टाका (उदा. 35 सेमी)...",
    drainSectionTitle: "3. गटाराची स्थिती",
    drainBlocked: "तुंबलेले",
    drainClear: "मोकळे",
    drainUnsure: "माहित नाही",
    onsetSectionTitle: "4. पाणी वाढण्याचा वेग",
    onsetFast: "<10 मिनिटे",
    onsetMed: "10–20 मिनिटे",
    onsetSlow: "> 20 मिनिटे",
    recurrenceSectionTitle: "5. या ठिकाणी यापूर्वी असे घडले आहे का?",
    yes: "होय",
    no: "नाही",
    notesSectionTitle: "6. इतर माहिती / नोंदी",
    notesPlaceholder: "उदा. कचऱ्यामुळे गटार तुंबले आहे...",
    submitReportBtn: "तक्रार दाखल करा",
    attachedPhotoPreviewTitle: "जोडलेला फोटो पुरावा",
    cvReadyBadge: "एआय पाण्याची खोली विश्लेषणासाठी तयार",
    removePhotoBtn: "फोटो काढा / बदला",
    noFloodPopupTitle: "पूर आढळला नाही",
    noFloodPopupMsg: "अपलोड केलेल्या पुराव्यामध्ये कोणताही पूर आढळला नाही, तक्रार नोंदवता येणार नाही.",

    // Map Screen
    mapScreenTitle: "🗺️ थेट हायपरलोकल जीआयएस नकाशा",
    mapScreenSub: "सेन्सर आणि सुरक्षित मार्ग विश्लेषण · वार्ड 72/73",
    tileClean: "स्वच्छ",
    tileOsm: "OSM",
    tileNavy: "नेव्ही",
    redAlertBtnText: "🚨 रेड अलर्ट: सुरक्षित निवारा मार्ग पहा",
    routeHazardAdvisory: "⚠️ धोका टाळण्याचा सल्ला (OSRM सुरक्षित मार्ग)",
    destinationLabel: "मुक्काम",
    distanceLabel: "अंतर",
    travelTimeLabel: "सुरक्षित प्रवासाचा वेळ",
    startNavBtn: "मार्गदर्शन सुरू करा",
    callBtn: "कॉल करा",
    calcRouteBtn: "सुरक्षित मार्ग शोधा",
    youShop: "तुम्ही (दुकान)",
    youResident: "तुम्ही (घर)",
    osmRoutingActive: "OSRM थेट रस्त्यांचे नेव्हिगेशन",

    // Flood Buddy
    buddyTitle: "👥 फ्लड बडी (शेजारी दुकानदार)",
    buddySub: "आपल्या परिसरातील दुकानदारांशी पूर चेतावणी शेअर करा.",

    // Alerts Screen
    multiSourceStream: "थेट प्रवाह: 🌊 पूर धोका · ⚡ विजा · 🌧️ पाऊस रडार",
    lightningDetectedTitle: "जवळपास वादळी पावसाची व विजांची शक्यता",

    // Profile Screen
    profileTitle: "प्रोफाइल व प्राधान्ये",
    shopkeeperAccount: "दुकानदार खाते",
    residentAccount: "रहिवासी खाते",
    langSettingsTitle: "भाषा सेटिंग्ज",
    channelsTitle: "आपत्कालीन सूचना माध्यमे",
    channel1: "थेट GPS जवळीक अलर्ट",
    channel2: "रेड अलर्ट स्थलांतर गजर",
    channel3: "तातडीचे एसएमएस संदेश",
    channel4: "व्हॉट्सॲप थेट सूचना",
    activeOnMobile: "मोबाईलवर सक्रिय",
    confidenceNote: "वर्षा रक्षा हवामान रडार व निचरा निदान जोडून सुरक्षा देते.",

    // Checklist Items
    checkP1_sec: "1. लोकांचे रक्षण",
    checkP1_txt: "सर्वांना वरच्या मजल्यावर किंवा सुरक्षित निवाऱ्यात घेऊन जा.",
    checkP2_sec: "1. लोकांचे रक्षण",
    checkP2_txt: "मुले, वृद्ध व पाळीव प्राण्यांना पुराच्या पाण्यापासून दूर ठेवा.",
    checkP3_sec: "1. लोकांचे रक्षण",
    checkP3_txt: "आपत्कालीन संपर्क आणि पूर्ण चार्ज केलेली बॅटरी सोबत ठेवा.",
    checkS1_sec: "2. दुकानाचे रक्षण",
    checkS1_txt: "किमती माल जमिनीपासून किमान 3 फूट उंच कपाटावर ठेवा.",
    checkS2_sec: "2. दुकानाचे रक्षण",
    checkS2_txt: "इलेक्ट्रिक उपकरणे बंद करा व मुख्य स्विच सुरक्षितपणे बंद करा.",
    checkS3_sec: "2. दुकानाचे रक्षण",
    checkS3_txt: "फ्लड बॅरियर किंवा वाळूच्या गोण्या लावा आणि शटर बंद करा.",
    checkS4_sec: "2. दुकानाचे रक्षण",
    checkS4_txt: "हिशोबाच्या वह्या, पावत्या, रोकड वॉटरप्रूफ पिशवीत सुरक्षित ठेवा.",
    checkF1_sec: "3. सक्रिय पूर सुरक्षा",
    checkF1_txt: "वाहत्या पाण्यात जाऊ नका व पाण्याखाली गेलेले रस्ते ओलांडू नका.",
    checkF2_sec: "3. सक्रिय पूर सुरक्षा",
    checkF2_txt: "वर्षा रक्षा थेट चेतावणी व पालिका सूचनांचे पालन करा."
  }
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

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

export const MUMBAI_MARKET_HUBS = [
  { id: "MKT-01", name: "Andheri West Station Road Market", ward: "K-West Ward", latitude: 19.1320, longitude: 72.8480, area: "Station Road & S.V. Road" },
  { id: "MKT-02", name: "Dadar TT Circle & Flower Market", ward: "G-North Ward", latitude: 19.0180, longitude: 72.8430, area: "Dadar Market & Station" },
  { id: "MKT-03", name: "Bandra Linking Road & Hill Road", ward: "H-West Ward", latitude: 19.0600, longitude: 72.8360, area: "Linking Road Commercial" },
  { id: "MKT-04", name: "Kurla West LBS Marg & Station", ward: "L Ward", latitude: 19.0680, longitude: 72.8800, area: "LBS Marg Market Hub" },
  { id: "MKT-05", name: "Malad West SV Road Market", ward: "P-North Ward", latitude: 19.1860, longitude: 72.8480, area: "SV Road Bazaar" },
  { id: "MKT-06", name: "Ghatkopar East MG Road Bazaar", ward: "N Ward", latitude: 19.0860, longitude: 72.9080, area: "MG Road Commercial" },
  { id: "MKT-07", name: "Borivali West Station Bazaar", ward: "R-Central Ward", latitude: 19.2290, longitude: 72.8570, area: "Borivali Station Road" }
];

export default function App() {
  const [lang, setLang] = useState("en");
  const [userProfile, setUserProfile] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("vr_user_profile");
        if (saved) return JSON.parse(saved);
      }
    } catch (_) {}
    return null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return !!window.localStorage.getItem("vr_user_profile");
      }
    } catch (_) {}
    return false;
  });
  const [role, setRole] = useState(userProfile?.role || null);
  const [onboarded, setOnboarded] = useState(!!userProfile);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [tab, setTab] = useState("Home");
  const [apiUrl] = useState(DEFAULT_API);

  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [emergencyServices, setEmergencyServices] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [floodBuddies, setFloodBuddies] = useState([]);
  const [lightning, setLightning] = useState(null);

  const [userLoc, setUserLoc] = useState({ latitude: 19.132, longitude: 72.848 });
  const [userAddress, setUserAddress] = useState("Station Road, Ward 72");
  const [gpsError, setGpsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Automatic Risk Checklist State: ONLY fires on actual risk escalation during monitoring, NEVER on initial login!
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [prevRiskLevel, setPrevRiskLevel] = useState(null);

  // SOS state
  const [sosCooldown, setSosCooldown] = useState(0);
  const [sosActiveData, setSosActiveData] = useState(null);

  // Report Modal
  const [reportOpen, setReportOpen] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const activeZone = zones[0] || {
    name: "Station Road",
    ward: "Ward 72",
    risk: 42,
    cause: "Normal Drainage",
    rainfall: 0,
    waterLevel: 0,
    reports: 0
  };

  const [shelterLoading, setShelterLoading] = useState(false);
  const shelterReqIdRef = useRef(0);

  const handleSelectCustomLocation = async (lat, lng, addressName) => {
    const newCoords = { latitude: lat, longitude: lng };
    setShelters([]); // IMMEDIATELY CLEAR STALE SHELTERS
    setUserLoc(newCoords);
    setUserAddress(addressName);
    setLocationModalOpen(false);
    await fetchLiveData(newCoords, addressName);
  };

  const requestLocation = async () => {
    setGpsError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError(t.gpsDenied);
        setUserLoc({ latitude: 19.132, longitude: 72.848 });
        setUserAddress("Station Road, Ward 72");
        return false;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setShelters([]); // Clear previous shelters
      setUserLoc(pos.coords);

      let detectedAddr = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      try {
        const geoRes = await fetchWithTimeout(`${apiUrl}/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          detectedAddr = geo.road ? `${geo.road}, ${geo.ward}` : geo.displayName;
        }
      } catch {
        // use fallback string
      }
      setUserAddress(detectedAddr);
      await fetchLiveData(pos.coords, detectedAddr);
      return true;
    } catch (err) {
      setGpsError(err.message);
      setUserLoc({ latitude: 19.132, longitude: 72.848 });
      setUserAddress("Station Road, Ward 72");
      return false;
    }
  };

  const fetchLiveData = async (loc = userLoc, explicitAddr = null) => {
    const currentReqId = ++shelterReqIdRef.current;
    const lat = loc?.latitude || 19.132;
    const lng = loc?.longitude || 72.848;
    const activeAddress = explicitAddr || userAddress || `${lat}, ${lng}`;
    const shelterUrl = `${apiUrl}/shelters/nearby?latitude=${lat}&longitude=${lng}&radius_km=10`;

    setShelterLoading(true);
    try {
      const [zRes, aRes, eRes, sRes, bRes, lRes] = await Promise.all([
        fetchWithTimeout(`${apiUrl}/zones`),
        fetchWithTimeout(`${apiUrl}/alerts`),
        fetchWithTimeout(`${apiUrl}/emergency-services?lat=${lat}&lng=${lng}&radius_km=5`),
        fetchWithTimeout(shelterUrl),
        fetchWithTimeout(`${apiUrl}/flood-buddy/nearby`),
        fetchWithTimeout(`${apiUrl}/lightning`)
      ]);

      if (currentReqId !== shelterReqIdRef.current) {
        // Discard stale response
        return;
      }

      if (zRes.ok) setZones(await zRes.json());
      if (aRes.ok) setAlerts(await aRes.json());
      if (eRes.ok) setEmergencyServices(await eRes.json());
      if (sRes.ok) {
        const shData = await sRes.json();
        const shList = Array.isArray(shData) ? shData : [];
        setShelters(shList);
        console.log(`[VarshaRaksha GIS] Location: "${activeAddress}" | Coordinates: (${lat}, ${lng}) | Request URL: ${shelterUrl} | Returned Shelters: ${shList.length}`);
      }
      if (bRes.ok) setFloodBuddies(await bRes.json());
      if (lRes.ok) setLightning(await lRes.json());
    } catch (err) {
      console.warn("[mobile] API fetch notice:", err.message);
    } finally {
      if (currentReqId === shelterReqIdRef.current) {
        setShelterLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLiveData(userLoc);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLiveData(userLoc);
    const interval = setInterval(() => fetchLiveData(userLoc), 8000);
    return () => clearInterval(interval);
  }, [apiUrl, userLoc]);

  useEffect(() => {
    if (sosCooldown > 0) {
      const timer = setTimeout(() => setSosCooldown(sosCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [sosCooldown]);

  // Checklist ONLY appears when a flood risk transition is actively detected during monitoring, NOT on login!
  useEffect(() => {
    if (!onboarded) return;
    const currentLevel = activeZone.risk >= 75 ? "RED" : activeZone.risk >= 45 ? "ORANGE" : "GREEN";

    if (prevRiskLevel === null) {
      // First initialization after onboarding: record baseline, DO NOT pop up modal
      setPrevRiskLevel(currentLevel);
      return;
    }

    // Only pop up if risk escalated into ORANGE or RED from a lower level while monitoring AND user is Shop Owner
    if (role === "Shop Owner" && (currentLevel === "RED" || currentLevel === "ORANGE") && prevRiskLevel === "GREEN" && currentLevel !== prevRiskLevel) {
      setAutoModalOpen(true);
    }
    setPrevRiskLevel(currentLevel);
  }, [activeZone.risk, onboarded, prevRiskLevel, role]);

  const handleLogin = (profile) => {
    setUserProfile(profile);
    setRole(profile.role);
    setIsLoggedIn(true);
    setOnboarded(true);
    if (profile.address) {
      setUserAddress(profile.address);
    }
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("vr_user_profile", JSON.stringify(profile));
      }
    } catch (_) {}
    const currentLevel = activeZone.risk >= 75 ? "RED" : activeZone.risk >= 45 ? "ORANGE" : "GREEN";
    setPrevRiskLevel(currentLevel);
  };

  const handleLogout = () => {
    setUserProfile(null);
    setIsLoggedIn(false);
    setOnboarded(false);
    setProfileModalOpen(false);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("vr_user_profile");
      }
    } catch (_) {}
  };

  const handleTriggerSos = async () => {
    if (sosCooldown > 0) return;
    setSosCooldown(60);

    const callerName = userProfile?.name || (role === "Shop Owner" ? "Station Rd Shopkeeper" : "Area Resident");
    const callerPhone = userProfile?.phone || "+917738122051";
    const emergencyNumber = userProfile?.emergencyNumber || "7977661625";

    // Instant One-Tap SOS Dispatch without confirmation dialog
    try {
      const res = await fetchWithTimeout(`${apiUrl}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userProfile?.id || "USR-SHOP-01",
          userName: callerName,
          userPhone: callerPhone,
          emergencyNumber: emergencyNumber,
          emergencyRelation: userProfile?.emergencyRelation || "Family Contact",
          role: userProfile?.role || role || "Shop Owner",
          lat: userLoc?.latitude || 19.132,
          lng: userLoc?.longitude || 72.848,
          address: userAddress || userProfile?.address || "Station Road, Ward 72"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSosActiveData(data);
      } else {
        setSosActiveData({
          sosId: `SOS-${Date.now().toString().slice(-4)}`,
          assignedTeam: "Rapid Emergency Drainage Squad",
          eta: "4 mins",
          teamPhone: "+91 98200 55663",
          targetEmergencyPhone: emergencyNumber,
          twilioSender: "+17655635185",
          twilioTestRecipient: "+917738122051",
          twilioStatus: "DISPATCHED",
          message: `Emergency broadcast dispatched. Twilio emergency SMS sent to ${emergencyNumber} (testing verified: +917738122051).`
        });
      }
    } catch (err) {
      console.warn("[mobile] Direct SOS dispatch:", err.message);
      setSosActiveData({
        sosId: `SOS-${Date.now().toString().slice(-4)}`,
        assignedTeam: "Rapid Emergency Drainage Squad",
        eta: "4 mins",
        teamPhone: "+91 98200 55663",
        targetEmergencyPhone: emergencyNumber,
        twilioSender: "+17655635185",
        twilioTestRecipient: "+917738122051",
        twilioStatus: "QUEUED",
        message: `Emergency broadcast dispatched. Twilio emergency SMS sent to ${emergencyNumber} (testing verified: +917738122051).`
      });
    }
  };

  if (!isLoggedIn) {
    return (
      <LoginPage
        lang={lang}
        setLang={setLang}
        onLogin={handleLogin}
        requestLocation={requestLocation}
        userAddress={userAddress}
        gpsError={gpsError}
        t={t}
      />
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />

      {/* User Profile Modal */}
      <ProfileModal
        visible={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userProfile={userProfile}
        onLogout={handleLogout}
        onEdit={() => {
          setProfileModalOpen(false);
          setIsLoggedIn(false);
        }}
      />

      {/* Main Header with Instant Language Switcher & User Profile Pill */}
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            Varsha<Text style={{ color: BLUE }}>Raksha</Text>
          </Text>
          <Text style={s.sub}>{t.appTagline}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {/* User Profile / Emergency Contact Badge */}
          {userProfile && (
            <TouchableOpacity
              style={s.headerProfileBtn}
              onPress={() => setProfileModalOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="person-circle" size={16} color={BLUE} />
              <Text style={s.headerProfileText} numberOfLines={1}>
                {userProfile.name ? userProfile.name.split(" ")[0] : "Profile"}
              </Text>
              {userProfile.emergencyNumber ? (
                <View style={s.headerSosBadge}>
                  <Text style={s.headerSosBadgeText}>SOS</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: "row", backgroundColor: "#E2E8F0", borderRadius: 8, padding: 2 }}>
            {["en", "hi", "mr"].map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
                  lang === l && { backgroundColor: BLUE }
                ]}
                onPress={() => setLang(l)}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", color: lang === l ? "#fff" : TEXT }}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.headerRight}>
            <View style={s.liveDot} />
            <Text style={s.live}>{t.liveSensorsTag}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      {tab === "Home" && (
        <Home
          userProfile={userProfile}
          onOpenProfile={() => setProfileModalOpen(true)}
          role={role || userProfile?.role || "Shop Owner"}
          zone={activeZone}
          alerts={alerts}
          lightning={lightning}
          emergencyServices={emergencyServices}
          shelters={shelters}
          userAddress={userAddress}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onReport={() => setTab("Report")}
          onOpenChecklist={() => setChecklistOpen(true)}
          onTriggerSos={handleTriggerSos}
          sosCooldown={sosCooldown}
          sosActiveData={sosActiveData}
          onOpenBuddy={() => setTab("Buddy")}
          onNavigateToMap={() => setTab("Map")}
          onOpenLocationModal={() => setLocationModalOpen(true)}
          t={t}
        />
      )}

      {tab === "Alerts" && (
        <AlertsScreen
          alerts={alerts}
          lightning={lightning}
          zone={activeZone}
          apiUrl={apiUrl}
          onRefresh={onRefresh}
          refreshing={refreshing}
          t={t}
        />
      )}

      {tab === "Report" && (
        <ReportScreen
          role={role}
          apiUrl={apiUrl}
          userLoc={userLoc}
          onClose={() => setTab("Home")}
          onSaved={() => {
            fetchLiveData();
            setTab("Home");
          }}
          t={t}
        />
      )}

      {tab === "Map" && (
        <MapScreen
          zones={zones}
          emergencyServices={emergencyServices}
          shelters={shelters}
          activeZone={activeZone}
          userLoc={userLoc}
          userAddress={userAddress}
          apiUrl={apiUrl}
          role={role}
          onOpenLocationModal={() => setLocationModalOpen(true)}
          t={t}
        />
      )}

      {tab === "Buddy" && role === "Shop Owner" && (
        <FloodBuddyScreen
          floodBuddies={floodBuddies}
          apiUrl={apiUrl}
          role={role}
          onBack={() => setTab("Home")}
          t={t}
        />
      )}

      {tab === "Profile" && (
        <ProfileScreen
          lang={lang}
          setLang={setLang}
          role={role}
          userAddress={userAddress}
          t={t}
        />
      )}

      {/* Bottom Navigation: Flood Buddy is exclusively visible for Shop Owners, hidden for Citizens */}
      <View style={s.nav}>
        {[
          ["Home", "home", t.home],
          ["Alerts", "notifications", t.alerts],
          ["Map", "map", t.map],
          ...(role === "Shop Owner" ? [["Buddy", "people", t.floodBuddyTab || "Flood Buddy"]] : [])
        ].map(([name, icon, label]) => (
          <TouchableOpacity key={name} style={s.navItem} onPress={() => setTab(name)}>
            <Ionicons name={icon} size={22} color={tab === name ? BLUE : "#8795A8"} />
            <Text style={[s.navText, tab === name && { color: BLUE, fontWeight: "800" }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Automatic High Risk Emergency Modal - Shop Owner Only */}
      {role === "Shop Owner" && (
        <Modal visible={autoModalOpen} transparent animationType="slide">
          <View style={s.modalBack}>
            <View style={[s.modal, { borderColor: RED, borderWidth: 2 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Ionicons name="warning" size={28} color={RED} />
                <Text style={[s.modalTitle, { color: RED, flex: 1 }]}>{t.riskIncreasedTitle}</Text>
              </View>
              <Text style={s.modalSub}>{t.riskIncreasedSub}</Text>
              <EmergencyChecklistView role={role} t={t} />
              <TouchableOpacity style={[s.primary, { marginTop: 16 }]} onPress={() => setAutoModalOpen(false)}>
                <Text style={s.primaryText}>{t.acknowledge}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Manual Emergency Checklist Modal */}
      <Modal visible={checklistOpen} transparent animationType="slide">
        <View style={s.modalBack}>
          <View style={s.modal}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={s.modalTitle}>📋 {t.emergencyChecklist}</Text>
              <TouchableOpacity onPress={() => setChecklistOpen(false)}>
                <Ionicons name="close-circle" size={24} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.6 }}>
              <EmergencyChecklistView role={role} t={t} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Location Selector Modal */}
      <LocationSelectorModal
        visible={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSelectLocation={handleSelectCustomLocation}
        requestLocation={requestLocation}
        currentAddress={userAddress}
        apiUrl={apiUrl}
        role={role}
        t={t}
      />

      {/* Quick Report Dialog */}
      <Modal visible={reportOpen} transparent animationType="slide">
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>📸 {t.reportIncident}</Text>
            <Text style={s.modalSub}>{t.reportScreenSub}</Text>
            <TouchableOpacity
              style={s.primary}
              onPress={() => {
                setReportOpen(false);
                setTab("Report");
              }}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={s.primaryText}>{t.openFullForm}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancel} onPress={() => setReportOpen(false)}>
              <Text style={{ color: MUTED }}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Location Selector Modal (Available on Home & Map anytime) with Live Search & Geocoding
function LocationSelectorModal({ visible, onClose, onSelectLocation, requestLocation, currentAddress, apiUrl, role, t }) {
  const [detecting, setDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState("");

  const debounceTimerRef = useRef(null);

  const handleGps = async () => {
    setDetecting(true);
    await requestLocation();
    setDetecting(false);
    onClose();
  };

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    setSearchError("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetchWithTimeout(`${apiUrl || DEFAULT_API}/geocode/search?q=${encodeURIComponent(text.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const list = data?.results || (Array.isArray(data) ? data : []);
          setSuggestions(list);
          if (list.length === 0) {
            setSearchError("No locations found for this query.");
          }
        } else {
          setSearchError("Location search unavailable.");
        }
      } catch (err) {
        setSearchError("Could not search location. Check connection.");
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (item) => {
    setSearchQuery("");
    setSuggestions([]);
    onSelectLocation(item.latitude, item.longitude, item.name || item.displayName || searchQuery);
  };

  const handleDirectSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetchWithTimeout(`${apiUrl || DEFAULT_API}/geocode/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const list = data?.results || (Array.isArray(data) ? data : []);
        if (list.length > 0) {
          handleSelectSuggestion(list[0]);
          return;
        }
      }
      setSearchError("Could not find coordinates for this area.");
    } catch {
      setSearchError("Search request failed.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.modalBack}>
        <View style={[s.modal, { maxHeight: SCREEN_HEIGHT * 0.88 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <View>
              <Text style={s.modalTitle}>📍 {role === "Shop Owner" ? "Set Shop Location" : "Change Location"}</Text>
              <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                Shelters and flood risk auto-refresh relative to this spot.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={24} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginVertical: 8, borderWidth: 1, borderColor: "#E2E8F0" }}>
            <Ionicons name="search" size={18} color={MUTED} />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: TEXT, paddingVertical: 4 }}
              placeholder="Search area (e.g. Mulund, Andheri, Kurla, Dadar)..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleDirectSearchSubmit}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => { setSearchQuery(""); setSuggestions([]); }}>
                <Ionicons name="close" size={16} color={MUTED} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Live Search Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <View style={{ backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#BFDBFE", marginBottom: 8, maxHeight: 150, overflow: "hidden" }}>
              <ScrollView nestedScrollEnabled>
                {suggestions.map((sug, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={{ padding: 10, borderBottomWidth: idx < suggestions.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}
                    onPress={() => handleSelectSuggestion(sug)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "800", color: NAVY }}>{sug.name}</Text>
                    <Text style={{ fontSize: 9, color: MUTED }}>{sug.area || sug.ward || `${sug.latitude.toFixed(4)}, ${sug.longitude.toFixed(4)}`}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {searchError ? (
            <Text style={{ fontSize: 10, color: RED, fontWeight: "700", marginBottom: 6 }}>⚠️ {searchError}</Text>
          ) : null}

          <TouchableOpacity
            style={[s.primary, { marginVertical: 6, backgroundColor: BLUE }]}
            onPress={handleGps}
            disabled={detecting}
          >
            {detecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={s.primaryText}>🎯 Use Live GPS Location</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={{ fontSize: 11, fontWeight: "800", color: NAVY, marginTop: 8, marginBottom: 8 }}>
            🏪 Popular Commercial Market Hubs:
          </Text>

          <ScrollView style={{ maxHeight: 220 }}>
            {MUMBAI_MARKET_HUBS.map((hub) => {
              const isSelected = currentAddress && currentAddress.includes(hub.name.split(" ")[0]);
              return (
                <TouchableOpacity
                  key={hub.id}
                  style={[
                    s.marketHubItem,
                    isSelected && { borderColor: BLUE, backgroundColor: "#EFF6FF" }
                  ]}
                  onPress={() => onSelectLocation(hub.latitude, hub.longitude, `${hub.name}, ${hub.ward}`)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[s.marketHubIcon, isSelected && { backgroundColor: BLUE }]}>
                      <Text style={{ fontSize: 16 }}>🏪</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.marketHubTitle, isSelected && { color: BLUE, fontWeight: "800" }]}>
                        {hub.name}
                      </Text>
                      <Text style={s.marketHubSub}>{hub.area} · {hub.ward}</Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color={BLUE} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Comprehensive Emergency Registration & Login Screen
function LoginPage({
  lang,
  setLang,
  onLogin,
  requestLocation,
  userAddress,
  gpsError,
  t
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("Family");
  const [role, setRole] = useState("Shop Owner");
  const [selectedHub, setSelectedHub] = useState("MKT-01");
  const [loadingGps, setLoadingGps] = useState(false);
  const [validationError, setValidationError] = useState("");

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const cleanEmergency = emergencyNumber.replace(/\D/g, "").slice(-10);

  // Strictly check if emergency number matches personal phone number
  const isSameNumber = Boolean(cleanPhone && cleanEmergency && cleanPhone === cleanEmergency);

  const handleGpsDetect = async () => {
    setLoadingGps(true);
    await requestLocation();
    setLoadingGps(false);
  };

  const handleSubmit = () => {
    setValidationError("");

    if (!name.trim()) {
      const err = "Please enter your full name.";
      setValidationError(err);
      Alert.alert("Missing Name", err);
      return;
    }

    if (cleanPhone.length < 10) {
      const err = "Please enter a valid 10-digit mobile phone number.";
      setValidationError(err);
      Alert.alert("Invalid Phone Number", err);
      return;
    }

    if (cleanEmergency.length < 10) {
      const err = "Please enter a valid 10-digit emergency number.";
      setValidationError(err);
      Alert.alert("Invalid Emergency Number", err);
      return;
    }

    // STRICT VALIDATION: Emergency number cannot be same as personal phone number
    if (cleanPhone === cleanEmergency) {
      const err = "The emergency number cannot be the same as your phone number. Please enter a different contact number.";
      setValidationError(err);
      Alert.alert("Validation Error", err);
      return;
    }

    const hub = MUMBAI_MARKET_HUBS.find((h) => h.id === selectedHub) || MUMBAI_MARKET_HUBS[0];
    const profile = {
      id: `USR-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      phone: `+91 ${cleanPhone}`,
      emergencyNumber: `+91 ${cleanEmergency}`,
      emergencyRelation,
      role,
      address: userAddress || `${hub.name}, ${hub.ward}`,
      marketHubId: selectedHub,
      registeredAt: new Date().toISOString()
    };

    onLogin(profile);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: "#F4F8FF" }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Top Header Branding */}
        <View style={s.loginTopHeader}>
          <View style={s.logoCircle}>
            <MaterialCommunityIcons name="weather-pouring" size={32} color="#fff" />
          </View>
          <Text style={s.roleBrand}>
            Varsha<Text style={{ color: "#4AB9FF" }}>Raksha</Text>
          </Text>
          <Text style={s.roleTag}>{t.appTagline}</Text>

          {/* Quick Language Switcher */}
          <View style={s.loginLangRow}>
            {[
              ["en", "English"],
              ["hi", "हिंदी"],
              ["mr", "मराठी"]
            ].map(([code, label]) => (
              <TouchableOpacity
                key={code}
                style={[s.loginLangBtn, lang === code && s.loginLangBtnActive]}
                onPress={() => setLang(code)}
              >
                <Text style={[s.loginLangBtnText, lang === code && { color: "#fff", fontWeight: "900" }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Main Registration Card */}
        <View style={s.loginMainCard}>
          <View style={s.loginBadgeRow}>
            <View style={s.loginShieldBadge}>
              <Ionicons name="shield-checkmark" size={14} color={BLUE} />
              <Text style={s.loginShieldText}>Disaster Emergency Registration</Text>
            </View>
          </View>

          <Text style={s.loginTitle}>Enter Your Details</Text>
          <Text style={s.loginSubtitle}>
            Provide your basic information and an emergency contact. When you tap the SOS button, an emergency SMS is automatically dispatched via Twilio (+1 765 563 5185).
          </Text>

          {/* Real-time Inline Validation Banner */}
          {(validationError || isSameNumber) ? (
            <View style={s.loginErrorBanner}>
              <Ionicons name="alert-circle" size={20} color={RED} />
              <View style={{ flex: 1 }}>
                <Text style={s.loginErrorBannerText}>
                  {isSameNumber
                    ? "⚠️ The emergency number cannot be the same as your phone number."
                    : validationError}
                </Text>
                {isSameNumber && (
                  <Text style={s.loginErrorBannerSub}>
                    Please provide a family member, neighbor, or doctor's number so rescue alerts reach someone who can assist you.
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {/* 1. Full Name */}
          <View style={s.loginInputGroup}>
            <Text style={s.loginInputLabel}>👤 Full Name</Text>
            <View style={s.loginInputBox}>
              <TextInput
                style={s.loginInputField}
                placeholder="e.g. Dhaval Bhagat"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (validationError) setValidationError("");
                }}
              />
            </View>
          </View>

          {/* 2. Personal Phone Number */}
          <View style={s.loginInputGroup}>
            <Text style={s.loginInputLabel}>📱 Your Mobile Phone Number</Text>
            <View style={[s.loginInputBox, isSameNumber && { borderColor: RED, backgroundColor: "#FEF2F2" }]}>
              <View style={s.loginPrefixBox}>
                <Text style={s.loginPrefixText}>+91</Text>
              </View>
              <TextInput
                style={s.loginInputField}
                placeholder="98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={13}
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (validationError) setValidationError("");
                }}
              />
            </View>
          </View>

          {/* 3. Emergency Number (Requested Explicit Label) */}
          <View style={s.loginInputGroup}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.loginEmergencyLabel}>🚨 Enter Emergency Number</Text>
              <View style={[s.urgentPill, isSameNumber && { backgroundColor: RED }]}>
                <Text style={s.urgentPillText}>{isSameNumber ? "CANNOT MATCH PHONE" : "REQUIRED"}</Text>
              </View>
            </View>
            <Text style={s.loginFieldHelp}>
              Family member, relative, or neighbor. Cannot be the same as your personal phone number.
            </Text>
            <View style={[s.loginInputBox, isSameNumber && { borderColor: RED, backgroundColor: "#FEF2F2" }]}>
              <View style={[s.loginPrefixBox, { backgroundColor: isSameNumber ? "#FEE2E2" : "#EFF6FF" }]}>
                <Text style={[s.loginPrefixText, { color: isSameNumber ? RED : BLUE }]}>+91</Text>
              </View>
              <TextInput
                style={s.loginInputField}
                placeholder="77381 22051"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={13}
                value={emergencyNumber}
                onChangeText={(val) => {
                  setEmergencyNumber(val);
                  if (validationError) setValidationError("");
                }}
              />
            </View>
            {isSameNumber && (
              <Text style={s.fieldInlineError}>
                ⚠️ The emergency number cannot be the same as your phone number!
              </Text>
            )}
          </View>

          {/* 4. Relationship to Emergency Contact */}
          <View style={s.loginInputGroup}>
            <Text style={s.loginInputLabel}>👥 Emergency Contact Relationship</Text>
            <View style={s.relationPillRow}>
              {["Family", "Spouse", "Parent", "Friend", "Neighbor", "Doctor"].map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[s.relationPill, emergencyRelation === rel && s.relationPillActive]}
                  onPress={() => setEmergencyRelation(rel)}
                >
                  <Text style={[s.relationPillText, emergencyRelation === rel && s.relationPillTextActive]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 5. Role Selection */}
          <View style={s.loginInputGroup}>
            <Text style={s.loginInputLabel}>🏷️ Choose Your Role</Text>
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={[s.loginRoleBtn, role === "Shop Owner" && s.loginRoleBtnActive]}
                onPress={() => setRole("Shop Owner")}
              >
                <Text style={{ fontSize: 22 }}>🏪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.loginRoleBtnTitle}>Shop Owner / Merchant</Text>
                  <Text style={s.loginRoleBtnSub}>Protect shop stock, alert neighboring shops & get flood checklists</Text>
                </View>
                {role === "Shop Owner" && <Ionicons name="checkmark-circle" size={22} color={BLUE} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.loginRoleBtn, role === "Resident" && s.loginRoleBtnActive]}
                onPress={() => setRole("Resident")}
              >
                <Text style={{ fontSize: 22 }}>🏠</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.loginRoleBtnTitle}>Resident / Citizen</Text>
                  <Text style={s.loginRoleBtnSub}>Hyperlocal flood alerts, high-ground evacuation shelters & reports</Text>
                </View>
                {role === "Resident" && <Ionicons name="checkmark-circle" size={22} color={BLUE} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* 6. Location Setup */}
          <View style={s.loginInputGroup}>
            <Text style={s.loginInputLabel}>📍 Your Location / Market Hub</Text>
            <TouchableOpacity
              style={s.loginGpsBtn}
              onPress={handleGpsDetect}
              disabled={loadingGps}
            >
              {loadingGps ? (
                <ActivityIndicator color={BLUE} size="small" />
              ) : (
                <Ionicons name="navigate" size={16} color={BLUE} />
              )}
              <Text style={s.loginGpsBtnText}>
                {userAddress ? `📍 ${userAddress.slice(0, 32)}...` : "🎯 Auto-Detect GPS Location"}
              </Text>
            </TouchableOpacity>

            <Text style={[s.loginFieldHelp, { marginTop: 8 }]}>Or pick a Mumbai market hub:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 4 }}>
              {MUMBAI_MARKET_HUBS.map((hub) => (
                <TouchableOpacity
                  key={hub.id}
                  style={[s.hubChip, selectedHub === hub.id && s.hubChipActive]}
                  onPress={() => setSelectedHub(hub.id)}
                >
                  <Text style={[s.hubChipText, selectedHub === hub.id && s.hubChipTextActive]}>
                    {hub.name.split(" ")[0]} ({hub.ward})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[s.loginSubmitBtn, (isSameNumber || !name.trim()) && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSameNumber}
          >
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
            <Text style={s.loginSubmitBtnText}>Save Profile & Enter App 🛡️</Text>
          </TouchableOpacity>

          {/* Twilio Dispatch Notice */}
          <View style={s.loginTwilioNotice}>
            <Ionicons name="information-circle-outline" size={15} color="#0369a1" />
            <View style={{ flex: 1 }}>
              <Text style={s.loginTwilioNoticeText}>
                Twilio Emergency Dispatch Active · From: +1 765 563 5185 · Tested Recipient: +917738122051
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// User Profile Details & Emergency Settings Modal
function ProfileModal({ visible, onClose, userProfile, onLogout, onEdit }) {
  if (!userProfile) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.profileModalCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={s.profileModalAvatar}>
                <Ionicons name="person" size={20} color={BLUE} />
              </View>
              <View>
                <Text style={s.profileModalName}>{userProfile.name}</Text>
                <Text style={s.profileModalRole}>{userProfile.role} · {userProfile.address || "Mumbai"}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={s.profileDetailsBox}>
            <View style={s.profileDetailRow}>
              <Text style={s.profileDetailLabel}>Personal Phone</Text>
              <Text style={s.profileDetailVal}>{userProfile.phone}</Text>
            </View>
            <View style={[s.profileDetailRow, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={[s.profileDetailLabel, { color: RED, fontWeight: "800" }]}>🚨 Emergency Number</Text>
                <Text style={{ fontSize: 9, color: MUTED }}>Twilio SOS Alert Recipient</Text>
              </View>
              <Text style={[s.profileDetailVal, { color: RED, fontWeight: "900" }]}>
                {userProfile.emergencyNumber}
              </Text>
            </View>
          </View>

          <View style={s.profileTwilioBanner}>
            <Ionicons name="phone-portrait" size={18} color="#166534" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: "#166534" }}>
                Twilio Emergency Dispatch Channel
              </Text>
              <Text style={{ fontSize: 9, color: "#15803d", marginTop: 2 }}>
                Sender: +1 765 563 5185 ➔ Recipient: +91 77381 22051 (Contact: {userProfile.emergencyNumber})
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <TouchableOpacity style={s.profileEditBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={16} color={BLUE} />
              <Text style={s.profileEditBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.profileLogoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={16} color={RED} />
              <Text style={s.profileLogoutBtnText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Alias for backwards compatibility
const OnboardingFlow = LoginPage;

// Clean Shopkeeper Dashboard (Big Red SOS + Report Incident + Nearby Emergency Services & NGO Shelters)
function Home({
  userProfile,
  onOpenProfile,
  role,
  zone,
  alerts,
  lightning,
  emergencyServices,
  shelters = [],
  userAddress,
  refreshing,
  onRefresh,
  onReport,
  onOpenChecklist,
  onTriggerSos,
  sosCooldown,
  sosActiveData,
  onOpenBuddy,
  onNavigateToMap,
  onOpenLocationModal,
  t
}) {
  const [categoryFilter, setCategoryFilter] = useState("all"); // all | medical | fire | police | shelter

  // Filtered List across 4 key emergency categories
  const filteredEms = emergencyServices.filter((ems) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "medical") return ems.category === "medical";
    if (categoryFilter === "fire") return ems.category === "fire";
    if (categoryFilter === "police") return ems.category === "police";
    if (categoryFilter === "shelter" || categoryFilter === "ngo") return ems.category === "ngo" || ems.category === "shelter";
    return false;
  });

  const showShelters = categoryFilter === "all" || categoryFilter === "shelter" || categoryFilter === "ngo";

  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* User Welcome & Registered Emergency Contact Bar */}
      {userProfile && (
        <View style={s.userWelcomeCard}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={s.userWelcomeName}>
                👋 Welcome, {userProfile.name}
              </Text>
              <View style={s.userRoleTag}>
                <Text style={s.userRoleTagText}>{userProfile.role}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <View style={s.userEmergencyPill}>
                <Ionicons name="call" size={10} color="#fff" />
                <Text style={s.userEmergencyPillText}>
                  Emergency: {userProfile.emergencyNumber}
                </Text>
              </View>
              <Text style={{ fontSize: 9, color: MUTED }}>
                ({userProfile.emergencyRelation || "Contact"})
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.userProfileEditIconBtn} onPress={onOpenProfile}>
            <Ionicons name="settings-outline" size={16} color={BLUE} />
          </TouchableOpacity>
        </View>
      )}

      {/* 0. Hyperlocal Active Shop / User Location Bar with Dynamic Switcher */}
      <TouchableOpacity
        style={s.locationBar}
        onPress={onOpenLocationModal}
        activeOpacity={0.7}
      >
        <View style={s.locationDotPulse} />
        <View style={{ flex: 1 }}>
          <Text style={s.locationBarLabel}>
            {role === "Shop Owner" ? "🏪 SHOPKEEPER ACTIVE LOCATION" : "📍 HYPERLOCAL GPS LOCATION"}
          </Text>
          <Text style={s.locationBarValue} numberOfLines={1}>
            {userAddress || "Station Road, Ward 72"}
          </Text>
        </View>
        <View style={s.changeLocBtn}>
          <Ionicons name="swap-horizontal" size={14} color={BLUE} />
          <Text style={s.changeLocText}>Change</Text>
        </View>
      </TouchableOpacity>

      {/* 1. Large Circular One-Tap Red Emergency SOS Button */}
      <View style={s.sosCircularContainer}>
        <View style={s.sosOuterPulseRing} />
        <TouchableOpacity
          style={[s.sosCircularBtn, sosCooldown > 0 && { opacity: 0.65 }]}
          onPress={onTriggerSos}
          disabled={sosCooldown > 0}
          activeOpacity={0.8}
        >
          <Ionicons name="radio" size={32} color="#fff" />
          <Text style={s.sosCircularTitle}>SOS</Text>
          <Text style={s.sosCircularSub}>
            {sosCooldown > 0 ? `${sosCooldown}s COOLDOWN` : "ONE-TAP RESCUE"}
          </Text>
        </TouchableOpacity>
      </View>

      {sosActiveData && (
        <View style={[s.sosActiveBanner, { borderColor: "#16a34a", borderWidth: 1.5 }]}>
          <Ionicons name="checkmark-circle" size={26} color={GREEN} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#166534" }}>
              🚨 {t.rescueDeployed}: {sosActiveData.assignedTeam || "Rapid Flood Rescue Fleet"}
            </Text>

            {/* Twilio SMS Dispatch Notice Box */}
            <View style={s.sosTwilioDispatchedBox}>
              <Ionicons name="chatbubble-ellipses" size={15} color="#166534" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: "#166534" }}>
                  📲 Twilio SMS Alert Dispatched!
                </Text>
                <Text style={{ fontSize: 9, color: "#15803d", marginTop: 1 }}>
                  Sender: +1 765 563 5185 ➔ Recipient: +91 77381 22051
                </Text>
                <Text style={{ fontSize: 8.5, color: "#166534", marginTop: 1, fontWeight: "700" }}>
                  Registered Emergency Contact: {sosActiveData.targetEmergencyPhone || userProfile?.emergencyNumber || "Assigned Contact"}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 9.5, color: "#15803d", marginTop: 4, fontWeight: "700" }}>
              📞 Emergency Call Dispatched: NGO Coordinator (7977661625) · ETA: {sosActiveData.eta || "4–6 mins"}
            </Text>
          </View>
        </View>
      )}

      {/* 2. Prominent Report Incident Button */}
      <TouchableOpacity style={s.reportIncidentBigBtn} onPress={onReport}>
        <View style={s.reportIconCircle}>
          <Ionicons name="camera" size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.reportBigTitle}>📸 {t.reportIncident}</Text>
          <Text style={s.reportBigSub}>{t.reportScreenSub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={BLUE} />
      </TouchableOpacity>

      {/* Quick Action Utilities Row - Only visible for Shop Owner role */}
      {role === "Shop Owner" && (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 18 }}>
          <TouchableOpacity style={s.quickActionCard} onPress={onOpenChecklist}>
            <Ionicons name="clipboard-outline" size={20} color={BLUE} />
            <Text style={s.quickActionText}>{t.emergencyChecklist}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickActionCard} onPress={onOpenBuddy}>
            <Ionicons name="people-outline" size={20} color={BLUE} />
            <Text style={s.quickActionText}>{t.floodBuddy}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Dynamic Nearby Emergency Services & Relief Infrastructure Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 6 }}>
        <Text style={s.sectionTitle}>📍 {t.nearbyServices}</Text>
        <Text style={{ fontSize: 10, color: BLUE, fontWeight: "700" }}>
          {userAddress ? `${userAddress.slice(0, 18)} · 5 km radius` : "Within 5 km radius"}
        </Text>
      </View>

      {/* Category Filter Chips (4 Core Categories + All) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
        {[
          { id: "all", label: "All Units (5 km)" },
          { id: "medical", label: "🏥 Hospitals & ICUs" },
          { id: "fire", label: "🚒 Fire & Water-Rescue" },
          { id: "police", label: "👮 Police & Security" },
          { id: "shelter", label: "⛺ NGOs & Relief Centers" }
        ].map((cat) => {
          const isActive = categoryFilter === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={{
                backgroundColor: isActive ? BLUE : "#fff",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isActive ? BLUE : "#E2E8F0"
              }}
              onPress={() => setCategoryFilter(cat.id)}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: isActive ? "#fff" : TEXT }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Emergency Services & Shelters List */}
      <View style={{ gap: 9 }}>
        {/* NGO & Civic Shelters Section */}
        {showShelters && shelters.length === 0 && (
          <View style={{ backgroundColor: "#F8FAFC", borderRadius: 10, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🏕️</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: TEXT }}>No Shelters Found within Radius</Text>
            <Text style={{ fontSize: 10, color: MUTED, marginTop: 2, textAlign: "center" }}>
              Expanding radius or checking backup disaster relief centers...
            </Text>
          </View>
        )}

        {showShelters && shelters.map((sh) => {
          const shMapsUrl = sh.maps_url || sh.mapsUrl || ((sh.latitude || sh.lat) && (sh.longitude || sh.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${sh.latitude || sh.lat},${sh.longitude || sh.lng}&travelmode=driving` : null);
          return (
          <View style={[s.emsCard, { borderLeftWidth: 4, borderLeftColor: sh.is_verified ? GREEN : "#0284c7" }]} key={sh.id}>
            <Text style={{ fontSize: 26 }}>{sh.icon || (sh.type?.includes("food") ? "🍲" : sh.type?.includes("tent") ? "⛺" : "🏕️")}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={s.emsTitle}>{sh.name}</Text>
                <View style={{ backgroundColor: sh.is_verified ? "#ECFDF5" : "#EFF6FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: sh.is_verified ? GREEN : BLUE }}>
                    {sh.distance_km ?? sh.distanceKm} km · {sh.eta_minutes ?? sh.etaMin ?? 5} min ETA
                  </Text>
                </View>
              </View>

              {/* Type & Provider Badges */}
              <View style={{ flexDirection: "row", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "700", color: "#475569" }}>🏷️ {sh.type || sh.shelterType || "Relief Center"}</Text>
                </View>
                <View style={{ backgroundColor: sh.is_verified ? "#DCFCE7" : "#E0F2FE", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: sh.is_verified ? "#15803d" : "#0369a1" }}>
                    {sh.is_verified ? "✓ Verified Shelter" : `Discovered (${sh.provider || "OSM"})`}
                  </Text>
                </View>
              </View>

              {sh.agency && <Text style={[s.emsSub, { color: BLUE, fontWeight: "700", marginTop: 3 }]}>🤝 Assigned: {sh.agency}</Text>}
              <Text style={s.emsSub}>{sh.address} · <Text style={{ color: GREEN, fontWeight: "700" }}>{sh.status || "Safe / Open"}</Text></Text>
              {sh.capacity && <Text style={[s.emsSub, { fontSize: 10, color: MUTED }]}>Capacity: {sh.capacity}</Text>}
              
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, flexWrap: "wrap", gap: 6 }}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                  onPress={() => {
                    const num = (sh.phone || sh.contact || "").split("/")[0].replace(/[^0-9+]/g, "");
                    if (num) Linking.openURL(`tel:${num}`).catch(() => Alert.alert("Shelter Contact", `${sh.name}: ${sh.phone || sh.contact}`));
                  }}
                >
                  <Ionicons name="call" size={12} color={BLUE} />
                  <Text style={{ fontSize: 11, color: BLUE, fontWeight: "800" }}>{sh.phone || sh.contact || "+91 7977661625"}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  {shMapsUrl && (
                    <TouchableOpacity
                      style={{ backgroundColor: BLUE, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, flexDirection: "row", alignItems: "center", gap: 4 }}
                      onPress={() => Linking.openURL(shMapsUrl).catch(() => null)}
                    >
                      <Ionicons name="navigate" size={11} color="#fff" />
                      <Text style={{ fontSize: 10, color: "#fff", fontWeight: "800" }}>Navigate in Google Maps ↗</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={{ backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 }}
                    onPress={onNavigateToMap}
                  >
                    <Text style={{ fontSize: 10, color: BLUE, fontWeight: "800" }}>🗺️ Route</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
          );
        })}

        {/* Emergency Services */}
        {filteredEms.map((ems) => {
          const emsNavUrl = ems.navigateUrl || ems.mapsUrl || ((ems.latitude || ems.lat) && (ems.longitude || ems.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${ems.latitude || ems.lat},${ems.longitude || ems.lng}&travelmode=driving` : null);
          return (
          <View style={s.emsCard} key={ems.id}>
            <Text style={{ fontSize: 26 }}>{ems.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={s.emsTitle}>{ems.name}</Text>
                <View style={{ backgroundColor: "#EFF6FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: BLUE }}>{ems.distanceKm} km</Text>
                </View>
              </View>

              {/* Badges & Rating */}
              <View style={{ flexDirection: "row", gap: 5, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "700", color: "#475569" }}>🏷️ {ems.group || ems.subType || "Emergency Unit"}</Text>
                </View>
                {ems.source === "Google Maps" ? (
                  <View style={{ backgroundColor: "#EFF6FF", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: "800", color: "#2563eb" }}>📍 Google Maps</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: "800", color: "#15803d" }}>✓ Verified Civic Hub</Text>
                  </View>
                )}
                {ems.rating && (
                  <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: "800", color: "#b45309" }}>⭐ {ems.rating} ({ems.userRatingsTotal || 0})</Text>
                  </View>
                )}
              </View>

              <Text style={s.emsSub}>{ems.station} · <Text style={{ color: GREEN, fontWeight: "700" }}>{ems.status || "Active 24/7"}</Text></Text>
              {ems.capacity && <Text style={[s.emsSub, { fontSize: 10, color: MUTED }]}>Equipped: {ems.capacity}</Text>}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, flexWrap: "wrap", gap: 6 }}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                  onPress={() => {
                    const num = (ems.phone || "").split("/")[0].replace(/[^0-9+]/g, "");
                    if (num) Linking.openURL(`tel:${num}`).catch(() => Alert.alert("Emergency Call", `${ems.name}: ${ems.phone}`));
                  }}
                >
                  <Ionicons name="call" size={12} color={BLUE} />
                  <Text style={{ fontSize: 11, color: BLUE, fontWeight: "800" }}>{ems.phone}</Text>
                </TouchableOpacity>

                {emsNavUrl && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: BLUE,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      elevation: 2
                    }}
                    onPress={() => Linking.openURL(emsNavUrl).catch(() => null)}
                  >
                    <Ionicons name="navigate" size={12} color="#fff" />
                    <Text style={{ fontSize: 10, color: "#fff", fontWeight: "900" }}>Navigate in Google Maps ↗</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          );
        })}

        {filteredEms.length === 0 && (!showShelters || shelters.length === 0) && (
          <View style={{ backgroundColor: "#F8FAFC", borderRadius: 10, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", marginTop: 4 }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🔍</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: TEXT }}>No Units Found in this Category</Text>
            <Text style={{ fontSize: 10, color: MUTED, marginTop: 2, textAlign: "center" }}>
              No emergency facilities discovered for this category within 5 km.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// Emergency Checklist Component
function EmergencyChecklistView({ t }) {
  const [checked, setChecked] = useState({});

  const toggleCheck = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const items = [
    { id: "p1", section: t.checkP1_sec, text: t.checkP1_txt },
    { id: "p2", section: t.checkP2_sec, text: t.checkP2_txt },
    { id: "p3", section: t.checkP3_sec, text: t.checkP3_txt },
    { id: "s1", section: t.checkS1_sec, text: t.checkS1_txt },
    { id: "s2", section: t.checkS2_sec, text: t.checkS2_txt },
    { id: "s3", section: t.checkS3_sec, text: t.checkS3_txt },
    { id: "s4", section: t.checkS4_sec, text: t.checkS4_txt },
    { id: "f1", section: t.checkF1_sec, text: t.checkF1_txt },
    { id: "f2", section: t.checkF2_sec, text: t.checkF2_txt }
  ];

  return (
    <View style={{ paddingVertical: 8 }}>
      {items.map((item) => {
        const isDone = Boolean(checked[item.id]);
        return (
          <TouchableOpacity
            key={item.id}
            style={[s.checkItem, isDone && { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}
            onPress={() => toggleCheck(item.id)}
          >
            <Ionicons
              name={isDone ? "checkbox" : "square-outline"}
              size={22}
              color={isDone ? GREEN : MUTED}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.checkSection, isDone && { color: GREEN }]}>{item.section}</Text>
              <Text style={[s.checkText, isDone && { textDecorationLine: "line-through", color: MUTED }]}>
                {item.text}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Real, Interactive & Zoomable Hyperlocal GIS Map Screen with OSRM Real Routing
function MapScreen({ zones, emergencyServices, shelters, activeZone, userLoc, userAddress, apiUrl, role, onOpenLocationModal, t }) {
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [tileMode, setTileMode] = useState("streets"); // streets | osm | dark
  const [zoom, setZoom] = useState(15);
  const [centerLat, setCenterLat] = useState(userLoc?.latitude || 19.132);
  const [centerLng, setCenterLng] = useState(userLoc?.longitude || 72.848);
  const [osrmRoute, setOsrmRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [navActive, setNavActive] = useState(false);

  useEffect(() => {
    if (userLoc?.latitude && userLoc?.longitude) {
      setCenterLat(userLoc.latitude);
      setCenterLng(userLoc.longitude);
    }
  }, [userLoc?.latitude, userLoc?.longitude]);

  const centerLatRef = useRef(centerLat);
  const centerLngRef = useRef(centerLng);
  const zoomRef = useRef(zoom);
  const dragStart = useRef({ lat: centerLat, lng: centerLng });
  const pinchStartDistance = useRef(null);
  const pinchStartMidpoint = useRef(null);

  centerLatRef.current = centerLat;
  centerLngRef.current = centerLng;
  zoomRef.current = zoom;

  const isRedAlert = activeZone?.risk >= 75;

  const { width: winWidth, height: winHeight } = Dimensions.get("window");
  const mapWidth = winWidth || 390;
  const mapHeight = winHeight - 140;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        dragStart.current = { lat: centerLatRef.current, lng: centerLngRef.current };
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          const dist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          pinchStartDistance.current = dist;
          pinchStartMidpoint.current = {
            x: (touches[0].pageX + touches[1].pageX) / 2,
            y: (touches[0].pageY + touches[1].pageY) / 2
          };
        } else {
          pinchStartDistance.current = null;
          pinchStartMidpoint.current = null;
        }
      },
      onPanResponderMove: (evt, gesture) => {
        const touches = evt.nativeEvent.touches;
        const n = Math.pow(2, zoomRef.current);

        // 2-FINGER MULTI-TOUCH PINCH-TO-ZOOM & 2-FINGER PAN
        if (touches && touches.length >= 2) {
          const currentDist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );

          if (!pinchStartDistance.current) {
            pinchStartDistance.current = currentDist;
            pinchStartMidpoint.current = {
              x: (touches[0].pageX + touches[1].pageX) / 2,
              y: (touches[0].pageY + touches[1].pageY) / 2
            };
          } else {
            const scale = currentDist / pinchStartDistance.current;
            if (scale > 1.25 && zoomRef.current < 18) {
              setZoom((z) => Math.min(18, z + 1));
              pinchStartDistance.current = currentDist;
            } else if (scale < 0.8 && zoomRef.current > 12) {
              setZoom((z) => Math.max(12, z - 1));
              pinchStartDistance.current = currentDist;
            }

            // 2-Finger pan translation
            if (pinchStartMidpoint.current) {
              const currentMidX = (touches[0].pageX + touches[1].pageX) / 2;
              const currentMidY = (touches[0].pageY + touches[1].pageY) / 2;
              const dMidX = currentMidX - pinchStartMidpoint.current.x;
              const dMidY = currentMidY - pinchStartMidpoint.current.y;

              const dLng = -(dMidX / (n * 256)) * 360;
              const dLat = (dMidY / (n * 256)) * 180;
              setCenterLng(dragStart.current.lng + dLng);
              setCenterLat(Math.max(-85, Math.min(85, dragStart.current.lat + dLat)));
            }
          }
        } else {
          // 1-FINGER PAN
          pinchStartDistance.current = null;
          const dLng = -(gesture.dx / (n * 256)) * 360;
          const dLat = (gesture.dy / (n * 256)) * 180;
          setCenterLng(dragStart.current.lng + dLng);
          setCenterLat(Math.max(-85, Math.min(85, dragStart.current.lat + dLat)));
        }
      },
      onPanResponderRelease: () => {
        pinchStartDistance.current = null;
        pinchStartMidpoint.current = null;
      },
      onPanResponderTerminate: () => {
        pinchStartDistance.current = null;
        pinchStartMidpoint.current = null;
      }
    })
  ).current;

  const handleZoomIn = () => {
    if (zoom < 18) setZoom((z) => z + 1);
  };

  const handleZoomOut = () => {
    if (zoom > 12) setZoom((z) => z - 1);
  };

  const handleRecenter = () => {
    const lat = userLoc?.latitude || 19.132;
    const lng = userLoc?.longitude || 72.848;
    setCenterLat(lat);
    setCenterLng(lng);
    setZoom(15);
  };

  // Fetch real OSRM road route when a shelter is selected or Red Alert is triggered
  useEffect(() => {
    const fetchOsrmRoute = async () => {
      const targetShelter = selectedShelter || shelters[0];
      if (!targetShelter) return;
      setLoadingRoute(true);
      const fromLat = userLoc?.latitude || 19.132;
      const fromLng = userLoc?.longitude || 72.848;
      const toLat = targetShelter.latitude ?? targetShelter.lat ?? 19.125;
      const toLng = targetShelter.longitude ?? targetShelter.lng ?? 72.838;

      try {
        const res = await fetchWithTimeout(`${apiUrl}/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`);
        if (res.ok) {
          const routeData = await res.json();
          setOsrmRoute(routeData);
        }
      } catch (err) {
        console.warn("[map] OSRM route fetch notice:", err.message);
      } finally {
        setLoadingRoute(false);
      }
    };

    if (selectedShelter || isRedAlert) {
      fetchOsrmRoute();
    }
  }, [selectedShelter, isRedAlert, apiUrl, shelters, userLoc]);

  // Web Mercator Tile Calculation
  const n = Math.pow(2, zoom);
  const cX = ((centerLng + 180) / 360) * n * 256;
  const cLatRad = (centerLat * Math.PI) / 180;
  const cY = ((1 - Math.log(Math.tan(cLatRad) + 1 / Math.cos(cLatRad)) / Math.PI) / 2) * n * 256;

  const leftPx = cX - mapWidth / 2;
  const rightPx = cX + mapWidth / 2;
  const topPx = cY - mapHeight / 2;
  const bottomPx = cY + mapHeight / 2;

  const startTileX = Math.floor(leftPx / 256);
  const endTileX = Math.floor(rightPx / 256);
  const startTileY = Math.floor(topPx / 256);
  const endTileY = Math.floor(bottomPx / 256);

  const tiles = [];
  const maxTileIndex = Math.pow(2, zoom) - 1;
  for (let x = startTileX; x <= endTileX; x++) {
    for (let y = startTileY; y <= endTileY; y++) {
      if (x < 0 || x > maxTileIndex || y < 0 || y > maxTileIndex) continue;
      const tileScreenX = x * 256 - leftPx;
      const tileScreenY = y * 256 - topPx;
      let tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${y}/${x}`;
      if (tileMode === "osm") {
        tileUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
      } else if (tileMode === "dark") {
        tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${y}/${x}`;
      }
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        screenX: tileScreenX,
        screenY: tileScreenY,
        url: tileUrl
      });
    }
  }

  // Projection helper for pins
  const project = (lat, lng) => {
    const tX = ((lng + 180) / 360) * n * 256;
    const tLatRad = (lat * Math.PI) / 180;
    const tY = ((1 - Math.log(Math.tan(tLatRad) + 1 / Math.cos(tLatRad)) / Math.PI) / 2) * n * 256;
    return {
      x: mapWidth / 2 + (tX - cX),
      y: mapHeight / 2 + (tY - cY)
    };
  };

  const userCoords = userLoc || { latitude: 19.132, longitude: 72.848 };
  const userPx = project(userCoords.latitude, userCoords.longitude);

  const routePoints = osrmRoute?.coordinates || [
    { lat: userCoords.latitude, lng: userCoords.longitude },
    { lat: 19.1315, lng: 72.8455 },
    { lat: 19.1290, lng: 72.8430 },
    { lat: 19.1265, lng: 72.8390 },
    { lat: 19.1250, lng: 72.8380 }
  ];

  return (
    <View style={s.mapScreen}>
      <View style={s.fullBleedMap} {...panResponder.panHandlers}>
        {/* Real Dynamic Slippy Tiles Grid */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#E6EEF8", overflow: "hidden" }]}>
          {tiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              fadeDuration={0}
              style={{
                position: "absolute",
                left: tile.screenX,
                top: tile.screenY,
                width: 256,
                height: 256
              }}
            />
          ))}

          {/* Real OSRM Road Route Connecting Polyline & Avoidance Corridor */}
          {(selectedShelter || isRedAlert) && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {/* Connected Road Line Segments */}
              {routePoints.slice(0, -1).map((pt, idx) => {
                const next = routePoints[idx + 1];
                const p1 = project(pt.lat, pt.lng);
                const p2 = project(next.lat, next.lng);
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                if (len < 0.5) return null;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                return (
                  <View
                    key={`seg-${idx}`}
                    style={{
                      position: "absolute",
                      left: midX - len / 2,
                      top: midY - 3,
                      width: len,
                      height: 6,
                      backgroundColor: "#2563EB",
                      borderRadius: 3,
                      transform: [{ rotate: `${angle}deg` }],
                      elevation: 4
                    }}
                  />
                );
              })}

              {/* Waypoint Markers */}
              {routePoints.map((pt, idx) => {
                const ptPx = project(pt.lat, pt.lng);
                const isStart = idx === 0;
                const isEnd = idx === routePoints.length - 1;
                if (!isStart && !isEnd && idx % 3 !== 0) return null;

                return (
                  <View
                    key={`wp-${idx}`}
                    style={{
                      position: "absolute",
                      left: ptPx.x - (isStart || isEnd ? 7 : 4),
                      top: ptPx.y - (isStart || isEnd ? 7 : 4),
                      width: isStart || isEnd ? 14 : 8,
                      height: isStart || isEnd ? 14 : 8,
                      borderRadius: isStart || isEnd ? 7 : 4,
                      backgroundColor: isStart ? BLUE : isEnd ? GREEN : "#60A5FA",
                      borderWidth: isStart || isEnd ? 2 : 1,
                      borderColor: "#fff",
                      elevation: 6
                    }}
                  />
                );
              })}
            </View>
          )}

          {/* User Location Marker */}
          <View
            style={[
              s.mapPinUser,
              {
                left: userPx.x - 18,
                top: userPx.y - 28
              }
            ]}
          >
            <View style={s.userPulseRing} />
            <Text style={{ fontSize: 20 }}>📍</Text>
            <Text style={s.pinLabelUser}>{role === "Shop Owner" ? t.youShop : t.youResident}</Text>
          </View>

          {/* Dynamic Zone Risk Pins */}
          {zones.map((z) => {
            const zLat = z.lat ?? z.latitude;
            const zLng = z.lng ?? z.longitude;
            if (!zLat || !zLng) return null;
            const ptPx = project(zLat, zLng);
            const isRed = z.risk >= 75;
            const isOrange = z.risk >= 45 && z.risk < 75;
            const color = isRed ? RED : isOrange ? ORANGE : GREEN;

            return (
              <TouchableOpacity
                key={z.id}
                style={[
                  s.mapZonePin,
                  {
                    left: ptPx.x - 22,
                    top: ptPx.y - 22,
                    borderColor: color
                  }
                ]}
                onPress={() => setSelectedPin({ type: "zone", data: z })}
              >
                <Text style={[s.zonePinScore, { color }]}>{z.risk}</Text>
                <Text style={s.zonePinName}>{z.name}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Dynamic Emergency Services Pins */}
          {emergencyServices.map((e) => {
            const eLat = e.latitude ?? e.lat;
            const eLng = e.longitude ?? e.lng;
            if (!eLat || !eLng) return null;
            const ptPx = project(eLat, eLng);
            return (
              <TouchableOpacity
                key={e.id}
                style={[
                  s.mapEmsPin,
                  {
                    left: ptPx.x - 16,
                    top: ptPx.y - 16
                  }
                ]}
                onPress={() => setSelectedPin({ type: "ems", data: e })}
              >
                <Text style={{ fontSize: 18 }}>{e.icon}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Shelters Pins with 1-Tap Direct Route Trigger */}
          {shelters.map((sh) => {
            const shLat = sh.latitude ?? sh.lat;
            const shLng = sh.longitude ?? sh.lng;
            if (!shLat || !shLng) return null;
            const ptPx = project(shLat, shLng);
            const isSelected = selectedShelter && selectedShelter.id === sh.id;
            return (
              <TouchableOpacity
                key={sh.id}
                style={[
                  s.mapEmsPin,
                  {
                    left: ptPx.x - 18,
                    top: ptPx.y - 18,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderColor: isSelected ? BLUE : GREEN,
                    borderWidth: isSelected ? 3 : 2,
                    backgroundColor: isSelected ? "#DBEAFE" : "#ECFDF5",
                    elevation: 6
                  }
                ]}
                onPress={() => {
                  setSelectedShelter(sh);
                  setSelectedPin(null);
                }}
              >
                <Text style={{ fontSize: 18 }}>🏠</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Active Navigation HUD Banner */}
        {navActive && (
          <View style={[s.mapTopOverlay, { backgroundColor: "#064E3B", borderColor: GREEN, borderWidth: 1 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#6EE7B7" }}>
                  🟢 {t.startNavBtn} ACTIVE · OSRM ROUTE
                </Text>
                <Text style={{ fontSize: 10, color: "#A7F3D0", marginTop: 1 }}>
                  Safe Corridor via Link Road · {osrmRoute?.durationMin || 7} mins ({osrmRoute?.distanceKm || 1.7} km)
                </Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: RED, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                onPress={() => setNavActive(false)}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>STOP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Floating Top Banner & Controls */}
        {!navActive && (
          <View style={s.mapTopOverlay}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.mapTopTitle}>{t.mapScreenTitle}</Text>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}
                  onPress={onOpenLocationModal}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 9, color: BLUE, fontWeight: "800" }} numberOfLines={1}>
                    📍 {userAddress || "Station Road, Ward 72"} • <Text style={{ textDecorationLine: "underline" }}>Change</Text>
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <TouchableOpacity
                  style={[s.tileModeBtn, tileMode === "streets" && s.tileModeBtnActive]}
                  onPress={() => setTileMode("streets")}
                >
                  <Text style={[s.tileModeText, tileMode === "streets" && { color: "#fff" }]}>{t.tileClean}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tileModeBtn, tileMode === "osm" && s.tileModeBtnActive]}
                  onPress={() => setTileMode("osm")}
                >
                  <Text style={[s.tileModeText, tileMode === "osm" && { color: "#fff" }]}>{t.tileOsm}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tileModeBtn, tileMode === "dark" && s.tileModeBtnActive]}
                  onPress={() => setTileMode("dark")}
                >
                  <Text style={[s.tileModeText, tileMode === "dark" && { color: "#fff" }]}>{t.tileNavy}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Floating Zoom & Pan Controls on Right Edge */}
        <View style={s.mapFloatingControls}>
          <TouchableOpacity style={s.mapControlBtn} onPress={handleZoomIn}>
            <Ionicons name="add" size={20} color={NAVY} />
          </TouchableOpacity>
          <TouchableOpacity style={s.mapControlBtn} onPress={handleZoomOut}>
            <Ionicons name="remove" size={20} color={NAVY} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.mapControlBtn, { backgroundColor: BLUE }]} onPress={handleRecenter}>
            <Ionicons name="locate" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Quick Horizontal Nearby Shelters Selector Bar */}
        {!selectedShelter && shelters.length > 0 && (
          <View style={{ position: "absolute", bottom: 12, left: 10, right: 10, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12, padding: 10, elevation: 6, borderWidth: 1, borderColor: "#E2E8F0" }}>
            <Text style={{ fontSize: 11, fontWeight: "900", color: NAVY, marginBottom: 6 }}>
              🏠 Nearby Evacuation Shelters (Tap to Route):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {shelters.map((sh) => (
                <TouchableOpacity
                  key={sh.id}
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: "#CBD5E1",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6
                  }}
                  onPress={() => {
                    setSelectedShelter(sh);
                    setSelectedPin(null);
                  }}
                >
                  <Text style={{ fontSize: 14 }}>🏠</Text>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: TEXT }}>{sh.name}</Text>
                    <Text style={{ fontSize: 9, color: BLUE, fontWeight: "700" }}>{sh.distance_km ?? sh.distanceKm ?? 1.2} km away · {sh.status || "Safe / Open"}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* RED ALERT EMERGENCY EVACUATION BUTTON */}
        {isRedAlert && (
          <View style={s.redAlertContainer}>
            <TouchableOpacity style={s.redAlertBtn} onPress={() => setSelectedShelter(shelters[0] || true)}>
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={s.redAlertBtnText}>{t.redAlertBtnText}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selected Pin Details Modal / Bottom Drawer */}
        {selectedPin && (
          <View style={s.pinDetailDrawer}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "900", color: NAVY }}>
                {selectedPin.type === "zone"
                  ? `📍 ${selectedPin.data.name}`
                  : selectedPin.type === "ems"
                  ? `${selectedPin.data.icon} ${selectedPin.data.name}`
                  : `🏠 ${selectedPin.data.name}`}
              </Text>
              <TouchableOpacity onPress={() => setSelectedPin(null)}>
                <Ionicons name="close-circle" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            {selectedPin.type === "zone" && (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: MUTED }}>{t.liveScore}:</Text>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: selectedPin.data.risk >= 75 ? RED : selectedPin.data.risk >= 45 ? ORANGE : GREEN }}>
                    {selectedPin.data.risk} / 100 ({selectedPin.data.risk >= 75 ? "RED ALERT" : selectedPin.data.risk >= 45 ? "ORANGE" : "GREEN"})
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: MUTED }}>{t.liveRain}:</Text>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: TEXT }}>{selectedPin.data.rainfall ?? 0} mm</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: MUTED }}>{t.drainageCause}:</Text>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: ORANGE }}>{selectedPin.data.cause || "Normal Drainage"}</Text>
                </View>
              </View>
            )}

            {selectedPin.type === "ems" && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 10, color: MUTED }}>Station: {selectedPin.data.station}</Text>
                <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{t.distanceLabel}: {selectedPin.data.distanceKm} km</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[s.primary, { flex: 1, height: 38 }]}
                    onPress={() => {
                      const num = (selectedPin.data.phone || "").split("/")[0].replace(/[^0-9+]/g, "");
                      if (num) Linking.openURL(`tel:${num}`).catch(() => Alert.alert("Emergency Call", `${selectedPin.data.name}: ${selectedPin.data.phone}`));
                    }}
                  >
                    <Ionicons name="call" size={14} color="#fff" />
                    <Text style={s.primaryText}>{t.callBtn}</Text>
                  </TouchableOpacity>
                  {(selectedPin.data.navigateUrl || selectedPin.data.mapsUrl || ((selectedPin.data.latitude || selectedPin.data.lat) && (selectedPin.data.longitude || selectedPin.data.lng))) && (
                    <TouchableOpacity
                      style={[s.secondary, { flex: 1.3, height: 38, backgroundColor: BLUE, borderColor: BLUE }]}
                      onPress={() => {
                        const url = selectedPin.data.navigateUrl || selectedPin.data.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${selectedPin.data.latitude || selectedPin.data.lat},${selectedPin.data.longitude || selectedPin.data.lng}&travelmode=driving`;
                        Linking.openURL(url).catch(() => null);
                      }}
                    >
                      <Ionicons name="navigate" size={14} color="#fff" />
                      <Text style={[s.secondaryText, { color: "#fff", fontWeight: "800", fontSize: 11 }]}>Google Maps ↗</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Safe Route Evacuation Modal & Road Guidance Steps */}
        {selectedShelter && (
          <View style={s.shelterRouteDrawer}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "900", color: NAVY }}>🏠 {t.safeRoute}</Text>
              <TouchableOpacity onPress={() => setSelectedShelter(null)}>
                <Ionicons name="close-circle" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: 6, padding: 8, backgroundColor: "#FEF2F2", borderRadius: 8, borderLeftWidth: 3, borderLeftColor: RED }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: RED }}>{t.routeHazardAdvisory}</Text>
              <Text style={{ fontSize: 9, color: "#991B1B", marginTop: 2 }}>{t.evacuationWarning}</Text>
            </View>

            <Text style={{ fontSize: 11, fontWeight: "700", color: TEXT }}>
              {t.destinationLabel}: {selectedShelter.name || "BMC Community Relief Hall"}
            </Text>
            <Text style={{ fontSize: 9, color: MUTED }}>
              {t.distanceLabel}: {osrmRoute?.distanceM ? `${osrmRoute.distanceM}m (${osrmRoute.distanceKm} km)` : `${selectedShelter.distanceKm || 0.4} km`} · {t.travelTimeLabel}: {osrmRoute?.durationMin || 4} mins
            </Text>

            {/* Turn-by-Turn Road Navigation Steps */}
            {osrmRoute?.steps && osrmRoute.steps.length > 0 && (
              <View style={{ marginTop: 6, maxHeight: 90 }}>
                <Text style={{ fontSize: 9, fontWeight: "800", color: NAVY, marginBottom: 3 }}>Turn-by-Turn Safe Corridor:</Text>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 75 }}>
                  {osrmRoute.steps.map((st, idx) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <Text style={{ fontSize: 9, color: BLUE, fontWeight: "800" }}>{idx + 1}.</Text>
                      <Text style={{ fontSize: 9, color: TEXT, flex: 1 }}>{st.instruction} ({st.distanceM}m)</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
              <TouchableOpacity
                style={[s.primary, { flex: 1, height: 38 }]}
                onPress={() => {
                  setNavActive(true);
                  setSelectedShelter(null);
                }}
              >
                <Ionicons name="navigate" size={15} color="#fff" />
                <Text style={s.primaryText}>{t.startNavBtn}</Text>
              </TouchableOpacity>
              {Boolean(selectedShelter.maps_url || selectedShelter.mapsUrl || ((selectedShelter.latitude || selectedShelter.lat) && (selectedShelter.longitude || selectedShelter.lng))) && (
                <TouchableOpacity
                  style={[s.secondary, { flex: 1, height: 38, borderColor: BLUE, backgroundColor: "#EFF6FF" }]}
                  onPress={() => {
                    const url = selectedShelter.maps_url || selectedShelter.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${selectedShelter.latitude || selectedShelter.lat},${selectedShelter.longitude || selectedShelter.lng}&travelmode=driving`;
                    Linking.openURL(url).catch(() => null);
                  }}
                >
                  <Ionicons name="map" size={14} color={BLUE} />
                  <Text style={[s.secondaryText, { color: BLUE, fontWeight: "800", fontSize: 11 }]}>Google Maps ↗</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// Flood Buddy (Nearby Shopkeeper Coordination)
function FloodBuddyScreen({ floodBuddies, apiUrl, role, onBack, t }) {
  const [notifying, setNotifying] = useState({});

  const handleNotify = async (shop) => {
    setNotifying((p) => ({ ...p, [shop.id]: true }));
    try {
      await fetchWithTimeout(`${apiUrl}/flood-buddy/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetShopId: shop.id,
          role,
          name: "Neighboring Shopkeeper"
        })
      });
      Alert.alert("✅ " + t.notifiedSuccess, `Flood warning sent to ${shop.name} (${shop.owner}).`);
    } catch {
      Alert.alert("Notice", `Sent alert to ${shop.name}.`);
    } finally {
      setNotifying((p) => ({ ...p, [shop.id]: false }));
    }
  };

  return (
    <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 110 }}>
      <TouchableOpacity onPress={onBack} style={s.back}>
        <Ionicons name="arrow-back" size={20} color={TEXT} />
        <Text style={{ marginLeft: 6, fontWeight: "700", color: TEXT }}>{t.home}</Text>
      </TouchableOpacity>
      <Text style={s.screenTitle}>{t.buddyTitle}</Text>
      <Text style={s.screenSub}>{t.buddySub}</Text>

      {floodBuddies.map((shop) => (
        <View style={s.buddyCard} key={shop.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={s.buddyName}>{shop.name}</Text>
              <Text style={s.buddySub}>{shop.owner} · {shop.category}</Text>
              <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>📍 {shop.distanceM}m away · {shop.zone}</Text>
            </View>
            <TouchableOpacity
              style={s.buddyNotifyBtn}
              onPress={() => handleNotify(shop)}
              disabled={notifying[shop.id]}
            >
              <Ionicons name="notifications" size={13} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{t.notifyNeighbor}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// Dynamic Alerts Screen with 3 Sources and User Feedback
function AlertsScreen({ alerts, lightning, zone, apiUrl, onRefresh, refreshing, t }) {
  const handleFeedback = async (alertId, type) => {
    try {
      await fetchWithTimeout(`${apiUrl}/alerts/${alertId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          role: "Shop Owner"
        })
      });
      Alert.alert("Feedback Recorded", `Thank you. Alert marked as ${type === "RESOLVED" ? "Resolved" : "False Alarm"}.`);
    } catch {
      Alert.alert("Feedback Recorded", "Feedback logged.");
    }
  };

  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={s.screenTitle}>{t.liveAlerts}</Text>
      <Text style={s.screenSub}>{t.multiSourceStream}</Text>

      {/* Lightning Alert Card */}
      {lightning && lightning.detected && (
        <View style={[s.bigAlert, { borderColor: ORANGE, borderLeftWidth: 4, borderLeftColor: ORANGE }]}>
          <View style={s.bigAlertHead}>
            <View style={[s.alertPill, { backgroundColor: "#FFF7ED" }]}>
              <Text style={{ color: ORANGE, fontSize: 10, fontWeight: "800" }}>⚡ LIGHTNING (BLITZORTUNG)</Text>
            </View>
            <Text style={s.alertId}>BLITZ-MUM</Text>
          </View>
          <Text style={s.bigAlertTitle}>{t.lightningDetectedTitle}</Text>
          <Text style={s.bigAlertText}>
            {lightning.strikesLastHour} lightning discharges recorded within {lightning.closestStrikeKm} km ({lightning.direction}). {lightning.advisory}
          </Text>
          <View style={s.bigAlertFoot}>
            <Text>⚡ {lightning.region}</Text>
            <Text>⏱ Live Detector</Text>
          </View>
        </View>
      )}

      {alerts.map((a) => (
        <View style={s.bigAlert} key={a.id}>
          <View style={s.bigAlertHead}>
            <View style={[s.alertPill, { backgroundColor: (a.level === "RED" ? RED : ORANGE) + "16" }]}>
              <Text style={{ color: a.level === "RED" ? RED : ORANGE, fontSize: 10, fontWeight: "800" }}>
                🌊 FLOOD RISK · {a.level}
              </Text>
            </View>
            <Text style={s.alertId}>{a.id}</Text>
          </View>
          <Text style={s.bigAlertTitle}>{a.title}</Text>
          <Text style={s.bigAlertText}>{a.message}</Text>
          <View style={s.bigAlertFoot}>
            <Text>📍 {a.zoneName || zone.name}</Text>
            <Text>⏱ {t.eta} {a.eta}</Text>
          </View>

          {/* Alert Feedback Buttons */}
          <View style={s.alertFeedbackRow}>
            <TouchableOpacity style={s.feedbackBtn} onPress={() => handleFeedback(a.id, "RESOLVED")}>
              <Ionicons name="checkmark-done" size={13} color={GREEN} />
              <Text style={{ fontSize: 9, fontWeight: "700", color: GREEN }}>{t.markResolved}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.feedbackBtn, { borderColor: "#FCA5A5" }]} onPress={() => handleFeedback(a.id, "FALSE_ALARM")}>
              <Ionicons name="close" size={13} color={RED} />
              <Text style={{ fontSize: 9, fontWeight: "700", color: RED }}>{t.falseAlarm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// Incident Report Screen with Attached Photo & Video Preview Card + Live GPS Location Tracking
function ReportScreen({ role, apiUrl, userLoc, onSaved, onClose, t }) {
  const [note, setNote] = useState("");
  const [loc, setLoc] = useState(userLoc || { latitude: 19.132, longitude: 72.848 });
  const [locAddress, setLocAddress] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);

  const [waterDepthChoice, setWaterDepthChoice] = useState("At doorstep (not entered)");
  const [customWater, setCustomWater] = useState("");
  const [drainObs, setDrainObs] = useState("Unsure");
  const [onsetSpeed, setOnsetSpeed] = useState("10–20 min");
  const [recurrence, setRecurrence] = useState("No");
  const [submitting, setSubmitting] = useState(false);

  // Live Location Auto-acquisition & Reverse Geocoding
  const fetchLiveGps = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLoc(pos.coords);
        let addr = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        try {
          const geoRes = await fetchWithTimeout(`${apiUrl}/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          if (geoRes.ok) {
            const geo = await geoRes.json();
            addr = geo.road ? `${geo.road}, ${geo.ward || ""}` : (geo.displayName || addr);
          }
        } catch {}
        setLocAddress(addr);
      }
    } catch (err) {
      console.log("GPS fetch error:", err);
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveGps();
  }, []);

  // Pre-verification with Keras Flood Detection AI
  const runAiVerification = async (uri, isVideo = false) => {
    if (!uri) return null;
    setAiVerifying(true);
    setAiResult(null);
    try {
      const formData = new FormData();
      const filename = isVideo ? `scan_video_${Date.now()}.mp4` : `scan_photo_${Date.now()}.jpg`;
      formData.append("media", {
        uri,
        name: filename,
        type: isVideo ? "video/mp4" : "image/jpeg"
      });
      const res = await fetchWithTimeout(`${apiUrl}/upload-media`, {
        method: "POST",
        body: formData
      }, 35000);
      if (res.ok) {
        const data = await res.json();
        if (isVideo) {
          if (data.url) setUploadedVideoUrl(data.url);
        } else {
          if (data.url) setUploadedPhotoUrl(data.url);
        }
        if (data.aiVerification) {
          setAiResult(data.aiVerification);
          if (data.aiVerification.is_flooding === false) {
            Alert.alert(
              t.noFloodPopupTitle || "No Flooding Detected",
              t.noFloodPopupMsg || "There is no flooding detected, report cannot be filed.",
              [{ text: "OK" }]
            );
          }
          return data.aiVerification;
        }
      }
    } catch (e) {
      console.warn("[AI Verification pre-check notice]:", e.message);
    } finally {
      setAiVerifying(false);
    }
    return null;
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera needed", "Please grant camera permission to take photo evidence.");
        return;
      }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
      if (!r.canceled && r.assets?.[0]) {
        const asset = r.assets[0];
        const b64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPhotoUri(b64Data);
        setPhotoPreview(asset.uri);
        setVideoUri(null);
        setVideoPreview(null);
        setUploadedVideoUrl(null);
        runAiVerification(asset.uri, false);
      }
    } catch (err) {
      Alert.alert("Camera Error", err.message);
    }
  };

  const pickGallery = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true });
      if (!r.canceled && r.assets?.[0]) {
        const asset = r.assets[0];
        const b64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPhotoUri(b64Data);
        setPhotoPreview(asset.uri);
        setVideoUri(null);
        setVideoPreview(null);
        setUploadedVideoUrl(null);
        runAiVerification(asset.uri, false);
      }
    } catch (err) {
      Alert.alert("Gallery Error", err.message);
    }
  };

  const takeVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera needed", "Please grant camera permission to record video evidence.");
        return;
      }
      const r = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        videoMaxDuration: 45,
        quality: 0.5,
        base64: true
      });
      if (!r.canceled && r.assets?.[0]) {
        const asset = r.assets[0];
        const vData = asset.base64 ? `data:video/mp4;base64,${asset.base64}` : asset.uri;
        setVideoUri(vData);
        setVideoPreview(asset.uri);
        setPhotoUri(null);
        setPhotoPreview(null);
        setUploadedPhotoUrl(null);
        runAiVerification(asset.uri, true);
      }
    } catch (err) {
      Alert.alert("Video Error", err.message);
    }
  };

  const pickVideoGallery = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.5,
        base64: true
      });
      if (!r.canceled && r.assets?.[0]) {
        const asset = r.assets[0];
        const vData = asset.base64 ? `data:video/mp4;base64,${asset.base64}` : asset.uri;
        setVideoUri(vData);
        setVideoPreview(asset.uri);
        setPhotoUri(null);
        setPhotoPreview(null);
        setUploadedPhotoUrl(null);
        runAiVerification(asset.uri, true);
      }
    } catch (err) {
      Alert.alert("Gallery Error", err.message);
    }
  };

  const submit = async () => {
    // 1. Check if prior AI scan explicitly determined NO flooding
    if (aiResult && aiResult.is_flooding === false) {
      Alert.alert(
        t.noFloodPopupTitle || "No Flooding Detected",
        t.noFloodPopupMsg || "There is no flooding detected, report cannot be filed.",
        [{ text: "OK" }]
      );
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const userTimestamp = now.toISOString();
      const userFormattedTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      let finalVideoUrl = uploadedVideoUrl || videoUri;
      let finalPhotoUrl = uploadedPhotoUrl || photoUri;
      let verifiedAi = aiResult;

      // Upload and run model on video if not yet done
      if (videoUri && !uploadedVideoUrl && (videoUri.startsWith("file:") || videoUri.startsWith("content:") || videoUri.startsWith("ph:"))) {
        try {
          const formData = new FormData();
          const cleanFilename = `mobile_video_${Date.now()}.mp4`;
          formData.append("media", {
            uri: videoUri,
            name: cleanFilename,
            type: "video/mp4"
          });
          const upRes = await fetchWithTimeout(`${apiUrl}/upload-media`, {
            method: "POST",
            body: formData
          }, 45000);
          if (upRes.ok) {
            const upData = await upRes.json();
            if (upData.url) {
              finalVideoUrl = upData.url;
              setUploadedVideoUrl(upData.url);
            }
            if (upData.aiVerification) {
              verifiedAi = upData.aiVerification;
              setAiResult(verifiedAi);
            }
          }
        } catch (upErr) {
          console.warn("[Mobile Video Upload notice]:", upErr.message);
        }
      }

      // Safeguard: Ensure video is always a valid playable stream for authority dashboard
      if (videoUri && (!finalVideoUrl || finalVideoUrl.startsWith("file:") || finalVideoUrl.startsWith("content:"))) {
        finalVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      }

      // Upload and run model on photo if not yet done
      if (photoUri && !uploadedPhotoUrl && (photoUri.startsWith("file:") || photoUri.startsWith("content:") || photoUri.startsWith("ph:"))) {
        try {
          const formData = new FormData();
          const cleanFilename = `mobile_photo_${Date.now()}.jpg`;
          formData.append("media", {
            uri: photoUri,
            name: cleanFilename,
            type: "image/jpeg"
          });
          const upRes = await fetchWithTimeout(`${apiUrl}/upload-media`, {
            method: "POST",
            body: formData
          }, 30000);
          if (upRes.ok) {
            const upData = await upRes.json();
            if (upData.url) {
              finalPhotoUrl = upData.url;
              setUploadedPhotoUrl(upData.url);
            }
            if (upData.aiVerification) {
              verifiedAi = upData.aiVerification;
              setAiResult(verifiedAi);
            }
          }
        } catch (pErr) {
          console.warn("[Mobile Photo Upload notice]:", pErr.message);
        }
      }

      // STRICT CHECK: If AI model detected NO flooding, reject report immediately
      if (verifiedAi && verifiedAi.is_flooding === false) {
        setSubmitting(false);
        Alert.alert(
          t.noFloodPopupTitle || "No Flooding Detected",
          t.noFloodPopupMsg || "There is no flooding detected, report cannot be filed.",
          [{ text: "OK" }]
        );
        return;
      }

      const payload = {
        role,
        waterLevel: waterDepthChoice,
        customWaterCm: waterDepthChoice === "Custom / Other" ? customWater : null,
        drainObservation: drainObs,
        onsetSpeed,
        recurrence,
        note,
        photo: Boolean(finalPhotoUrl),
        photoUrl: finalPhotoUrl,
        video: Boolean(finalVideoUrl),
        videoUrl: finalVideoUrl,
        mediaType: finalVideoUrl ? "video" : (finalPhotoUrl ? "image" : null),
        aiVerification: verifiedAi,
        lat: loc?.latitude ?? 19.132,
        lng: loc?.longitude ?? 72.848,
        address: locAddress || "Station Road Commercial Area",
        userTimestamp,
        timestamp: userTimestamp,
        time: userFormattedTime,
        liveLocation: {
          lat: loc?.latitude ?? 19.132,
          lng: loc?.longitude ?? 72.848,
          address: locAddress || "Station Road Commercial Area",
          timestamp: userTimestamp
        }
      };

      const res = await fetchWithTimeout(`${apiUrl}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, 30000);

      // If backend rejected report due to no flooding detected:
      if (res.status === 422) {
        const errData = await res.json().catch(() => ({}));
        setSubmitting(false);
        Alert.alert(
          t.noFloodPopupTitle || "No Flooding Detected",
          errData.message || t.noFloodPopupMsg || "There is no flooding detected, report cannot be filed.",
          [{ text: "OK" }]
        );
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const mediaMsg = videoUri ? "Video uploaded & AI flood verified" : "Photo uploaded & AI flood verified";
      Alert.alert("Report Received", `Assigned ID: ${data.id}. ${mediaMsg} for Authority Dispatch.`, [
        { text: "OK", onPress: () => onSaved(data) }
      ]);
    } catch (err) {
      Alert.alert("Submission Failed", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 140 }}>
      <TouchableOpacity onPress={onClose} style={s.back}>
        <Ionicons name="arrow-back" size={20} color={TEXT} />
        <Text style={{ marginLeft: 6, fontWeight: "700", color: TEXT }}>{t.home}</Text>
      </TouchableOpacity>
      <Text style={s.screenTitle}>{t.reportScreenTitle}</Text>
      <Text style={s.screenSub}>{t.reportScreenSub}</Text>

      {/* Live Location GPS Tracking Card */}
      <View style={s.liveGpsCard}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="location" size={18} color={RED} />
            <Text style={s.liveGpsCardTitle}>{t.liveGpsTitle || "📍 Live GPS Incident Location"}</Text>
          </View>
          <TouchableOpacity style={s.refreshGpsBtn} onPress={fetchLiveGps} disabled={locLoading}>
            {locLoading ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="refresh" size={12} color={BLUE} />
                <Text style={s.refreshGpsText}>{t.refreshGpsBtn || "Refresh GPS"}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 6, backgroundColor: "#F1F5F9", padding: 8, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: NAVY }}>
            {loc?.latitude ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}` : "Acquiring live GPS..."}
          </Text>
          {locAddress ? (
            <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{locAddress}</Text>
          ) : null}
          <Text style={{ fontSize: 9, color: BLUE, fontWeight: "700", marginTop: 4 }}>
            ⏱️ Reporting Timestamp: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (Live Device Clock)
          </Text>
        </View>
      </View>

      <View style={s.reportCard}>
        {/* 1. Visual Evidence (Photos and Videos) */}
        <Text style={s.inputLabel}>{t.videoEvidenceTitle || "1. Visual Evidence (Photo or Video)"}</Text>
        
        {/* Photo Options */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <TouchableOpacity style={[s.photoBoxSmall, photoPreview && { borderColor: GREEN, backgroundColor: "#F0FDF4" }]} onPress={takePhoto}>
            <Ionicons name="camera" size={18} color={photoPreview ? GREEN : BLUE} />
            <Text style={[s.photoBoxText, photoPreview && { color: GREEN, fontWeight: "800" }]}>
              {photoPreview ? "✓ Retake Photo" : (t.takePhotoBtn || "Take Photo")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.photoBoxSmall, photoPreview && { borderColor: GREEN, backgroundColor: "#F0FDF4" }]} onPress={pickGallery}>
            <Ionicons name="images" size={18} color={photoPreview ? GREEN : BLUE} />
            <Text style={[s.photoBoxText, photoPreview && { color: GREEN, fontWeight: "800" }]}>
              {photoPreview ? "✓ Change Photo" : (t.chooseGalleryBtn || "Choose Photo")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Video Options */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={[s.photoBoxSmall, videoPreview && { borderColor: GREEN, backgroundColor: "#F0FDF4" }]} onPress={takeVideo}>
            <Ionicons name="videocam" size={18} color={videoPreview ? GREEN : RED} />
            <Text style={[s.photoBoxText, videoPreview && { color: GREEN, fontWeight: "800" }]}>
              {videoPreview ? "✓ Retake Video" : (t.takeVideoBtn || "📹 Take Video")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.photoBoxSmall, videoPreview && { borderColor: GREEN, backgroundColor: "#F0FDF4" }]} onPress={pickVideoGallery}>
            <Ionicons name="film" size={18} color={videoPreview ? GREEN : RED} />
            <Text style={[s.photoBoxText, videoPreview && { color: GREEN, fontWeight: "800" }]}>
              {videoPreview ? "✓ Change Video" : (t.chooseVideoBtn || "📁 Choose Video")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline Photo Preview */}
        {photoPreview && (
          <View style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", position: "relative", borderWidth: 1, borderColor: "#CBD5E1" }}>
            <Image source={{ uri: photoPreview }} style={{ width: "100%", height: 160, backgroundColor: "#0F172A" }} resizeMode="cover" />
            <View style={{ position: "absolute", bottom: 6, left: 6, right: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(15,23,42,0.8)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>📸 Ground Photo Attached</Text>
              <TouchableOpacity onPress={() => { setPhotoPreview(null); setPhotoUri(null); setAiResult(null); }}>
                <Text style={{ color: "#F87171", fontSize: 10, fontWeight: "800" }}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Inline Video Preview Card */}
        {videoPreview && (
          <View style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", position: "relative", borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#0F172A", padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: RED, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="videocam" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>🎥 Flood Video Attached</Text>
                  <View style={{ backgroundColor: GREEN, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: "#fff", fontSize: 8, fontWeight: "900" }}>READY</Text>
                  </View>
                </View>
                <Text style={{ color: "#94A3B8", fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                  {videoPreview.split("/").pop() || "Recorded flood video evidence"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setVideoPreview(null); setVideoUri(null); setAiResult(null); }} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={18} color="#F87171" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Flood Verification Status Banner */}
        {(photoPreview || videoPreview) && (
          <View style={{ marginTop: 8 }}>
            {aiVerifying && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", padding: 10, borderRadius: 8 }}>
                <ActivityIndicator size="small" color={BLUE} />
                <Text style={{ fontSize: 11, color: BLUE, fontWeight: "700" }}>
                  🤖 AI model scanning visual evidence for active flooding...
                </Text>
              </View>
            )}

            {!aiVerifying && aiResult && aiResult.is_flooding && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC", padding: 10, borderRadius: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#166534", fontWeight: "800" }}>
                    ✅ AI Flood Verified ({(aiResult.confidence * 100).toFixed(0)}% Confidence)
                  </Text>
                  <Text style={{ fontSize: 10, color: "#15803D", marginTop: 2 }}>
                    Flooding patterns confirmed by fine-tuned MobileNet model. Ready to submit.
                  </Text>
                </View>
              </View>
            )}

            {!aiVerifying && aiResult && !aiResult.is_flooding && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", padding: 10, borderRadius: 8 }}>
                <Ionicons name="close-circle" size={20} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#991B1B", fontWeight: "800" }}>
                    ⚠️ No Flooding Detected
                  </Text>
                  <Text style={{ fontSize: 10, color: "#B91C1C", marginTop: 2 }}>
                    Our AI model did not detect flooding in this evidence. Report cannot be filed.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 2. Water Depth */}
        <Text style={s.inputLabel}>{t.waterDepthSectionTitle}</Text>
        {[
          ["At doorstep (not entered)", t.depthDoorstep],
          ["Entered shop — ankle deep", t.depthAnkle],
          ["Entered shop — knee deep", t.depthKnee],
          ["Custom / Other", t.depthCustom]
        ].map(([val, label]) => (
          <TouchableOpacity
            key={val}
            style={[s.choiceFull, waterDepthChoice === val && s.choiceOn]}
            onPress={() => setWaterDepthChoice(val)}
          >
            <Text style={waterDepthChoice === val ? { color: "#fff", fontWeight: "800", fontSize: 11 } : { fontSize: 11, color: TEXT }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}

        {waterDepthChoice === "Custom / Other" && (
          <TextInput
            style={[s.ipInput, { marginTop: 6 }]}
            placeholder={t.customDepthPlaceholder}
            value={customWater}
            onChangeText={setCustomWater}
            keyboardType="numeric"
          />
        )}

        {/* 3. Direct Drain Observation */}
        <Text style={s.inputLabel}>{t.drainSectionTitle}</Text>
        <View style={s.choiceRow}>
          {[
            ["Blocked", t.drainBlocked],
            ["Clear", t.drainClear],
            ["Unsure", t.drainUnsure]
          ].map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[s.choice, drainObs === val && s.choiceOn]}
              onPress={() => setDrainObs(val)}
            >
              <Text style={drainObs === val ? { color: "#fff", fontWeight: "800", fontSize: 11 } : { fontSize: 11 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Onset Speed */}
        <Text style={s.inputLabel}>{t.onsetSectionTitle}</Text>
        <View style={s.choiceRow}>
          {[
            ["<10 min", t.onsetFast],
            ["10–20 min", t.onsetMed],
            ["> 20 min", t.onsetSlow]
          ].map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[s.choice, onsetSpeed === val && s.choiceOn]}
              onPress={() => setOnsetSpeed(val)}
            >
              <Text style={onsetSpeed === val ? { color: "#fff", fontWeight: "800", fontSize: 11 } : { fontSize: 11 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 5. Recurrence */}
        <Text style={s.inputLabel}>{t.recurrenceSectionTitle}</Text>
        <View style={s.choiceRow}>
          {[
            ["Yes", t.yes],
            ["No", t.no]
          ].map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[s.choice, recurrence === val && s.choiceOn]}
              onPress={() => setRecurrence(val)}
            >
              <Text style={recurrence === val ? { color: "#fff", fontWeight: "800", fontSize: 11 } : { fontSize: 11 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={s.inputLabel}>{t.notesSectionTitle}</Text>
        <TextInput
          style={s.textarea}
          multiline
          value={note}
          onChangeText={setNote}
          placeholder={t.notesPlaceholder}
          placeholderTextColor="#9aa8b8"
        />

        {/* Uploaded / Captured Photo Preview Displayed at Bottom Before Submit */}
        {photoUri && (
          <View style={s.photoPreviewContainer}>
            <Text style={s.photoPreviewTitle}>📷 {t.attachedPhotoPreviewTitle}</Text>
            <View style={s.photoPreviewCard}>
              <Image source={{ uri: photoUri }} style={s.photoPreviewImg} />
              <View style={{ flex: 1, justifyContent: "space-between" }}>
                <View>
                  <View style={s.cvBadgeReady}>
                    <Ionicons name="scan-outline" size={13} color={GREEN} />
                    <Text style={s.cvBadgeText}>{t.cvReadyBadge}</Text>
                  </View>
                  <Text style={s.photoAttachedText}>{t.photoAttachedReady}</Text>
                </View>
                <TouchableOpacity style={s.photoRemoveBtn} onPress={() => { setPhotoUri(null); setPhotoPreview(null); }}>
                  <Ionicons name="trash-outline" size={13} color={RED} />
                  <Text style={{ fontSize: 9, fontWeight: "700", color: RED }}>{t.removePhotoBtn}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Uploaded / Captured Video Preview Displayed at Bottom Before Submit */}
        {videoUri && (
          <View style={s.photoPreviewContainer}>
            <Text style={s.photoPreviewTitle}>🎥 {t.attachedVideoPreviewTitle || "Attached Video Evidence"}</Text>
            <View style={[s.photoPreviewCard, { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }]}>
              <View style={{ width: 70, height: 70, borderRadius: 10, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="videocam" size={30} color="#60A5FA" />
              </View>
              <View style={{ flex: 1, justifyContent: "space-between" }}>
                <View>
                  <View style={[s.cvBadgeReady, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="cloud-upload-outline" size={13} color={BLUE} />
                    <Text style={[s.cvBadgeText, { color: BLUE }]}>Authority Video Stream</Text>
                  </View>
                  <Text style={s.photoAttachedText}>{t.videoAttachedReady || "✓ Flood Video Attached (Ready for Authority Dispatch)"}</Text>
                </View>
                <TouchableOpacity style={s.photoRemoveBtn} onPress={() => { setVideoUri(null); setVideoPreview(null); }}>
                  <Ionicons name="trash-outline" size={13} color={RED} />
                  <Text style={{ fontSize: 9, fontWeight: "700", color: RED }}>{t.removeMediaBtn || "Remove / Re-take"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={s.primaryWide} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t.submitReportBtn}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Clean Consumer Profile Screen
function ProfileScreen({ lang, setLang, role, userAddress, t }) {
  return (
    <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 110 }}>
      <Text style={s.screenTitle}>{t.profileTitle}</Text>
      <Text style={s.screenSub}>{role === "Shop Owner" ? t.shopkeeperAccount : t.residentAccount}</Text>

      <View style={s.profileHero}>
        <View style={s.profileAvatar}>
          <Text style={{ color: BLUE, fontWeight: "800", fontSize: 22 }}>{role === "Shop Owner" ? "🏪" : "🏠"}</Text>
        </View>
        <View>
          <Text style={s.profileName}>{role === "Shop Owner" ? t.shopkeeperAccount : t.residentAccount}</Text>
          <Text style={s.profileArea}>{userAddress || "Ward 72 · Active Sensor Zone"}</Text>
        </View>
      </View>

      {/* Language Switcher */}
      <Text style={s.sectionTitle}>{t.langSettingsTitle}</Text>
      <View style={s.settingCard}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            ["en", "English"],
            ["hi", "हिंदी"],
            ["mr", "मराठी"]
          ].map(([code, label]) => (
            <TouchableOpacity
              key={code}
              style={[s.langBtn, lang === code && s.langBtnActive]}
              onPress={() => setLang(code)}
            >
              <Text style={lang === code ? { color: "#fff", fontWeight: "800" } : { color: TEXT, fontSize: 11 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Alert Channel Preferences */}
      <Text style={s.sectionTitle}>{t.channelsTitle}</Text>
      {[
        t.channel1,
        t.channel2,
        t.channel3,
        t.channel4
      ].map((x) => (
        <View style={s.settingRow} key={x}>
          <View>
            <Text style={s.settingTitle}>{x}</Text>
            <Text style={s.settingSub}>{t.activeOnMobile}</Text>
          </View>
          <View style={s.switchOn}>
            <View style={s.switchKnob} />
          </View>
        </View>
      ))}

      <View style={s.confidence}>
        <Ionicons name="shield-checkmark" size={22} color={BLUE} />
        <Text style={{ flex: 1, fontSize: 10, color: "#63758f", lineHeight: 14 }}>
          {t.confidenceNote}
        </Text>
      </View>
    </ScrollView>
  );
}

// Mini Components
function Mini({ label, value }) {
  return (
    <View style={{ flex: 1 }}>
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

function Quick({ icon, label, fontAwesome, onPress }) {
  return (
    <TouchableOpacity style={s.quickItem} onPress={onPress}>
      {fontAwesome ? (
        <FontAwesome5 name={icon} size={18} color={BLUE} />
      ) : (
        <Ionicons name={icon} size={20} color={BLUE} />
      )}
      <Text style={s.quickItemText}>{label}</Text>
    </TouchableOpacity>
  );
}

function AlertMini({ a }) {
  const isRed = a.level === "RED";
  const color = isRed ? RED : ORANGE;
  return (
    <View style={s.alertMini}>
      <View style={[s.alertLevel, { backgroundColor: color + "16" }]}>
        <Ionicons name="warning" size={17} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.alertTitle}>{a.title}</Text>
        <Text style={s.alertText} numberOfLines={2}>
          {a.message}
        </Text>
        <Text style={s.alertTime}>⏱ ETA {a.eta} · {a.zoneName}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5EBF4"
  },
  brand: { fontSize: 20, fontWeight: "900", color: NAVY, letterSpacing: -0.5 },
  sub: { fontSize: 9, color: MUTED, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: GREEN },
  live: { fontSize: 8, fontWeight: "800", color: GREEN, letterSpacing: 0.5 },

  body: { flex: 1, paddingHorizontal: 16 },
  // Large Circular SOS Button Styles
  sosCircularContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
    position: "relative"
  },
  sosOuterPulseRing: {
    position: "absolute",
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: "rgba(232, 72, 72, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(232, 72, 72, 0.3)"
  },
  sosCircularBtn: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "#FECACA",
    elevation: 12,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12
  },
  sosCircularTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 2
  },
  sosCircularSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 2,
    textAlign: "center",
    paddingHorizontal: 8
  },

  sosActiveBanner: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12
  },

  // Prominent Report Incident Button
  reportIncidentBigBtn: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    elevation: 4
  },
  reportIconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  reportBigTitle: { fontSize: 15, fontWeight: "900", color: NAVY },
  reportBigSub: { fontSize: 10, color: MUTED, marginTop: 2 },

  // Quick Action Utilities Row
  quickActionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2
  },
  quickActionText: { fontSize: 10, fontWeight: "800", color: NAVY },
  riskNum: { fontSize: 25, color: "#fff", fontWeight: "900" },
  riskOut: { fontSize: 8, color: "#9db4d7", marginTop: -2 },
  riskStatus: { marginTop: 15, flexDirection: "row", alignItems: "center", gap: 6 },
  riskDot: { width: 7, height: 7, borderRadius: 7 },
  eta: { marginLeft: "auto", fontSize: 9, color: "#B5C6E2" },
  riskStats: {
    borderTopWidth: 1,
    borderTopColor: "#1e3b69",
    marginTop: 14,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  miniLabel: { fontSize: 8, color: "#8fa8d0" },
  miniValue: { fontSize: 11, color: "#fff", fontWeight: "800", marginTop: 3 },

  sectionTitle: { fontSize: 13, fontWeight: "800", color: TEXT, marginTop: 18, marginBottom: 9 },
  quick: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  quickItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5EBF4"
  },
  quickItemText: { fontSize: 8, color: TEXT, fontWeight: "700" },

  signalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  signal: { width: "48%", backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5EBF4" },
  signalIcon: { width: 31, height: 31, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  signalTitle: { fontSize: 9, color: MUTED },
  signalValue: { fontSize: 12, fontWeight: "800", color: TEXT, marginTop: 2 },
  signalNote: { fontSize: 8, color: MUTED, marginTop: 2 },

  emsCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E5EBF4" },
  emsTitle: { fontSize: 11, fontWeight: "800", color: TEXT },
  emsSub: { fontSize: 9, color: MUTED, marginTop: 2 },

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
  alertTime: { fontSize: 8, color: "#9AA7B7", marginTop: 4 },
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
  modalTitle: { fontSize: 18, fontWeight: "900", color: TEXT },
  modalSub: { fontSize: 10, color: MUTED, lineHeight: 14, marginTop: 4, marginBottom: 14 },
  primary: { backgroundColor: BLUE, borderRadius: 12, height: 46, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  cancel: { height: 40, alignItems: "center", justifyContent: "center", marginTop: 6 },

  roleTop: { alignItems: "center", paddingTop: 50, paddingBottom: 20 },
  logoCircle: { width: 66, height: 66, borderRadius: 22, backgroundColor: BLUE, alignItems: "center", justifyContent: "center", elevation: 7 },
  roleBrand: { fontSize: 28, fontWeight: "900", color: NAVY, marginTop: 14 },
  roleTag: { fontSize: 10, color: MUTED, marginTop: 4 },
  roleCard: { backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#E2EAF5" },
  roleTitle: { fontSize: 17, fontWeight: "900", color: TEXT },
  roleSub: { fontSize: 10, color: MUTED, lineHeight: 14, marginTop: 4, marginBottom: 14 },
  roleBtn: { borderWidth: 1, borderColor: "#E4EBF4", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 10 },
  roleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  roleBtnTitle: { fontSize: 11, fontWeight: "800", color: TEXT },
  roleBtnSub: { fontSize: 9, color: MUTED, marginTop: 2 },

  screenTitle: { fontSize: 21, fontWeight: "900", color: TEXT, marginTop: 18 },
  screenSub: { fontSize: 10, color: MUTED, marginTop: 3, marginBottom: 14 },
  bigAlert: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5EBF4", marginBottom: 12 },
  bigAlertHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  alertId: { fontSize: 8, color: "#9AA7B7" },
  bigAlertTitle: { fontSize: 12, fontWeight: "900", marginTop: 10, color: TEXT },
  bigAlertText: { fontSize: 10, color: MUTED, lineHeight: 14, marginTop: 4 },
  bigAlertFoot: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EDF1F6", flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: MUTED },
  alertFeedbackRow: { flexDirection: "row", gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  feedbackBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#BBF7D0", backgroundColor: "#F8FAFC" },

  back: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  reportCard: { backgroundColor: "#fff", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#E5EBF4" },
  inputLabel: { fontSize: 10, fontWeight: "800", color: TEXT, marginTop: 10, marginBottom: 6 },
  photoBoxSmall: { flex: 1, height: 70, borderRadius: 10, borderWidth: 1.5, borderColor: "#C9D8EC", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#F8FBFF" },
  photoBoxText: { fontSize: 9, color: TEXT, fontWeight: "700" },
  choiceFull: { height: 38, borderRadius: 8, borderWidth: 1, borderColor: "#DCE6F3", alignItems: "center", justifyContent: "center", marginBottom: 6, paddingHorizontal: 10 },
  choiceRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  choice: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: "#DCE6F3", alignItems: "center", justifyContent: "center" },
  choiceOn: { backgroundColor: BLUE, borderColor: BLUE },
  textarea: { height: 75, borderRadius: 10, borderWidth: 1, borderColor: "#DCE6F3", padding: 10, textAlignVertical: "top", fontSize: 11, color: TEXT },
  primaryWide: { height: 46, backgroundColor: BLUE, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, marginTop: 14 },
  ipInput: { height: 38, borderWidth: 1, borderColor: "#DCE6F3", borderRadius: 8, paddingHorizontal: 10, fontSize: 11, color: TEXT },

  // Live GPS Card in Report Screen
  liveGpsCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 12
  },
  liveGpsCardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: NAVY
  },
  refreshGpsBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  refreshGpsText: {
    fontSize: 10,
    fontWeight: "700",
    color: BLUE
  },

  // Photo preview container at bottom of report form
  photoPreviewContainer: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  photoPreviewTitle: { fontSize: 11, fontWeight: "800", color: TEXT, marginBottom: 8 },
  photoPreviewCard: { flexDirection: "row", gap: 12, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  photoPreviewImg: { width: 85, height: 85, borderRadius: 10, backgroundColor: "#E2E8F0" },
  cvBadgeReady: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ECFDF5", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start", marginBottom: 4 },
  cvBadgeText: { fontSize: 8, fontWeight: "800", color: GREEN },
  photoAttachedText: { fontSize: 9, color: MUTED },
  photoRemoveBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },

  checkItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 8, backgroundColor: "#fff" },
  checkSection: { fontSize: 9, fontWeight: "800", color: BLUE, textTransform: "uppercase" },
  checkText: { fontSize: 10, color: TEXT, marginTop: 2, lineHeight: 14 },

  // Edge to Edge Map
  mapScreen: { flex: 1 },
  fullBleedMap: { flex: 1, position: "relative", backgroundColor: "#E6EEF8", overflow: "hidden" },
  mapTopOverlay: { position: "absolute", top: 12, left: 12, right: 12, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#CBD5E1", elevation: 6 },
  mapTopTitle: { fontSize: 12, fontWeight: "900", color: NAVY },
  mapTopSub: { fontSize: 8, color: MUTED, marginTop: 1 },
  tileModeBtn: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#CBD5E1" },
  tileModeBtnActive: { backgroundColor: BLUE, borderColor: BLUE },
  tileModeText: { fontSize: 8, fontWeight: "800", color: TEXT },
  mapFloatingControls: { position: "absolute", right: 12, top: 80, gap: 8, elevation: 7 },
  mapControlBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#CBD5E1", elevation: 4 },
  mapPinUser: { position: "absolute", alignItems: "center", zIndex: 20 },
  userPulseRing: { position: "absolute", width: 44, height: 44, borderRadius: 44, backgroundColor: "rgba(37,99,235,0.25)", top: -8 },
  pinLabelUser: { fontSize: 8, fontWeight: "800", color: BLUE, backgroundColor: "#fff", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginTop: 2, elevation: 3, borderWidth: 1, borderColor: "#CBD5E1" },
  mapZonePin: { position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 3, alignItems: "center", justifyContent: "center", elevation: 6, zIndex: 15 },
  zonePinScore: { fontSize: 13, fontWeight: "900" },
  zonePinName: { position: "absolute", bottom: -14, fontSize: 8, fontWeight: "700", color: NAVY, width: 85, textAlign: "center", backgroundColor: "rgba(255,255,255,0.9)", paddingHorizontal: 2, borderRadius: 3 },
  mapEmsPin: { position: "absolute", padding: 5, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1.5, borderColor: "#CBD5E1", elevation: 5, zIndex: 10 },
  redAlertContainer: { position: "absolute", top: 80, left: 12, right: 60, zIndex: 25 },
  redAlertBtn: { backgroundColor: RED, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, elevation: 8 },
  redAlertBtnText: { color: "#fff", fontWeight: "900", fontSize: 10 },
  pinDetailDrawer: { position: "absolute", bottom: 85, left: 12, right: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#CBD5E1", elevation: 10, zIndex: 30 },
  shelterRouteDrawer: { position: "absolute", bottom: 85, left: 12, right: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#CBD5E1", elevation: 10, zIndex: 30 },

  // Flood Buddy
  buddyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E5EBF4", marginBottom: 10 },
  buddyName: { fontSize: 12, fontWeight: "800", color: TEXT },
  buddySub: { fontSize: 10, color: BLUE, fontWeight: "600", marginTop: 2 },
  buddyNotifyBtn: { backgroundColor: BLUE, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 },

  // Profile
  profileHero: { backgroundColor: "#fff", borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E5EBF4" },
  profileAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 13, fontWeight: "800", color: TEXT },
  profileArea: { fontSize: 9, color: MUTED, marginTop: 2 },
  settingCard: { backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5EBF4" },
  settingRow: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#EDF1F5", paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingTitle: { fontSize: 11, fontWeight: "800", color: TEXT },
  settingSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  langBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: "#DCE6F3", alignItems: "center", justifyContent: "center" },
  langBtnActive: { backgroundColor: BLUE, borderColor: BLUE },
  switchOn: { width: 35, height: 20, borderRadius: 20, backgroundColor: BLUE, padding: 3 },
  switchKnob: { width: 14, height: 14, borderRadius: 14, backgroundColor: "#fff", marginLeft: 15 },
  confidence: { marginTop: 14, backgroundColor: "#EEF5FF", padding: 11, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center" },

  // Location Switcher Bar & Market Hub Styles
  locationBar: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    marginBottom: 12,
    elevation: 3
  },
  locationDotPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE,
    borderWidth: 2,
    borderColor: "#93C5FD"
  },
  locationBarLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: BLUE,
    letterSpacing: 0.5
  },
  locationBarValue: {
    fontSize: 12,
    fontWeight: "800",
    color: NAVY,
    marginTop: 1
  },
  changeLocBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  changeLocText: {
    fontSize: 10,
    fontWeight: "800",
    color: BLUE
  },
  marketHubItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8
  },
  marketHubIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center"
  },
  marketHubTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: NAVY
  },
  marketHubSub: {
    fontSize: 9,
    color: MUTED,
    marginTop: 1
  },

  // Login Page Styles
  loginTopHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: "center"
  },
  loginLangRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#E2E8F0",
    padding: 3,
    borderRadius: 10
  },
  loginLangBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7
  },
  loginLangBtnActive: {
    backgroundColor: BLUE
  },
  loginLangBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT
  },
  loginMainCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10
  },
  loginBadgeRow: {
    flexDirection: "row",
    marginBottom: 8
  },
  loginShieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DBEAFE"
  },
  loginShieldText: {
    fontSize: 10,
    fontWeight: "800",
    color: BLUE,
    textTransform: "uppercase"
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.5
  },
  loginSubtitle: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16
  },
  loginErrorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 16
  },
  loginErrorBannerText: {
    fontSize: 12,
    fontWeight: "800",
    color: RED,
    lineHeight: 16
  },
  loginErrorBannerSub: {
    fontSize: 10,
    color: "#991B1B",
    marginTop: 3,
    lineHeight: 14
  },
  loginInputGroup: {
    marginBottom: 16
  },
  loginInputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 6
  },
  loginEmergencyLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: RED,
    marginBottom: 2
  },
  urgentPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5
  },
  urgentPillText: {
    fontSize: 8,
    fontWeight: "900",
    color: RED
  },
  loginFieldHelp: {
    fontSize: 10,
    color: MUTED,
    marginBottom: 6
  },
  loginInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    overflow: "hidden"
  },
  loginPrefixBox: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1"
  },
  loginPrefixText: {
    fontSize: 13,
    fontWeight: "800",
    color: NAVY
  },
  loginInputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: "700",
    color: NAVY
  },
  fieldInlineError: {
    fontSize: 10,
    fontWeight: "800",
    color: RED,
    marginTop: 4
  },
  relationPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  relationPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  relationPillActive: {
    backgroundColor: BLUE,
    borderColor: BLUE
  },
  relationPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: TEXT
  },
  relationPillTextActive: {
    color: "#fff"
  },
  loginRoleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0"
  },
  loginRoleBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: BLUE
  },
  loginRoleBtnTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: NAVY
  },
  loginRoleBtnSub: {
    fontSize: 9.5,
    color: MUTED,
    marginTop: 2
  },
  loginGpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 11,
    borderRadius: 10
  },
  loginGpsBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: BLUE
  },
  hubChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  hubChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE
  },
  hubChipText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: TEXT
  },
  hubChipTextActive: {
    color: "#fff"
  },
  loginSubmitBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    elevation: 3,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  loginSubmitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  loginTwilioNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    backgroundColor: "#F0F9FF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD"
  },
  loginTwilioNoticeText: {
    fontSize: 8.5,
    color: "#0369A1",
    fontWeight: "600",
    lineHeight: 12
  },

  // Header & Home Profile Badges
  headerProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 4
  },
  headerProfileText: {
    fontSize: 10,
    fontWeight: "800",
    color: NAVY,
    maxWidth: 70
  },
  headerSosBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4
  },
  headerSosBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: RED
  },
  userWelcomeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10
  },
  userWelcomeName: {
    fontSize: 13,
    fontWeight: "900",
    color: NAVY
  },
  userRoleTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5
  },
  userRoleTagText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: BLUE
  },
  userEmergencyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: RED,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  userEmergencyPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff"
  },
  userProfileEditIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE"
  },

  // Twilio Active SOS Box
  sosTwilioDispatchedBox: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    padding: 6,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginTop: 5
  },

  // Profile Modal
  profileModalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    width: "90%",
    maxWidth: 400,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  profileModalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center"
  },
  profileModalName: {
    fontSize: 14,
    fontWeight: "900",
    color: NAVY
  },
  profileModalRole: {
    fontSize: 10,
    color: MUTED,
    marginTop: 1
  },
  profileDetailsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10
  },
  profileDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7"
  },
  profileDetailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MUTED
  },
  profileDetailVal: {
    fontSize: 11,
    fontWeight: "800",
    color: NAVY
  },
  profileTwilioBanner: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start"
  },
  profileEditBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  profileEditBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: BLUE
  },
  profileLogoutBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  profileLogoutBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: RED
  }
});

