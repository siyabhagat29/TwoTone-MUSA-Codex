import { store } from "../server/src/store.js";

async function verifyDynamicFloodBuddy() {
  console.log("==================================================");
  console.log("🧪 TESTING DYNAMIC FLOOD BUDDY & NOTIFICATION FLOW");
  console.log("==================================================\n");

  await store.init();

  // Clean test data
  store.users = (store.users || []).filter(u => !u.user_id.startsWith("TEST-"));
  store.notifications = (store.notifications || []).filter(n => !n.recipient_user_id.startsWith("TEST-") && !n.sender_user_id.startsWith("TEST-"));
  store.notificationCooldowns = {};

  // Step 1: Register real logged-in users with GPS
  console.log("Step 1: Upserting users with real GPS locations...");

  const userA = store.upsertUser({
    user_id: "TEST-USER-A",
    display_name: "Aryan",
    role: "Shop Owner",
    phone: "+919820099001",
    latitude: 19.1320,
    longitude: 72.8480,
    location_sharing_enabled: true
  });
  console.log(`- User A registered: ${userA.display_name} (${userA.role}) at (${userA.latitude}, ${userA.longitude})`);

  const userB = store.upsertUser({
    user_id: "TEST-USER-B",
    display_name: "Rahul",
    role: "Shop Owner",
    phone: "+919820099002",
    latitude: 19.1380,
    longitude: 72.8520, // ~780m away
    location_sharing_enabled: true
  });
  console.log(`- User B registered: ${userB.display_name} (${userB.role}) at (${userB.latitude}, ${userB.longitude})`);

  const userC = store.upsertUser({
    user_id: "TEST-USER-C",
    display_name: "FarAway Citizen",
    role: "Resident",
    phone: "+919820099003",
    latitude: 19.2500,
    longitude: 72.9500, // ~16 km away
    location_sharing_enabled: true
  });
  console.log(`- User C registered: ${userC.display_name} (${userC.role}) at (${userC.latitude}, ${userC.longitude})`);

  const userD = store.upsertUser({
    user_id: "TEST-USER-D",
    display_name: "Private User",
    role: "Resident",
    phone: "+919820099004",
    latitude: 19.1330,
    longitude: 72.8490, // ~150m away
    location_sharing_enabled: false // Location sharing DISABLED
  });
  console.log(`- User D registered: ${userD.display_name} (Location Sharing: ${userD.location_sharing_enabled})`);

  // Step 2: Test Nearby Discovery for User A (5km radius)
  console.log("\nStep 2: Querying nearby Flood Buddies for User A (radius: 5000m)...");
  const buddiesA = store.getNearbyFloodBuddies({
    latitude: userA.latitude,
    longitude: userA.longitude,
    radius: 5000,
    currentUserId: userA.user_id
  });

  console.log(`-> Found ${buddiesA.length} nearby buddies for User A`);
  buddiesA.forEach(b => console.log(`   • ${b.display_name} (${b.role}): ${b.distance_meters}m away (${b.distance_km} km), Online: ${b.is_online}`));

  // Validations:
  // 1. User A must NOT appear in own list
  if (buddiesA.some(b => b.user_id === userA.user_id)) {
    throw new Error("FAIL: User A appeared in their own Flood Buddy list!");
  }
  // 2. User B must appear
  const foundB = buddiesA.find(b => b.user_id === userB.user_id);
  if (!foundB) {
    throw new Error("FAIL: User B should be visible to User A within 5km!");
  }
  console.log(`✓ User B found at distance: ${foundB.distance_meters}m`);

  // 3. User C (16km away) must NOT appear in 5km radius
  if (buddiesA.some(b => b.user_id === userC.user_id)) {
    throw new Error("FAIL: User C (16km away) should NOT appear in 5km radius!");
  }
  console.log("✓ User C correctly excluded due to radius filter.");

  // 4. User D (location sharing disabled) must NOT appear
  if (buddiesA.some(b => b.user_id === userD.user_id)) {
    throw new Error("FAIL: User D has location sharing disabled and must not appear!");
  }
  console.log("✓ User D correctly excluded due to location_sharing_enabled = false.");

  // Step 3: Test Radius Expansion (20km)
  console.log("\nStep 3: Querying nearby Flood Buddies with expanded 20km radius...");
  const buddies20km = store.getNearbyFloodBuddies({
    latitude: userA.latitude,
    longitude: userA.longitude,
    radius: 20000,
    currentUserId: userA.user_id
  });
  if (!buddies20km.some(b => b.user_id === userC.user_id)) {
    throw new Error("FAIL: User C should be visible when radius is 20km!");
  }
  console.log("✓ User C successfully discovered with 20km radius.");

  // Step 4: Test Nearby Flood Alert Association for Buddy
  console.log("\nStep 4: Associating active flood alert near User B...");
  const testAlert = {
    id: "TEST-ALT-99",
    title: "High Waterlogging near Juhu Station Rd",
    description: "Rising waterlevel of 45cm reported near shops.",
    severity: "CRITICAL",
    level: "RED",
    source: "flood",
    lat: 19.1390,
    lng: 72.8530, // ~150m from User B
    status: "Active"
  };
  store.alerts.push(testAlert);

  const buddiesWithAlert = store.getNearbyFloodBuddies({
    latitude: userA.latitude,
    longitude: userA.longitude,
    radius: 5000,
    currentUserId: userA.user_id
  });

  const buddyBWithAlert = buddiesWithAlert.find(b => b.user_id === userB.user_id);
  if (!buddyBWithAlert || !buddyBWithAlert.nearby_alert) {
    throw new Error("FAIL: User B should have nearby_alert populated!");
  }
  console.log(`✓ User B has nearby alert: "${buddyBWithAlert.nearby_alert.title}" (${buddyBWithAlert.nearby_alert.severity}) - ${buddyBWithAlert.nearby_alert.distance_meters}m from Rahul`);

  // Step 5: User A warns User B
  console.log("\nStep 5: User A (Aryan) sends warning notification to User B (Rahul)...");
  const notifyResult = store.sendFloodBuddyNotification({
    recipientId: userB.user_id,
    senderId: userA.user_id,
    senderName: userA.display_name,
    senderRole: userA.role,
    alertId: testAlert.id
  });

  console.log(`-> Notification Result:`, notifyResult);
  if (!notifyResult.success || !notifyResult.notification) {
    throw new Error("FAIL: sendFloodBuddyNotification failed!");
  }

  const notif = notifyResult.notification;
  if (!notif.title.includes("Aryan warned you")) {
    throw new Error(`FAIL: Expected title to include 'Aryan warned you', got '${notif.title}'`);
  }
  console.log(`✓ Notification created with personalized title: "${notif.title}"`);
  console.log(`  Body: "${notif.body}"`);

  // Step 6: Verify User B receives notification in history
  console.log("\nStep 6: Checking User B's notification inbox...");
  const userBNotifications = store.getUserNotifications(userB.user_id);
  console.log(`-> User B inbox count: ${userBNotifications.length}`);
  if (userBNotifications.length === 0 || userBNotifications[0].id !== notif.id) {
    throw new Error("FAIL: Notification not found in User B inbox!");
  }
  console.log(`✓ User B inbox verified: received warning from ${userBNotifications[0].sender_name}.`);

  // Step 7: Anti-Spam / Cooldown Protection
  console.log("\nStep 7: Testing anti-spam cooldown protection...");
  const spamAttempt = store.sendFloodBuddyNotification({
    recipientId: userB.user_id,
    senderId: userA.user_id,
    senderName: userA.display_name,
    senderRole: userA.role,
    alertId: testAlert.id
  });

  console.log(`-> Spam attempt result:`, spamAttempt);
  if (spamAttempt.success !== false || !spamAttempt.cooldown) {
    throw new Error("FAIL: Expected duplicate warning within cooldown to be blocked!");
  }
  console.log("✓ Anti-spam cooldown correctly blocked rapid duplicate warning.");

  // Clean up test data
  store.users = store.users.filter(u => !u.user_id.startsWith("TEST-"));
  store.alerts = store.alerts.filter(a => a.id !== "TEST-ALT-99");
  store.notifications = store.notifications.filter(n => !n.recipient_user_id.startsWith("TEST-"));

  console.log("\n==================================================");
  console.log("✅ ALL DYNAMIC FLOOD BUDDY & NOTIFICATION TESTS PASSED!");
  console.log("==================================================");
}

verifyDynamicFloodBuddy().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
