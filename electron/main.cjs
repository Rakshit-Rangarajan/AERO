const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let serverProcess;
let mainWindow;
let shuttingDown = false;
let logStream;

function findLoopbackPort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) {
      throw new Error(`AERO's local server exited with code ${serverProcess.exitCode}.`);
    }
    try {
      const response = await fetch(`${url}/api/state`, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return;
    } catch { /* Next.js is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  throw new Error("AERO's local server did not become ready within 90 seconds. Check the log file in %APPDATA%\\AERO\\logs.");
}

async function createMainWindow() {
  const port = await findLoopbackPort();
  const url = `http://127.0.0.1:${port}`;
  const serverDir = path.join(process.resourcesPath, "aero-server");
  const nodePath = path.join(process.resourcesPath, "runtime", "node.exe");
  const serverEntry = path.join(serverDir, "server.js");
  if (!fs.existsSync(serverEntry) || !fs.existsSync(nodePath)) throw new Error("The installer is missing AERO's bundled local runtime.");

  const userData = app.getPath("userData");
  const dataDir = path.join(userData, "data");
  const logsDir = path.join(userData, "logs");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  logStream = fs.createWriteStream(path.join(logsDir, "server.log"), { flags: "a" });
  logStream.write(`\n--- AERO started ${new Date().toISOString()} ---\n`);

  const demoFlagPath = path.join(process.resourcesPath, "..", "demo_mode.flag");
  const isDemo = fs.existsSync(demoFlagPath);

  serverProcess = spawn(nodePath, [serverEntry], {
    cwd: serverDir,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(port), AERO_DATA_DIR: dataDir, AERO_DEMO_MODE: isDemo ? "1" : "0" },
  });
  serverProcess.stdout.pipe(logStream, { end: false });
  serverProcess.stderr.pipe(logStream, { end: false });
  serverProcess.once("error", error => logStream?.write(`Server launch error: ${error.message}\n`));
  serverProcess.once("exit", (code, signal) => {
    logStream?.write(`AERO server exited (code=${code}, signal=${signal}).\n`);
    if (!shuttingDown && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox("AERO stopped", `The local AERO server stopped unexpectedly. Its log is at:\n${path.join(logsDir, "server.log")}`);
      app.quit();
    }
  });

  await waitForServer(url);
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 920,
    minHeight: 640,
    show: false,
    backgroundColor: "#171421",
    title: "AERO · Engineering Operations",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    try {
      const parsed = new URL(target);
      if (parsed.protocol === "https:" || parsed.protocol === "mailto:") void shell.openExternal(target);
    } catch { /* Reject malformed or non-web targets. */ }
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, target) => {
    if (target !== url && !target.startsWith(`${url}/`)) event.preventDefault();
  });
  await mainWindow.loadURL(url);
}

function stopServer() {
  shuttingDown = true;
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    if (process.platform === "win32" && serverProcess.pid) {
      const killer = spawn("taskkill.exe", ["/pid", String(serverProcess.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
      killer.unref();
    }
  }
  logStream?.end();
}

if (gotLock) {
  app.setName("AERO");
  app.setPath("userData", path.join(app.getPath("appData"), "AERO"));
  app.whenReady().then(() => createMainWindow()).catch(error => {
    dialog.showErrorBox("AERO could not start", error instanceof Error ? error.message : "The bundled AERO app could not start.");
    app.quit();
  });
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.on("before-quit", stopServer);
  app.on("window-all-closed", () => app.quit());
}
