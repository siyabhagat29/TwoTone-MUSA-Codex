import { spawn, execSync } from "node:child_process";

function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const lines = out.trim().split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          execSync(`taskkill /F /PID ${pid} >nul 2>&1`);
        }
      }
    } else {
      execSync(`lsof -ti :${port} | xargs kill -9 >/dev/null 2>&1 || true`);
    }
  } catch (_) {}
}

// Automatically ensure default ports are clear of stale processes before starting
freePort(5001);
freePort(5173);

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

// 2. Start Flood Detection AI microservice (Python Keras)
const pythonCmd = process.platform === "win32" ? "python" : "python3";
spawnService("flood-ai", pythonCmd, ["server/src/flood_detector_service.py"]);

// 3. Start web authority dashboard
spawnService("web", "npm", ["--workspace", "apps/web", "run", "dev"]);

// 4. Optionally start mobile app
if (withMobile) {
  spawnService("mobile", "npm", ["--prefix", "apps/mobile", "start"]);
}

function cleanup() {
  console.log("\n🛑 Stopping all services...");
  for (const { proc } of children) {
    try {
      if (proc.pid) {
        if (process.platform !== "win32") {
          try {
            process.kill(-proc.pid, "SIGTERM");
          } catch (_) {
            proc.kill("SIGTERM");
          }
        } else {
          proc.kill("SIGTERM");
        }
      }
    } catch (_) {}
  }
  freePort(5001);
  freePort(5173);
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

