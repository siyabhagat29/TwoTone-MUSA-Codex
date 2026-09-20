import { spawn } from "node:child_process";

const withMobile = process.argv.includes("--with-mobile") || process.argv.includes("--all");

console.log("=================================================");
console.log("🌊 Starting VarshaRaksha Full-Stack System 🌊");
console.log("=================================================");
console.log("• Backend API:      http://localhost:5001");
console.log("• Authority Web:    http://localhost:5173");
if (withMobile) {
  console.log("• Resident Mobile:  Expo Metro bundler");
}
console.log("Press Ctrl+C at any time to stop all services.\n");

const children = [];

function spawnService(name, cmd, args, cwd = process.cwd()) {
  const proc = spawn(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" }
  });

  children.push({ name, proc });

  proc.on("exit", (code, signal) => {
    if (signal) {
      // killed by signal, normal during shutdown
      return;
    }
    if (code !== 0 && code !== null) {
      console.error(`\n⚠️ [${name}] exited with error code ${code}`);
    }
  });

  return proc;
}

// 1. Start backend server
spawnService("server", "npm", ["--workspace", "server", "run", "dev"]);

// 2. Start web authority dashboard
spawnService("web", "npm", ["--workspace", "apps/web", "run", "dev"]);

// 3. Optionally start mobile app
if (withMobile) {
  spawnService("mobile", "npm", ["--prefix", "apps/mobile", "start"]);
}

function cleanup() {
  console.log("\n🛑 Stopping all services...");
  for (const { proc } of children) {
    try {
      proc.kill("SIGTERM");
    } catch (_) {}
  }
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
