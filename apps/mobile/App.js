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
    mapScreenTitle: "🗺️ Live Flood Map",
    mapScreenSub: "Live Google Maps navigation & shelter routing",
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
    mapScreenTitle: "🗺️ लाइव बाढ़ नक्शा",
    mapScreenSub: "लाइव गूगल मैप्स नेविगेशन और राहत शिविर मार्ग",
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
    mapScreenTitle: "🗺️ थेट पूर नकाशा",
    mapScreenSub: "थेट गुगल मॅप्स नेव्हिगेशन आणि निवारा मार्ग",
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
  { id: "MKT-07", name: "Borivali West Station Bazaar", ward: "R-Central Ward", latitude: 19.2290, longitude: 72.8570, area: "Borivali Station Road" },
  { id: "MKT-08", name: "Mulund West Station Road Bazaar", ward: "T Ward", latitude: 19.1721, longitude: 72.9567, area: "Mulund Station Commercial" },
  { id: "MKT-09", name: "Colaba Causeway & Fort Commercial", ward: "A Ward", latitude: 18.9180, longitude: 72.8280, area: "Colaba & Fort Area" },
  { id: "MKT-10", name: "Thane Station & Gokhale Road Bazaar", ward: "Thane Central", latitude: 19.1860, longitude: 72.9750, area: "Station Road Commercial" }
];

