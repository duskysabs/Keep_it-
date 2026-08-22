import { spawn } from "node:child_process";
import electronPath from "electron";

const host = "127.0.0.1";
const port = process.env.KEEP_IT_PORT || "3000";
const developmentUrl = `http://${host}:${port}`;
const nodeExecutable = process.execPath;
let nextProcess;
let electronProcess;
let shuttingDown = false;

const isServerReady = async () => {
  try {
    const response = await fetch(developmentUrl, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
};

const waitForServer = async () => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isServerReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Next.js did not become ready at ${developmentUrl}.`);
};

const stopChildren = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  electronProcess?.kill();
  nextProcess?.kill();
};

const run = async () => {
  if (!(await isServerReady())) {
    nextProcess = spawn(nodeExecutable, ["node_modules/next/dist/bin/next", "dev", "-H", host, "-p", port], {
      cwd: process.cwd(),
      stdio: "inherit",
      windowsHide: true,
    });
    nextProcess.on("exit", (code) => {
      if (!shuttingDown && code) process.exitCode = code;
    });
  }

  await waitForServer();

  electronProcess = spawn(electronPath, ["."], {
    cwd: process.cwd(),
    env: { ...process.env, KEEP_IT_DEV_URL: developmentUrl },
    stdio: "inherit",
    windowsHide: true,
  });

  electronProcess.on("exit", (code) => {
    stopChildren();
    process.exitCode = code ?? 0;
  });
};

process.on("SIGINT", stopChildren);
process.on("SIGTERM", stopChildren);
process.on("exit", stopChildren);

run().catch((error) => {
  console.error(error);
  stopChildren();
  process.exitCode = 1;
});