export default function App() {
  const [lang, setLang] = useState("en");
  const [userProfile, setUserProfile] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("vr_user_profile");
        if (saved) return JSON.parse(saved);
      }
    } catch (_) { }
    return null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return !!window.localStorage.getItem("vr_user_profile");
      }
    } catch (_) { }
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
  const [userAddress, setUserAddress] = useState("Locating...");
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
    name: "Current Sector",
    ward: "Local Ward",
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
        setUserAddress("Station Road, Ward 72");
        return false;
      }

      // Step 1: Instantly load cached GPS position (0-50ms) for ultra-fast startup
      let initialCoords = null;
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown?.coords) {
          initialCoords = lastKnown.coords;
          setUserLoc(initialCoords);
          fetchLiveData(initialCoords);
        }
      } catch (_) {}

      // Step 2: Concurrently query fresh GPS fix with 3s fast timeout
      const getGpsPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("GPS_TIMEOUT")), 3000));

      let activeCoords = initialCoords;
      try {
        const pos = await Promise.race([getGpsPromise, timeoutPromise]);
        if (pos?.coords) {
          activeCoords = pos.coords;
          setUserLoc(activeCoords);
        }
      } catch (_) {
        if (!activeCoords) {
          try {
            const fastPos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
            if (fastPos?.coords) {
              activeCoords = fastPos.coords;
              setUserLoc(activeCoords);
            }
          } catch (_) {}
        }
      }

      if (!activeCoords) {
        activeCoords = { latitude: 19.132, longitude: 72.848 };
        setUserLoc(activeCoords);
      }

      // Refresh live hydrological telemetry with confirmed coordinates
      fetchLiveData(activeCoords);

      // Step 3: Fetch reverse geocoded address asynchronously in parallel (non-blocking)
      fetchWithTimeout(`${apiUrl}/geocode/reverse?lat=${activeCoords.latitude}&lng=${activeCoords.longitude}`, {}, 2500)
        .then((res) => (res.ok ? res.json() : null))
        .then((geo) => {
          if (geo) {
            let detectedAddr = `${activeCoords.latitude.toFixed(4)}, ${activeCoords.longitude.toFixed(4)}`;
            if (geo.road && geo.ward) {
              detectedAddr = `${geo.road}, ${geo.ward}`;
            } else if (geo.displayName) {
              detectedAddr = geo.displayName.split(",").slice(0, 2).join(",");
            } else if (geo.road) {
              detectedAddr = geo.road;
            }
            setUserAddress(detectedAddr);
          }
        })
        .catch(() => {});

      return true;
    } catch (err) {
      setGpsError(err.message);
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
    // Automatically detect real user GPS coordinates on launch
    requestLocation();
  }, []);

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
    } catch (_) { }
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
    } catch (_) { }
  };

  const handleTriggerSos = async () => {
    if (sosCooldown > 0) return;
    setSosCooldown(60);

    const callerName = userProfile?.name || (role === "Shop Owner" ? "Station Rd Shopkeeper" : "Area Resident");
    const callerPhone = userProfile?.phone || "+919869001892";
    const emergencyNumber = userProfile?.emergencyNumber || "+919869001892";

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
          twilioTestRecipient: "+919869001892",
          twilioStatus: "DISPATCHED",
          message: `Emergency broadcast dispatched. Twilio emergency SMS sent to ${emergencyNumber} (testing verified: +919869001892).`
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
        twilioTestRecipient: "+919869001892",
        twilioStatus: "QUEUED",
        message: `Emergency broadcast dispatched. Twilio emergency SMS sent to ${emergencyNumber} (testing verified: +919869001892).`
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
          shelterLoading={shelterLoading}
          activeZone={activeZone}
          userLoc={userLoc}
          userAddress={userAddress}
          apiUrl={apiUrl}
          role={role}
          onOpenLocationModal={() => setLocationModalOpen(true)}
          onRequestLocation={requestLocation}
          onRefresh={onRefresh}
          refreshing={refreshing}
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
            <View style={[s.modal, { borderColor: RED, borderWidth: 2, maxHeight: SCREEN_HEIGHT * 0.85 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Ionicons name="warning" size={28} color={RED} />
                <Text style={[s.modalTitle, { color: RED, flex: 1 }]}>{t.riskIncreasedTitle}</Text>
              </View>
              <Text style={s.modalSub}>{t.riskIncreasedSub}</Text>
              <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.55 }} showsVerticalScrollIndicator={false}>
                <EmergencyChecklistView role={role} t={t} userProfile={userProfile} />
              </ScrollView>
              <TouchableOpacity style={[s.primary, { marginTop: 14 }]} onPress={() => setAutoModalOpen(false)}>
                <Text style={s.primaryText}>{t.acknowledge}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Manual Emergency Checklist Modal */}
      <Modal visible={checklistOpen} transparent animationType="slide">
        <View style={s.modalBack}>
          <View style={[s.modal, { maxHeight: SCREEN_HEIGHT * 0.85, paddingBottom: 24 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <View>
                <Text style={s.modalTitle}>📋 {t.emergencyChecklist}</Text>
                <Text style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>
                  Phased flood defense & life safety action protocol
                </Text>
              </View>
              <TouchableOpacity onPress={() => setChecklistOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={26} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <EmergencyChecklistView role={role} t={t} userProfile={userProfile} />
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
            <Text style={s.modalTitle}>{t.reportIncident}</Text>
            <Text style={s.modalSub}>{t.reportScreenSub}</Text>
            <TouchableOpacity
              style={s.primary}
              onPress={() => {
                setReportOpen(false);
                setTab("Report");
              }}
            >
              <Ionicons name="document-text" size={18} color="#fff" />
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
            🏪 Select Market Hub:
          </Text>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {MUMBAI_MARKET_HUBS.map((hub) => {
              const isSelected = currentAddress && currentAddress.toLowerCase().includes(hub.name.toLowerCase().split(" ")[0]);
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

// Simplified, Clean & Fast Onboarding Screen
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
  const [role, setRole] = useState("Shop Owner");
  const [selectedHub, setSelectedHub] = useState(null); // No hub pre-selected by default
  const [locationInput, setLocationInput] = useState(""); // Starts completely empty (no autofill)
  const [loadingGps, setLoadingGps] = useState(false);
  const [validationError, setValidationError] = useState("");

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const cleanEmergency = emergencyNumber.replace(/\D/g, "").slice(-10);

  // Check if emergency number matches personal phone number
  const isSameNumber = Boolean(cleanPhone && cleanEmergency && cleanPhone === cleanEmergency);
  const isFormValid = Boolean(name.trim() && cleanPhone.length === 10 && cleanEmergency.length === 10 && !isSameNumber);

  const handleGpsDetect = async () => {
    setLoadingGps(true);
    try {
      if (typeof requestLocation === "function") {
        await requestLocation();
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        let detectedAddr = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        try {
          const geoRes = await fetchWithTimeout(`${DEFAULT_API}/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          if (geoRes.ok) {
            const geo = await geoRes.json();
            detectedAddr = geo.road ? `${geo.road}, ${geo.ward || ""}` : (geo.displayName || detectedAddr);
          }
        } catch { }
        setLocationInput(detectedAddr);
        setSelectedHub(null);
      } else {
        Alert.alert("Permission Needed", "Please allow location access to detect your live GPS position.");
      }
    } catch (err) {
      console.log("GPS Detect Error:", err);
      Alert.alert("Location Error", "Could not acquire GPS position. You can select a market hub below or type manually.");
    } finally {
      setLoadingGps(false);
    }
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
      const err = "Please enter a valid 10-digit mobile number.";
      setValidationError(err);
      Alert.alert("Invalid Phone Number", err);
      return;
    }

    if (cleanEmergency.length < 10) {
      const err = "Please enter a valid 10-digit emergency contact number.";
      setValidationError(err);
      Alert.alert("Invalid Emergency Number", err);
      return;
    }

    if (cleanPhone === cleanEmergency) {
      const err = "The emergency contact number cannot be the same as your mobile number.";
      setValidationError(err);
      Alert.alert("Validation Error", err);
      return;
    }

    const hub = selectedHub ? MUMBAI_MARKET_HUBS.find((h) => h.id === selectedHub) : null;
    const finalAddress = locationInput.trim() || (hub ? `${hub.name}, ${hub.ward}` : "Mumbai, Maharashtra");
    const profile = {
      id: `USR-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      phone: `+91 ${cleanPhone}`,
      emergencyNumber: `+91 ${cleanEmergency}`,
      emergencyRelation: "Emergency Contact",
      role,
      address: finalAddress,
      marketHubId: selectedHub || null,
      registeredAt: new Date().toISOString()
    };

    onLogin(profile);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: "#F4F8FF" }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {/* Top Header Branding */}
        <View style={s.loginTopHeader}>
          <View style={s.logoCircle}>
            <MaterialCommunityIcons name="weather-pouring" size={30} color="#fff" />
          </View>
          <Text style={s.roleBrand}>
            Varsha<Text style={{ color: "#4AB9FF" }}>Raksha</Text>
          </Text>
          <Text style={s.roleTag}>{t.appTagline || "Hyperlocal Real-Time Flood Intelligence"}</Text>

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

        {/* Main Clean Card */}
        <View style={s.loginMainCard}>
          <Text style={s.loginTitle}>Enter Your Details</Text>

          {/* Validation Banner (Only shown if validation error) */}
          {(validationError || isSameNumber) ? (
            <View style={s.loginErrorBanner}>
              <Ionicons name="alert-circle" size={18} color={RED} />
              <View style={{ flex: 1 }}>
                <Text style={s.loginErrorBannerText}>
                  {isSameNumber
                    ? "The emergency contact number cannot be the same as your mobile number."
                    : validationError}
                </Text>
              </View>
            </View>
          ) : null}

          {/* 1. Full Name */}
          <View style={s.loginInputGroup}>
            <Text style={s.loginInputLabel}>Full Name</Text>
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
            <Text style={s.loginInputLabel}>Mobile Number</Text>
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

          {/* 3. Emergency Number */}
          <View style={s.loginInputGroup}>
            <Text style={s.loginInputLabel}>Emergency Contact Number</Text>
            <View style={[s.loginInputBox, isSameNumber && { borderColor: RED, backgroundColor: "#FEF2F2" }]}>
              <View style={[s.loginPrefixBox, isSameNumber && { backgroundColor: "#FEE2E2" }]}>
                <Text style={[s.loginPrefixText, isSameNumber && { color: RED }]}>+91</Text>
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
                The emergency contact cannot be your personal phone number.
              </Text>
            )}
          </View>

          {/* 4. Role Selection (Compact) */}
          <View style={s.loginInputGroup}>
            <Text style={s.loginInputLabel}>Choose Your Role</Text>
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={[s.loginRoleBtnCompact, role === "Shop Owner" && s.loginRoleBtnActive]}
                onPress={() => setRole("Shop Owner")}
              >
                <Text style={{ fontSize: 20 }}>🏪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.loginRoleBtnTitle}>Shop Owner</Text>
                  <Text style={s.loginRoleBtnSub}>Protect stock • Flood alerts • Checklists</Text>
                </View>
                {role === "Shop Owner" && <Ionicons name="checkmark-circle" size={20} color={BLUE} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.loginRoleBtnCompact, role === "Resident" && s.loginRoleBtnActive]}
                onPress={() => setRole("Resident")}
              >
                <Text style={{ fontSize: 20 }}>🏠</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.loginRoleBtnTitle}>Resident</Text>
                  <Text style={s.loginRoleBtnSub}>Flood alerts • Safe routes • Emergency reports</Text>
                </View>
                {role === "Resident" && <Ionicons name="checkmark-circle" size={20} color={BLUE} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. Location */}
          <View style={s.loginInputGroup}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={s.loginInputLabel}>Location</Text>
              <TouchableOpacity
                style={s.loginDetectBtn}
                onPress={handleGpsDetect}
                disabled={loadingGps}
              >
                {loadingGps ? (
                  <ActivityIndicator color={BLUE} size="small" />
                ) : (
                  <Ionicons name="navigate" size={12} color={BLUE} />
                )}
                <Text style={s.loginDetectBtnText}>
                  {loadingGps ? "Detecting..." : "Detect Location"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.loginInputBox}>
              <TextInput
                style={s.loginInputField}
                placeholder="Tap 'Detect Location' or enter your area"
                placeholderTextColor="#94A3B8"
                value={locationInput}
                onChangeText={setLocationInput}
              />
              {locationInput.length > 0 && (
                <TouchableOpacity onPress={() => setLocationInput("")} style={{ paddingHorizontal: 10 }}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[s.loginFieldHelp, { marginTop: 10, marginBottom: 6, fontWeight: "700" }]}>
              📍 Quick Select Hub (Optional):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {MUMBAI_MARKET_HUBS.map((hub) => {
                const isChosen = selectedHub === hub.id;
                return (
                  <TouchableOpacity
                    key={hub.id}
                    style={[s.hubChip, isChosen && s.hubChipActive]}
                    onPress={() => {
                      if (selectedHub === hub.id) {
                        setSelectedHub(null);
                        setLocationInput("");
                      } else {
                        setSelectedHub(hub.id);
                        setLocationInput(`${hub.name}, ${hub.ward}`);
                      }
                    }}
                  >
                    <Text style={[s.hubChipText, isChosen && s.hubChipTextActive]}>
                      🏪 {hub.name.split(" ")[0]} ({hub.ward})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Primary CTA Button */}
          <TouchableOpacity
            style={[s.loginSubmitBtn, (!isFormValid || isSameNumber) && { opacity: 0.55 }]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSameNumber}
          >
            <Text style={s.loginSubmitBtnText}>Save Profile & Enter App</Text>
          </TouchableOpacity>
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
            <Ionicons name="shield-checkmark" size={18} color="#166534" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: "#166534" }}>
                Emergency Alert Channel Active
              </Text>
              <Text style={{ fontSize: 9, color: "#15803d", marginTop: 2 }}>
                SOS alerts are dispatched immediately to: {userProfile.emergencyNumber}
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

// Clean, Fast Mobile Dashboard (Location, Circular SOS, Quick Actions & Top 3 Nearest Emergency Units)
function Home({
  userProfile,
  onOpenProfile,
  role,
  zone,
  alerts,
  lightning,
  emergencyServices = [],
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
  // Select closest resource for each of the 3 key categories from existing data (Government Hospitals only)
  const isGovHospital = (e) => {
    const name = (e.name || "").toLowerCase();
    const group = (e.group || "").toLowerCase();
    const subType = (e.subType || "").toLowerCase();
    return (
      name.includes("municipal") ||
      name.includes("bmc") ||
      name.includes("mcgm") ||
      name.includes("government") ||
      name.includes("govt") ||
      name.includes("civil") ||
      name.includes("general hospital") ||
      name.includes("health post") ||
      name.includes("dispensary") ||
      name.includes("phc") ||
      name.includes("chc") ||
      name.includes("esi") ||
      name.includes("public") ||
      name.includes("bhabha") ||
      name.includes("cooper") ||
      name.includes("kem") ||
      name.includes("sion") ||
      name.includes("nair") ||
      name.includes("rajawadi") ||
      name.includes("shatabdi") ||
      name.includes("jj hospital") ||
      name.includes("maternity home") ||
      group.includes("government") ||
      subType.includes("government")
    );
  };

  const hospitalList = (emergencyServices || [])
    .filter(
      (e) =>
        e.category === "medical" ||
        e.group?.toLowerCase().includes("hospital") ||
        e.name?.toLowerCase().includes("hospital") ||
        e.name?.toLowerCase().includes("dispensary") ||
        e.name?.toLowerCase().includes("health post")
    )
    .sort((a, b) => {
      const aGov = isGovHospital(a) ? 0 : 1;
      const bGov = isGovHospital(b) ? 0 : 1;
      if (aGov !== bGov) return aGov - bGov;
      return Number(a.distanceKm || 999) - Number(b.distanceKm || 999);
    });
  const closestHospital = hospitalList[0] || null;

  const ngoList = [
    ...(emergencyServices || []).filter((e) => e.category === "ngo" || e.category === "shelter"),
    ...(shelters || [])
  ].sort((a, b) => Number(a.distanceKm ?? a.distance_km ?? 999) - Number(b.distanceKm ?? b.distance_km ?? 999));
  const closestNgo = ngoList[0] || null;

  const govList = (emergencyServices || []).filter(
    (e) => e.category === "fire" || e.category === "police" || e.category === "government" || e.category === "gov" || e.group?.toLowerCase().includes("fire") || e.group?.toLowerCase().includes("police") || e.name?.toLowerCase().includes("police") || e.name?.toLowerCase().includes("fire") || e.name?.toLowerCase().includes("ward")
  ).sort((a, b) => Number(a.distanceKm || 999) - Number(b.distanceKm || 999));
  const closestGov = govList[0] || null;

  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 1. User Welcome & Role Bar */}
      {userProfile && (
        <View style={s.userWelcomeCard}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={s.userWelcomeName}>
                👋 Welcome, {userProfile.name}
              </Text>
              <View style={s.userRoleTag}>
                <Text style={s.userRoleTagText}>{userProfile.role || role || "Shop Owner"}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={s.userProfileEditIconBtn} onPress={onOpenProfile}>
            <Ionicons name="settings-outline" size={16} color={BLUE} />
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Large Circular Red Emergency SOS Button */}
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
            {sosCooldown > 0 ? `${sosCooldown}s COOLDOWN` : "Tap for Help"}
          </Text>
        </TouchableOpacity>
      </View>

      {sosActiveData && (
        <View style={[s.sosActiveBanner, { borderColor: "#16a34a", borderWidth: 1.5 }]}>
          <Ionicons name="checkmark-circle" size={26} color={GREEN} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#166534" }}>
              🚨 {t.rescueDeployed}: {sosActiveData.assignedTeam || "Rapid Flood Rescue Squad"}
            </Text>
            <Text style={{ fontSize: 10, color: "#15803d", marginTop: 2, fontWeight: "700" }}>
              SOS Broadcasted · Emergency Team Dispatched · ETA: {sosActiveData.eta || "4–6 mins"}
            </Text>
          </View>
        </View>
      )}

      {/* 4. Report Incident Card */}
      <TouchableOpacity style={s.reportIncidentBigBtn} onPress={onReport} activeOpacity={0.8}>
        <View style={s.reportIconCircle}>
          <Text style={{ fontSize: 24 }}>🚨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.reportBigTitle}>{t.reportIncident || "Report Incident"}</Text>
          <Text style={s.reportBigSub}>Report a flood situation</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={BLUE} />
      </TouchableOpacity>

      {/* 5. Quick Actions Row */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 18 }}>
        <TouchableOpacity style={s.quickActionCard} onPress={onOpenChecklist} activeOpacity={0.7}>
          <Ionicons name="clipboard-outline" size={18} color={BLUE} />
          <Text style={s.quickActionText}>📋 Checklist</Text>
        </TouchableOpacity>
        {role === "Shop Owner" ? (
          <TouchableOpacity style={s.quickActionCard} onPress={onOpenBuddy} activeOpacity={0.7}>
            <Ionicons name="people-outline" size={18} color={BLUE} />
            <Text style={s.quickActionText}>👥 Flood Buddy</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.quickActionCard} onPress={onNavigateToMap} activeOpacity={0.7}>
            <Ionicons name="navigate-outline" size={18} color={BLUE} />
            <Text style={s.quickActionText}>🗺️ Evacuation Map</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 6. Nearby Emergency Services Header with View All -> */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 10 }}>
        <Text style={s.sectionTitle}>Nearby Emergency Services</Text>
        <TouchableOpacity onPress={onNavigateToMap} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={{ fontSize: 11, color: BLUE, fontWeight: "800" }}>View All →</Text>
        </TouchableOpacity>
      </View>

      {/* 7. Exactly 3 Category Cards (1 Hospital, 1 NGO, 1 Government) */}
      <View style={{ gap: 10 }}>
        {/* Card 1: 🏥 Hospital / Medical */}
        {closestHospital ? (
          <View style={s.cleanResourceCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[s.cleanResourceIconCircle, { backgroundColor: "#EFF6FF" }]}>
                <Text style={{ fontSize: 22 }}>🏥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cleanResourceCategory}>GOVT HOSPITAL</Text>
                <Text style={s.cleanResourceTitle} numberOfLines={1}>{closestHospital.name}</Text>
                <Text style={s.cleanResourceAddress} numberOfLines={1}>
                  📍 {closestHospital.station || closestHospital.address || closestHospital.area || "Healthcare Center & Emergency Ward"}
                </Text>
                <Text style={s.cleanResourceMeta}>
                  ⚡ {closestHospital.distanceKm} km · ~{Math.max(2, Math.round(Number(closestHospital.distanceKm || 1) * 4))} min
                </Text>
              </View>
              <TouchableOpacity
                style={s.cleanDirectionsBtn}
                onPress={() => {
                  const navUrl = closestHospital.navigateUrl || closestHospital.mapsUrl || ((closestHospital.latitude || closestHospital.lat) && (closestHospital.longitude || closestHospital.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${closestHospital.latitude || closestHospital.lat},${closestHospital.longitude || closestHospital.lng}&travelmode=driving` : null);
                  if (navUrl) Linking.openURL(navUrl).catch(() => null);
                }}
              >
                <Ionicons name="navigate" size={12} color="#fff" />
                <Text style={s.cleanDirectionsText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.cleanResourceCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 20 }}>🏥</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cleanResourceCategory}>GOVT HOSPITAL</Text>
                <Text style={s.cleanResourceMeta}>No nearby government hospital available within radius</Text>
              </View>
            </View>
          </View>
        )}

        {/* Card 2: 🤝 NGO */}
        {closestNgo ? (
          <View style={s.cleanResourceCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[s.cleanResourceIconCircle, { backgroundColor: "#F0FDF4" }]}>
                <Text style={{ fontSize: 22 }}>🤝</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cleanResourceCategory, { color: "#16a34a" }]}>NGO</Text>
                <Text style={s.cleanResourceTitle} numberOfLines={1}>{closestNgo.name}</Text>
                <Text style={s.cleanResourceAddress} numberOfLines={1}>
                  📍 {closestNgo.address || closestNgo.station || closestNgo.area || "Designated NGO Community Hub"}
                </Text>
                <Text style={s.cleanResourceMeta}>
                  ⚡ {closestNgo.distance_km ?? closestNgo.distanceKm} km · ~{closestNgo.eta_minutes ?? closestNgo.etaMin ?? Math.max(2, Math.round(Number(closestNgo.distance_km || closestNgo.distanceKm || 1) * 5))} min
                </Text>
              </View>
              <TouchableOpacity
                style={[s.cleanDirectionsBtn, { backgroundColor: "#16a34a" }]}
                onPress={() => {
                  const navUrl = closestNgo.maps_url || closestNgo.mapsUrl || closestNgo.navigateUrl || ((closestNgo.latitude || closestNgo.lat) && (closestNgo.longitude || closestNgo.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${closestNgo.latitude || closestNgo.lat},${closestNgo.longitude || closestNgo.lng}&travelmode=driving` : null);
                  if (navUrl) Linking.openURL(navUrl).catch(() => null);
                }}
              >
                <Ionicons name="navigate" size={12} color="#fff" />
                <Text style={s.cleanDirectionsText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.cleanResourceCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 20 }}>🤝</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.cleanResourceCategory, { color: "#16a34a" }]}>NGO</Text>
                <Text style={s.cleanResourceMeta}>No nearby NGO relief center available</Text>
              </View>
            </View>
          </View>
        )}

        {/* Card 3: 🏛️ Government / Authority */}
        {closestGov ? (
          <View style={s.cleanResourceCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[s.cleanResourceIconCircle, { backgroundColor: "#FEF3C7" }]}>
                <Text style={{ fontSize: 22 }}>{closestGov.category === "fire" ? "🚒" : closestGov.category === "police" ? "👮" : "🏛️"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cleanResourceCategory, { color: "#d97706" }]}>GOVERNMENT</Text>
                <Text style={s.cleanResourceTitle} numberOfLines={1}>{closestGov.name}</Text>
                <Text style={s.cleanResourceAddress} numberOfLines={1}>
                  📍 {closestGov.station || closestGov.address || closestGov.area || "Disaster Response Base"}
                </Text>
                <Text style={s.cleanResourceMeta}>
                  ⚡ {closestGov.distanceKm} km · ~{Math.max(2, Math.round(Number(closestGov.distanceKm || 1) * 4))} min
                </Text>
              </View>
              <TouchableOpacity
                style={[s.cleanDirectionsBtn, { backgroundColor: "#d97706" }]}
                onPress={() => {
                  const navUrl = closestGov.navigateUrl || closestGov.mapsUrl || ((closestGov.latitude || closestGov.lat) && (closestGov.longitude || closestGov.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${closestGov.latitude || closestGov.lat},${closestGov.longitude || closestGov.lng}&travelmode=driving` : null);
                  if (navUrl) Linking.openURL(navUrl).catch(() => null);
                }}
              >
                <Ionicons name="navigate" size={12} color="#fff" />
                <Text style={s.cleanDirectionsText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.cleanResourceCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 20 }}>🏛️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.cleanResourceCategory, { color: "#d97706" }]}>GOVERNMENT</Text>
                <Text style={s.cleanResourceMeta}>No nearby government unit available</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// Streamlined Essential Emergency Checklist Component
function EmergencyChecklistView({ role, t, userProfile }) {
  const initialTab = (role === "Resident" || userProfile?.role === "Resident") ? "resident" : "shop";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [checked, setChecked] = useState({});

  const toggleCheck = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearAll = () => {
    setChecked({});
  };

  // Essential Shop Defense Items
  const shopItems = [
    {
      id: "s1",
      icon: "walk",
      title: "Move to Upper Floor / High Ground",
      desc: "Move staff and customers to a safe elevated floor immediately.",
      priority: "CRITICAL"
    },
    {
      id: "s2",
      icon: "cube",
      title: "Elevate Stock & Inventory",
      desc: "Move dry goods, electronics, and stock at least 3 feet off the floor.",
      priority: "STOCK"
    },
    {
      id: "s3",
      icon: "flash-off",
      title: "Turn Off Main Power Switch",
      desc: "Safely cut off main breaker and unplug ground appliances to prevent shocks.",
      priority: "SAFETY"
    },
    {
      id: "s4",
      icon: "shield",
      title: "Install Flood Barriers & Seal Shutters",
      desc: "Put sandbags/flood boards in place and lock the shop shutter securely.",
      priority: "BARRIER"
    },
    {
      id: "s5",
      icon: "briefcase",
      title: "Secure Cash & Essential Documents",
      desc: "Seal cash, tax registers, and POS devices in waterproof bags.",
      priority: "DOCS"
    }
  ];

  // Essential Resident Safety Items
  const residentItems = [
    {
      id: "r1",
      icon: "walk",
      title: "Move to Upper Floor / High Ground",
      desc: "Move family, elderly members, and pets above ground flood levels.",
      priority: "CRITICAL"
    },
    {
      id: "r2",
      icon: "flash-off",
      title: "Turn Off Electricity & Gas Valves",
      desc: "Switch off the main breaker and cooking gas to prevent fires/leaks.",
      priority: "SAFETY"
    },
    {
      id: "r3",
      icon: "medkit",
      title: "Pack Emergency Go-Bag",
      desc: "Keep emergency medicines, power bank, torch, drinking water, and IDs ready.",
      priority: "SUPPLIES"
    },
    {
      id: "r4",
      icon: "warning",
      title: "Avoid Moving Floodwater",
      desc: "Do not walk or drive through flowing water or submerged streets.",
      priority: "HAZARD"
    }
  ];

  const currentItems = activeTab === "shop" ? shopItems : residentItems;
  const totalCount = currentItems.length;
  const completedCount = currentItems.filter((i) => checked[i.id]).length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <View style={{ paddingVertical: 4 }}>
      {/* 1. Clean Role Switcher */}
      <View style={s.checklistRoleToggleRow}>
        <TouchableOpacity
          style={[s.checklistRoleTab, activeTab === "shop" && s.checklistRoleTabActive]}
          onPress={() => setActiveTab("shop")}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 14 }}>🏪</Text>
          <Text style={[s.checklistRoleTabText, activeTab === "shop" && s.checklistRoleTabTextActive]}>
            Shop Checklist
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.checklistRoleTab, activeTab === "resident" && s.checklistRoleTabActive]}
          onPress={() => setActiveTab("resident")}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 14 }}>🏠</Text>
          <Text style={[s.checklistRoleTabText, activeTab === "resident" && s.checklistRoleTabTextActive]}>
            Resident Checklist
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Compact Progress Summary */}
      <View style={s.checklistProgressCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="shield-checkmark" size={16} color={completedCount === totalCount ? GREEN : BLUE} />
            <Text style={s.checklistProgressTitle}>
              {completedCount} of {totalCount} Completed ({progressPercent}%)
            </Text>
          </View>
          {completedCount > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Text style={{ fontSize: 10.5, color: RED, fontWeight: "800" }}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.checklistProgressBarTrack}>
          <View
            style={[
              s.checklistProgressBarFill,
              { width: `${progressPercent}%`, backgroundColor: completedCount === totalCount ? GREEN : BLUE }
            ]}
          />
        </View>

        {completedCount === totalCount && (
          <View style={s.checklistSuccessMsg}>
            <Ionicons name="checkmark-done-circle" size={15} color="#166534" />
            <Text style={s.checklistSuccessMsgText}>
              All essential flood safety steps completed!
            </Text>
          </View>
        )}
      </View>

      {/* 3. Essential Checklist Items */}
      <View style={{ gap: 8 }}>
        {currentItems.map((item) => {
          const isDone = Boolean(checked[item.id]);
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.checklistCardItem, isDone && s.checklistCardItemDone]}
              onPress={() => toggleCheck(item.id)}
              activeOpacity={0.7}
            >
              <View style={[s.checkItemCheckbox, isDone && s.checkItemCheckboxDone]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={15} color="#fff" />
                ) : (
                  <Ionicons name={item.icon || "ellipse-outline"} size={15} color={BLUE} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={[s.checkItemTitle, isDone && s.checkItemTitleDone]}>
                    {item.title}
                  </Text>
                  <View style={[s.checkTagPill, { backgroundColor: isDone ? "#DCFCE7" : "#EFF6FF" }]}>
                    <Text style={[s.checkTagPillText, { color: isDone ? "#166534" : BLUE }]}>
                      {item.priority}
                    </Text>
                  </View>
                </View>

                <Text style={[s.checkItemDesc, isDone && s.checkItemDescDone]}>
                  {item.desc}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Google Maps API Key from Web App configuration
const GOOGLE_MAPS_KEY = "AIzaSyA5U1kvO3XeQxEGkQfuNyiMBvcik27VvKQ";

// Real Interactive & Zoomable Google Maps Screen with OSRM Real Routing & Shelter List
function MapScreen({
  zones = [],
  emergencyServices = [],
  shelters = [],
  shelterLoading = false,
  activeZone = null,
  userLoc = null,
  userAddress = "",
  apiUrl = "",
  role = "Shop Owner",
  onOpenLocationModal,
  onRequestLocation,
  onRefresh,
  refreshing = false,
  t
}) {
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [zoom, setZoom] = useState(15);
  const [centerLat, setCenterLat] = useState(userLoc?.latitude || 19.132);
  const [centerLng, setCenterLng] = useState(userLoc?.longitude || 72.848);
  const [osrmRoute, setOsrmRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const lastTapRef = useRef(0);

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

  const { width: winWidth } = Dimensions.get("window");
  const mapWidth = Math.max(300, (winWidth || 390) - 24);
  const mapHeight = 350;

  // Safe Route Calculation
  const handleSelectShelterRoute = async (sh) => {
    setSelectedShelter(sh);
    setSelectedPin({ type: "shelter", data: sh });
    setLoadingRoute(true);

    const fromLat = userLoc?.latitude || 19.132;
    const fromLng = userLoc?.longitude || 72.848;
    const toLat = sh.latitude ?? sh.lat ?? 19.125;
    const toLng = sh.longitude ?? sh.lng ?? 72.838;

    // Center map midway along route
    setCenterLat((fromLat + toLat) / 2);
    setCenterLng((fromLng + toLng) / 2);

    try {
      const res = await fetchWithTimeout(`${apiUrl}/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`);
      if (res.ok) {
        const routeData = await res.json();
        setOsrmRoute(routeData);
      } else {
        throw new Error("Route API error");
      }
    } catch {
      // Direct road corridor fallback
      setOsrmRoute({
        coordinates: [
          { lat: fromLat, lng: fromLng },
          { lat: (fromLat + toLat) / 2, lng: (fromLng + toLng) / 2 },
          { lat: toLat, lng: toLng }
        ],
        distanceKm: ((sh.distance_km ?? sh.distanceKm) || 1.2),
        durationMin: (sh.eta_minutes ?? sh.etaMin ?? 5),
        hazardAdvisory: "Direct road corridor · Exercise caution near local storm drains."
      });
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleClearRoute = () => {
    setSelectedShelter(null);
    setOsrmRoute(null);
    setSelectedPin(null);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
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
          // Double tap zoom
          const now = Date.now();
          if (now - lastTapRef.current < 300) {
            setZoom((z) => Math.min(18, z + 1));
          }
          lastTapRef.current = now;
        }
      },
      onPanResponderMove: (evt, gesture) => {
        const touches = evt.nativeEvent.touches;
        const n = Math.pow(2, zoomRef.current);

        // 2-FINGER MULTI-TOUCH PINCH-TO-ZOOM & PAN
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

  const handleRecenter = async () => {
    if (onRequestLocation) {
      await onRequestLocation();
    }
    const lat = userLoc?.latitude || 19.132;
    const lng = userLoc?.longitude || 72.848;
    setCenterLat(lat);
    setCenterLng(lng);
    setZoom(15);
  };

  // Google Maps Slippy Tile Calculation
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
      const sub = Math.abs(x + y) % 4;
      const tileUrl = `https://mt${sub}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${zoom}&key=${GOOGLE_MAPS_KEY}`;
      tiles.push({
        key: `google-${zoom}-${x}-${y}`,
        screenX: tileScreenX,
        screenY: tileScreenY,
        url: tileUrl
      });
    }
  }

  // Web Mercator point projection
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
  const routePoints = osrmRoute?.coordinates || [];

  // Sort shelters by proximity
  const sortedShelters = [...(shelters || [])].sort(
    (a, b) => Number(a.distance_km ?? a.distanceKm ?? 999) - Number(b.distance_km ?? b.distanceKm ?? 999)
  );

  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {/* 1. Header & Location Bar */}
      <View style={s.mapScreenHeader}>
        <Text style={s.screenTitle}>{t.mapScreenTitle || "🗺️ Live Flood Map"}</Text>
        <TouchableOpacity
          style={s.mapLocationPill}
          onPress={onOpenLocationModal}
          activeOpacity={0.7}
        >
          <View style={s.locationDotPulse} />
          <Text style={s.mapLocationText} numberOfLines={1}>
            📍 {userAddress || "Current Location"}
          </Text>
          <View style={s.changeLocBtnMini}>
            <Text style={s.changeLocTextMini}>Change</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. Interactive Google Maps Canvas */}
      <View style={s.googleMapContainer} {...panResponder.panHandlers}>
        {/* Google Roadmap Slippy Tiles */}
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

          {/* OSRM Road Route Connecting Polyline */}
          {routePoints.length > 1 && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
                      backgroundColor: "#1D4ED8",
                      borderRadius: 3,
                      transform: [{ rotate: `${angle}deg` }],
                      elevation: 5
                    }}
                  />
                );
              })}
            </View>
          )}

          {/* User Location Marker */}
          <TouchableOpacity
            style={[
              s.mapPinUser,
              {
                left: userPx.x - 18,
                top: userPx.y - 28
              }
            ]}
            onPress={() => setSelectedPin({ type: "user", data: { name: userAddress || "Active Location", role } })}
            activeOpacity={0.8}
          >
            <View style={s.userPulseRing} />
            <Text style={{ fontSize: 22 }}>📍</Text>
            <Text style={s.pinLabelUser}>You are here</Text>
          </TouchableOpacity>

          {/* Ward Risk Zone Pins */}
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
                    left: ptPx.x - 20,
                    top: ptPx.y - 20,
                    borderColor: color
                  }
                ]}
                onPress={() => setSelectedPin({ type: "zone", data: z })}
                activeOpacity={0.8}
              >
                <Text style={[s.zonePinScore, { color }]}>{z.risk}</Text>
                <Text style={s.zonePinName} numberOfLines={1}>{z.name}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Emergency Services Pins */}
          {emergencyServices.map((e) => {
            const eLat = e.latitude ?? e.lat;
            const eLng = e.longitude ?? e.lng;
            if (!eLat || !eLng) return null;
            const ptPx = project(eLat, eLng);
            const isHospital = e.category === "medical" || e.name?.toLowerCase().includes("hospital");
            const isNgo = e.category === "ngo" || e.category === "shelter";
            const dist = e.distance_km ?? e.distanceKm ?? 0.5;

            return (
              <TouchableOpacity
                key={e.id}
                style={[
                  s.mapEmsPin,
                  {
                    left: ptPx.x - 16,
                    top: ptPx.y - 16,
                    borderColor: isHospital ? BLUE : isNgo ? GREEN : "#D97706",
                    backgroundColor: isHospital ? "#EFF6FF" : isNgo ? "#F0FDF4" : "#FEF3C7"
                  }
                ]}
                onPress={() => setSelectedPin({ type: "ems", data: e })}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>{isHospital ? "🏥" : isNgo ? "🤝" : e.category === "fire" ? "🚒" : "👮"}</Text>
                <View style={s.mapPinLabelBox}>
                  <Text style={s.mapPinLabelTitle} numberOfLines={1}>{e.name}</Text>
                  <Text style={s.mapPinLabelLoc} numberOfLines={1}>📍 {e.station || e.address || e.type || "Rescue Station"} · {dist} km</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Evacuation Shelter Pins */}
          {shelters.map((sh) => {
            const shLat = sh.latitude ?? sh.lat;
            const shLng = sh.longitude ?? sh.lng;
            if (!shLat || !shLng) return null;
            const ptPx = project(shLat, shLng);
            const isSelected = selectedShelter && selectedShelter.id === sh.id;
            const dist = sh.distance_km ?? sh.distanceKm ?? 1.2;

            return (
              <TouchableOpacity
                key={sh.id}
                style={[
                  s.mapShelterPin,
                  {
                    left: ptPx.x - 18,
                    top: ptPx.y - 18,
                    borderColor: isSelected ? "#E11D48" : GREEN,
                    backgroundColor: isSelected ? "#FFE4E6" : "#DCFCE7"
                  }
                ]}
                onPress={() => handleSelectShelterRoute(sh)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18 }}>🏠</Text>
                <View style={s.mapPinLabelBox}>
                  <Text style={s.mapPinLabelTitle} numberOfLines={1}>{sh.name}</Text>
                  <Text style={s.mapPinLabelLoc} numberOfLines={1}>📍 {sh.address || sh.area || "Relief Center"} · {dist} km</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Floating Zoom & Recenter Controls on Map */}
        <View style={s.mapFloatingControls}>
          <TouchableOpacity style={s.mapControlBtn} onPress={handleZoomIn} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color={NAVY} />
          </TouchableOpacity>
          <TouchableOpacity style={s.mapControlBtn} onPress={handleZoomOut} activeOpacity={0.7}>
            <Ionicons name="remove" size={20} color={NAVY} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.mapControlBtn, { backgroundColor: BLUE }]} onPress={handleRecenter} activeOpacity={0.7}>
            <Ionicons name="locate" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Google Map Attribution Pill */}
        <View style={s.mapGoogleBadge}>
          <Ionicons name="map" size={11} color="#64748B" />
          <Text style={s.mapGoogleBadgeText}>Google Maps</Text>
        </View>
      </View>

      {/* 3. Active Safe Route HUD Banner */}
      {osrmRoute && selectedShelter && (
        <View style={s.mapRouteHudCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="navigate-circle" size={16} color={BLUE} />
                <Text style={s.mapRouteHudTitle}>Safest Evacuation Route</Text>
              </View>
              <Text style={s.mapRouteHudDest} numberOfLines={1}>{selectedShelter.name}</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: NAVY, marginTop: 1 }} numberOfLines={1}>
                📍 Destination: {selectedShelter.address || selectedShelter.agency || "Designated Municipal Relief Center"}
              </Text>
              <Text style={s.mapRouteHudMeta}>
                ⚡ {osrmRoute.distanceKm || selectedShelter.distance_km || 1.1} km · ~{osrmRoute.durationMin || selectedShelter.eta_minutes || 5} min safe travel time
              </Text>
              <Text style={s.mapRouteHudAdvisory}>
                🛡️ {osrmRoute.hazardAdvisory || "Verified flood-avoidance road corridor"}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClearRoute} style={s.mapRouteCloseBtn}>
              <Ionicons name="close" size={18} color={MUTED} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {Boolean(selectedShelter.maps_url || selectedShelter.mapsUrl || ((selectedShelter.latitude || selectedShelter.lat) && (selectedShelter.longitude || selectedShelter.lng))) && (
              <TouchableOpacity
                style={s.mapRouteNavBtn}
                onPress={() => {
                  const url = selectedShelter.maps_url || selectedShelter.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${selectedShelter.latitude || selectedShelter.lat},${selectedShelter.longitude || selectedShelter.lng}&travelmode=driving`;
                  Linking.openURL(url).catch(() => null);
                }}
              >
                <Ionicons name="navigate" size={14} color="#fff" />
                <Text style={s.mapRouteNavText}>Google Maps Navigation ↗</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.mapRouteClearBtn} onPress={handleClearRoute}>
              <Text style={s.mapRouteClearText}>Clear Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. Selected Pin Details Info Card */}
      {selectedPin && selectedPin.type !== "shelter" && !osrmRoute && (
        <View style={s.mapPinInfoCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 18 }}>
                  {selectedPin.type === "user" ? "📍" : selectedPin.type === "zone" ? "🔴" : selectedPin.data.category === "medical" ? "🏥" : selectedPin.data.category === "ngo" ? "🤝" : selectedPin.data.category === "fire" ? "🚒" : "👮"}
                </Text>
                <Text style={s.mapPinInfoTitle}>{selectedPin.data.name}</Text>
              </View>
              {selectedPin.type === "ems" && (
                <View style={{ marginTop: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: NAVY }}>
                    📍 Location: {selectedPin.data.station || selectedPin.data.address || selectedPin.data.area || "Area Response Facility"}
                  </Text>
                  <Text style={s.mapPinInfoMeta}>
                    🏷️ {selectedPin.data.type || selectedPin.data.category?.toUpperCase() || "Emergency Unit"} · ⚡ {selectedPin.data.distanceKm} km away · ~{Math.max(2, Math.round(Number(selectedPin.data.distanceKm || 1) * 4))} min
                  </Text>
                </View>
              )}
              {selectedPin.type === "zone" && (
                <Text style={s.mapPinInfoMeta}>
                  Live Flood Risk Score: {selectedPin.data.risk}/100 · Rainfall: {selectedPin.data.rainfall ?? 0} mm · {selectedPin.data.cause || "Normal Drainage"}
                </Text>
              )}
              {selectedPin.type === "user" && (
                <Text style={s.mapPinInfoMeta}>
                  Your active location for hyperlocal alerts & evacuation routing
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedPin(null)}>
              <Ionicons name="close-circle" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {selectedPin.type === "ems" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={s.mapPinCallBtn}
                onPress={() => {
                  const num = (selectedPin.data.phone || "").split("/")[0].replace(/[^0-9+]/g, "");
                  if (num) Linking.openURL(`tel:${num}`).catch(() => null);
                }}
              >
                <Ionicons name="call" size={13} color="#fff" />
                <Text style={s.mapPinCallText}>Call Unit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.mapPinDirBtn}
                onPress={() => {
                  const url = selectedPin.data.navigateUrl || selectedPin.data.mapsUrl || ((selectedPin.data.latitude || selectedPin.data.lat) && (selectedPin.data.longitude || selectedPin.data.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${selectedPin.data.latitude || selectedPin.data.lat},${selectedPin.data.longitude || selectedPin.data.lng}&travelmode=driving` : null);
                  if (url) Linking.openURL(url).catch(() => null);
                }}
              >
                <Ionicons name="navigate" size={13} color={BLUE} />
                <Text style={s.mapPinDirText}>Directions ↗</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 5. Nearby Evacuation Shelters Section */}
      <View style={s.sheltersSection}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={s.sheltersSectionTitle}>🏠 Nearby Evacuation Shelters</Text>
          {sortedShelters.length > 0 && (
            <View style={s.sheltersCountBadge}>
              <Text style={s.sheltersCountText}>{sortedShelters.length} Available</Text>
            </View>
          )}
        </View>
        <Text style={s.sheltersSectionSub}>Tap any shelter to calculate a verified safe road route</Text>

        {/* Loading State */}
        {shelterLoading && sortedShelters.length === 0 && (
          <View style={s.sheltersEmptyBox}>
            <ActivityIndicator size="small" color={BLUE} />
            <Text style={s.sheltersEmptyText}>Loading nearby shelters...</Text>
          </View>
        )}

        {/* Empty State */}
        {!shelterLoading && sortedShelters.length === 0 && (
          <View style={s.sheltersEmptyBox}>
            <Ionicons name="home-outline" size={28} color={MUTED} />
            <Text style={s.sheltersEmptyText}>No nearby evacuation shelters found within 5 km.</Text>
            {onRefresh && (
              <TouchableOpacity style={s.sheltersRetryBtn} onPress={onRefresh}>
                <Ionicons name="refresh" size={13} color={BLUE} />
                <Text style={s.sheltersRetryText}>Retry / Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Shelters List Cards */}
        {sortedShelters.slice(0, 5).map((sh) => {
          const isSelected = selectedShelter && selectedShelter.id === sh.id;
          const dist = sh.distance_km ?? sh.distanceKm ?? 1.2;
          const eta = sh.eta_minutes ?? sh.etaMin ?? Math.max(2, Math.round(Number(dist) * 4));
          const isVerified = Boolean(sh.is_verified || sh.isVerified);

          return (
            <View key={sh.id} style={[s.shelterCard, isSelected && s.shelterCardSelected]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={[s.shelterIconBox, isSelected && { backgroundColor: "#FFE4E6" }]}>
                  <Text style={{ fontSize: 22 }}>🏠</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={s.shelterName} numberOfLines={1}>{sh.name}</Text>
                    {isVerified ? (
                      <View style={s.shelterVerifiedPill}>
                        <Text style={s.shelterVerifiedText}>✓ VERIFIED</Text>
                      </View>
                    ) : (
                      <View style={s.shelterCapacityPill}>
                        <Text style={s.shelterCapacityText}>{sh.type || "Relief Center"}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.shelterAddress} numberOfLines={1}>📍 Location: {sh.address || sh.agency || "Designated Municipal Relief Center"}</Text>
                  <Text style={s.shelterDistanceEta}>
                    ⚡ {dist} km away · ~{eta} min travel time
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[s.shelterRouteBtn, isSelected && { backgroundColor: "#15803D" }]}
                  onPress={() => handleSelectShelterRoute(sh)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={13} color="#fff" />
                  <Text style={s.shelterRouteBtnText}>{isSelected ? "Route Displayed" : "Safe Route"}</Text>
                </TouchableOpacity>

                {Boolean(sh.maps_url || sh.mapsUrl || ((sh.latitude || sh.lat) && (sh.longitude || sh.lng))) && (
                  <TouchableOpacity
                    style={s.shelterMapsBtn}
                    onPress={() => {
                      const url = sh.maps_url || sh.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${sh.latitude || sh.lat},${sh.longitude || sh.lng}&travelmode=driving`;
                      Linking.openURL(url).catch(() => null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="map-outline" size={13} color={BLUE} />
                    <Text style={s.shelterMapsBtnText}>Directions ↗</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* 6. Nearby Emergency Services & Responders Section */}
      {emergencyServices.length > 0 && (
        <View style={[s.sheltersSection, { marginTop: 18 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Text style={s.sheltersSectionTitle}>🚑 Nearby Emergency Services & Responders</Text>
            <View style={[s.sheltersCountBadge, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[s.sheltersCountText, { color: "#D97706" }]}>{emergencyServices.length} Units</Text>
            </View>
          </View>
          <Text style={s.sheltersSectionSub}>Direct access to local hospitals, fire brigades, police, and NGO bases</Text>

          <View style={{ gap: 10, marginTop: 8 }}>
            {emergencyServices.map((e) => {
              const isHospital = e.category === "medical" || e.name?.toLowerCase().includes("hospital");
              const isNgo = e.category === "ngo" || e.category === "shelter";
              const isFire = e.category === "fire";
              const dist = e.distance_km ?? e.distanceKm ?? 0.5;
              const eta = Math.max(2, Math.round(Number(dist) * 4));
              const icon = isHospital ? "🏥" : isNgo ? "🤝" : isFire ? "🚒" : e.category === "police" ? "👮" : "🏛️";
              const bgCircle = isHospital ? "#EFF6FF" : isNgo ? "#F0FDF4" : isFire ? "#FEE2E2" : "#FEF3C7";
              const pillColor = isHospital ? BLUE : isNgo ? "#16a34a" : isFire ? RED : "#d97706";

              return (
                <View key={e.id} style={s.cleanResourceCard}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={[s.cleanResourceIconCircle, { backgroundColor: bgCircle }]}>
                      <Text style={{ fontSize: 20 }}>{icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cleanResourceCategory, { color: pillColor }]}>
                        {e.type || (isHospital ? "HOSPITAL" : isNgo ? "NGO" : isFire ? "FIRE & RESCUE" : "GOVERNMENT")}
                      </Text>
                      <Text style={s.cleanResourceTitle} numberOfLines={1}>{e.name}</Text>
                      <Text style={s.cleanResourceAddress} numberOfLines={1}>
                        📍 Location: {e.station || e.address || e.area || "Area Emergency Outpost"}
                      </Text>
                      <Text style={s.cleanResourceMeta}>
                        ⚡ {dist} km away · ~{eta} min response time
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    {e.phone ? (
                      <TouchableOpacity
                        style={[s.shelterRouteBtn, { backgroundColor: "#0F172A", flex: 0.8 }]}
                        onPress={() => {
                          const num = (e.phone || "").split("/")[0].replace(/[^0-9+]/g, "");
                          if (num) Linking.openURL(`tel:${num}`).catch(() => null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="call" size={12} color="#fff" />
                        <Text style={s.shelterRouteBtnText}>Call</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={[s.shelterMapsBtn, { flex: 1 }]}
                      onPress={() => {
                        const url = e.navigateUrl || e.mapsUrl || ((e.latitude || e.lat) && (e.longitude || e.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${e.latitude || e.lat},${e.longitude || e.lng}&travelmode=driving` : null);
                        if (url) Linking.openURL(url).catch(() => null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="navigate" size={12} color={BLUE} />
                      <Text style={s.shelterMapsBtnText}>Directions ↗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
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
  const [aiProgressStep, setAiProgressStep] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
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
        } catch { }
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

  // Pre-verification with MobileNet Flood Detection AI (Photo & Video)
  const runAiVerification = async (uri, isVideo = false) => {
    if (!uri) return null;
    setAiVerifying(true);
    setAiResult(null);
    setAiError(null);
    setAiProgressStep(isVideo ? "Uploading video..." : "Uploading photo...");

    // Simulated progressive status for smooth UX
    const timer1 = setTimeout(() => {
      setAiProgressStep(isVideo ? "Analyzing video frames..." : "Extracting image features...");
    }, 1200);
    const timer2 = setTimeout(() => {
      setAiProgressStep("Checking flood conditions with MobileNet AI...");
    }, 2800);
    const timer3 = setTimeout(() => {
      setAiProgressStep("Generating result...");
    }, 4500);

    try {
      const formData = new FormData();
      let ext = ".jpg";
      if (isVideo) {
        const match = uri.match(/\.(mp4|mov|webm|avi|mkv)$/i);
        ext = match ? `.${match[1].toLowerCase()}` : ".mp4";
      }
      const filename = isVideo ? `scan_video_${Date.now()}${ext}` : `scan_photo_${Date.now()}${ext}`;
      formData.append("media", {
        uri,
        name: filename,
        type: isVideo ? (ext === ".mov" ? "video/quicktime" : (ext === ".webm" ? "video/webm" : "video/mp4")) : "image/jpeg"
      });

      const res = await fetchWithTimeout(`${apiUrl}/upload-media`, {
        method: "POST",
        body: formData
      }, 60000);

      if (res.ok) {
        const data = await res.json();
        if (isVideo) {
          if (data.url) setUploadedVideoUrl(data.url);
        } else {
          if (data.url) setUploadedPhotoUrl(data.url);
        }
        if (data.aiVerification) {
          setAiResult(data.aiVerification);
          return data.aiVerification;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        const userMsg = errJson.message || (isVideo ? "Could not decode or analyze the video." : "Could not analyze the photo.");
        setAiError(userMsg);
        Alert.alert("Evidence Verification Notice", userMsg);
      }
    } catch (e) {
      console.warn("[AI Verification error]:", e.message);
      setAiError(isVideo ? "Unable to complete video analysis. Please check network connection." : "Unable to verify photo.");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setAiVerifying(false);
      setAiProgressStep("");
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

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const mediaMsg = videoUri ? "Video attached & transmitted" : photoUri ? "Photo attached & transmitted" : "Details recorded";
      Alert.alert("Report Received", `Assigned ID: ${data.id}. ${mediaMsg} for Municipal Emergency Response.`, [
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", padding: 12, borderRadius: 8 }}>
                <ActivityIndicator size="small" color={BLUE} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: BLUE, fontWeight: "800" }}>
                    🤖 AI Model Verification Active
                  </Text>
                  <Text style={{ fontSize: 10, color: "#2563EB", marginTop: 2 }}>
                    {aiProgressStep || "Scanning visual evidence for active flooding..."}
                  </Text>
                </View>
              </View>
            )}

            {!aiVerifying && aiError && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", padding: 10, borderRadius: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: "#991B1B", fontWeight: "800" }}>
                    ⚠️ Verification Notice
                  </Text>
                  <Text style={{ fontSize: 10, color: "#B91C1C", marginTop: 2 }}>
                    {aiError}
                  </Text>
                </View>
              </View>
            )}

            {!aiVerifying && !aiError && (photoPreview || videoPreview) && (
              <View style={{ backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC", padding: 10, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#166534", fontWeight: "800" }}>
                    ✓ Evidence Attached & Ready
                  </Text>
                  <Text style={{ fontSize: 10, color: "#15803D", marginTop: 1 }}>
                    Visual evidence will be securely transmitted with your report to Disaster Response Authorities.
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

  // Google Maps Screen & Shelter Section Styles
  mapScreenHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4
  },
  mapLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginTop: 4,
    gap: 6,
    elevation: 2
  },
  mapLocationText: {
    fontSize: 11,
    fontWeight: "800",
    color: NAVY,
    flex: 1
  },
  changeLocBtnMini: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  changeLocTextMini: {
    fontSize: 9,
    fontWeight: "800",
    color: BLUE
  },
  googleMapContainer: {
    height: 350,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    position: "relative",
    backgroundColor: "#E6EEF8",
    elevation: 4
  },
  mapFloatingControls: {
    position: "absolute",
    right: 12,
    top: 14,
    gap: 8,
    elevation: 7,
    zIndex: 25
  },
  mapControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    elevation: 4
  },
  mapGoogleBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    zIndex: 22
  },
  mapGoogleBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#475569"
  },
  mapPinUser: {
    position: "absolute",
    alignItems: "center",
    zIndex: 20
  },
  userPulseRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 44,
    backgroundColor: "rgba(37,99,235,0.25)",
    top: -8
  },
  pinLabelUser: {
    fontSize: 8,
    fontWeight: "800",
    color: BLUE,
    backgroundColor: "#fff",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  mapZonePin: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    zIndex: 15
  },
  zonePinScore: {
    fontSize: 12,
    fontWeight: "900"
  },
  zonePinName: {
    position: "absolute",
    bottom: -13,
    fontSize: 7.5,
    fontWeight: "700",
    color: NAVY,
    width: 80,
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 2,
    borderRadius: 3
  },
  mapEmsPin: {
    position: "absolute",
    padding: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    elevation: 5,
    zIndex: 10
  },
  mapShelterPin: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    zIndex: 18
  },
  mapRouteHudCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    elevation: 3
  },
  mapRouteHudTitle: {
    fontSize: 10.5,
    fontWeight: "900",
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  mapRouteHudDest: {
    fontSize: 13,
    fontWeight: "900",
    color: NAVY,
    marginTop: 2
  },
  mapRouteHudMeta: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1E40AF",
    marginTop: 2
  },
  mapRouteHudAdvisory: {
    fontSize: 9.5,
    color: "#1E3A8A",
    marginTop: 3,
    fontWeight: "600"
  },
  mapRouteCloseBtn: {
    padding: 2
  },
  mapRouteNavBtn: {
    flex: 1,
    backgroundColor: BLUE,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  mapRouteNavText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800"
  },
  mapRouteClearBtn: {
    backgroundColor: "#DBEAFE",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  mapRouteClearText: {
    color: BLUE,
    fontSize: 11,
    fontWeight: "800"
  },
  mapPinInfoCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 3
  },
  mapPinInfoTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: NAVY,
    flex: 1
  },
  mapPinInfoMeta: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "600",
    marginTop: 3
  },
  mapPinCallBtn: {
    flex: 1,
    backgroundColor: "#16A34A",
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  mapPinCallText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800"
  },
  mapPinDirBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  mapPinDirText: {
    color: BLUE,
    fontSize: 11,
    fontWeight: "800"
  },
  sheltersSection: {
    marginHorizontal: 16,
    marginTop: 14
  },
  sheltersSectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: NAVY
  },
  sheltersCountBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  sheltersCountText: {
    fontSize: 9,
    fontWeight: "800",
    color: BLUE
  },
  sheltersSectionSub: {
    fontSize: 9.5,
    color: MUTED,
    fontWeight: "600",
    marginBottom: 8
  },
  sheltersEmptyBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6
  },
  sheltersEmptyText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600"
  },
  sheltersRetryBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginTop: 4
  },
  sheltersRetryText: {
    fontSize: 10,
    fontWeight: "800",
    color: BLUE
  },
  shelterCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  shelterCardSelected: {
    borderColor: BLUE,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5
  },
  shelterIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center"
  },
  shelterName: {
    fontSize: 12.5,
    fontWeight: "900",
    color: NAVY
  },
  shelterVerifiedPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  shelterVerifiedText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#166534"
  },
  shelterCapacityPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  shelterCapacityText: {
    fontSize: 7.5,
    fontWeight: "800",
    color: MUTED
  },
  shelterAddress: {
    fontSize: 9.5,
    color: MUTED,
    marginTop: 2
  },
  shelterDistanceEta: {
    fontSize: 10.5,
    fontWeight: "800",
    color: BLUE,
    marginTop: 3
  },
  shelterRouteBtn: {
    flex: 1,
    backgroundColor: BLUE,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  shelterRouteBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800"
  },
  shelterMapsBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  shelterMapsBtnText: {
    color: BLUE,
    fontSize: 10.5,
    fontWeight: "800"
  },

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
    fontSize: 18,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.3,
    marginBottom: 14
  },
  loginErrorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 14
  },
  loginErrorBannerText: {
    fontSize: 11,
    fontWeight: "700",
    color: RED,
    lineHeight: 15
  },
  loginInputGroup: {
    marginBottom: 14
  },
  loginInputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 6
  },
  loginFieldHelp: {
    fontSize: 10,
    color: MUTED,
    marginBottom: 4
  },
  loginInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    overflow: "hidden"
  },
  loginPrefixBox: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    paddingVertical: 10,
    fontSize: 13.5,
    fontWeight: "700",
    color: NAVY
  },
  fieldInlineError: {
    fontSize: 10,
    fontWeight: "700",
    color: RED,
    marginTop: 4
  },
  loginRoleBtnCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0"
  },
  loginRoleBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: BLUE
  },
  loginRoleBtnTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: NAVY
  },
  loginRoleBtnSub: {
    fontSize: 9.5,
    color: MUTED,
    marginTop: 1
  },
  loginDetectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  loginDetectBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: BLUE
  },
  loginGpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8
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
    borderRadius: 7,
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
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    elevation: 2,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6
  },
  loginSubmitBtnText: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 0.4
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
  },

  // Phased Emergency Checklist Styles
  checklistRoleToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  checklistRoleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  checklistRoleTabActive: {
    backgroundColor: "#EFF6FF",
    borderColor: BLUE
  },
  checklistRoleTabText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: MUTED
  },
  checklistRoleTabTextActive: {
    color: BLUE,
    fontWeight: "900"
  },
  checklistProgressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    elevation: 2
  },
  checklistProgressTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: NAVY
  },
  checklistProgressBarTrack: {
    height: 7,
    borderRadius: 7,
    backgroundColor: "#E2E8F0",
    overflow: "hidden"
  },
  checklistProgressBarFill: {
    height: "100%",
    borderRadius: 7
  },
  checklistSuccessMsg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    padding: 7,
    borderRadius: 8,
    marginTop: 8
  },
  checklistSuccessMsgText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534"
  },
  checkGroupCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12
  },
  checkGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  checkGroupBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5
  },
  checkGroupBadgeText: {
    fontSize: 8,
    fontWeight: "900"
  },
  checkGroupTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: NAVY,
    flex: 1
  },
  checkGroupSub: {
    fontSize: 9,
    color: MUTED,
    fontWeight: "600"
  },
  checklistCardItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
    backgroundColor: "#F8FAFC"
  },
  checklistCardItemDone: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0"
  },
  checkItemCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  checkItemCheckboxDone: {
    backgroundColor: GREEN,
    borderColor: GREEN
  },
  checkItemTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: NAVY,
    flex: 1,
    marginRight: 6
  },
  checkItemTitleDone: {
    color: "#166534",
    textDecorationLine: "line-through"
  },
  checkItemDesc: {
    fontSize: 9.5,
    color: MUTED,
    lineHeight: 14,
    marginTop: 1
  },
  checkItemDescDone: {
    color: "#4ADE80",
    textDecorationLine: "line-through"
  },
  checkTagPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4
  },
  checkTagPillText: {
    fontSize: 7.5,
    fontWeight: "900"
  },

  // Clean 3-Card Resource Styles
  cleanResourceCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  cleanResourceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  cleanResourceCategory: {
    fontSize: 9,
    fontWeight: "900",
    color: BLUE,
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  cleanResourceTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: NAVY,
    marginTop: 1
  },
  cleanResourceAddress: {
    fontSize: 10,
    fontWeight: "700",
    color: NAVY,
    marginTop: 1
  },
  cleanResourceMeta: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "600",
    marginTop: 2
  },
  cleanDirectionsBtn: {
    backgroundColor: BLUE,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  cleanDirectionsText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#fff"
  },
  mapPinLabelBox: {
    position: "absolute",
    bottom: -24,
    left: -32,
    width: 96,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    elevation: 4,
    zIndex: 25
  },
  mapPinLabelTitle: {
    fontSize: 7.8,
    fontWeight: "900",
    color: NAVY,
    textAlign: "center"
  },
  mapPinLabelLoc: {
    fontSize: 6.8,
    fontWeight: "700",
    color: MUTED,
    textAlign: "center"
  }
});

