import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const USER_DATA = path.resolve('scratch/edge_profile_dashboard');

fs.mkdirSync('screenshots', { recursive: true });
fs.mkdirSync(USER_DATA, { recursive: true });

async function run() {
  console.log('Launching Edge headless...');
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--disable-gpu',
    'about:blank',
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Edge DevTools');
    edge.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await new Promise((r) => (ws.onopen = r));

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const targetId = target.result.targetId;
  const session = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = session.result.sessionId;

  const sendSession = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });
  };

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');
  await sendSession('Network.enable');

  // Obtain JWT from backend
  const authRes = await fetch('http://127.0.0.1:8000/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', otp: '123456' }),
  });
  const authData = await authRes.json();
  const token = authData.token;

  await sendSession('Network.setCookie', {
    name: 'store_bi_session',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  // --- STEP 1: TEST ZERO DATA STATE (1280px & 360px) ---
  console.log('\n--- 1. Testing Zero Data State (/dashboard) ---');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await sendSession('Page.navigate', { url: 'http://localhost:5173/dashboard' });
  await new Promise((res) => setTimeout(res, 1500));

  let ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  let buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/desktop_dashboard_top_zero_1280px.png', buffer);
  console.log('Saved screenshots/desktop_dashboard_top_zero_1280px.png');

  // Mobile 360px Zero Data
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sendSession('Page.navigate', { url: 'http://localhost:5173/dashboard' });
  await new Promise((res) => setTimeout(res, 1500));

  ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/mobile_dashboard_top_zero_360px.png', buffer);
  console.log('Saved screenshots/mobile_dashboard_top_zero_360px.png');

  // --- STEP 2: TEST POPULATED STATE (TODAY + YESTERDAY) ---
  console.log('\n--- 2. Populating Test Data (Yesterday + Today Sales) ---');
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  // Yesterday sale: ₹1,200 total, ₹240 profit
  const s_prev = await fetch('http://127.0.0.1:8000/sales/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total_amount: 1200,
      total_profit: 240,
      payment_mode: 'Cash',
      date_time: yesterday.toISOString(),
      items: [],
    }),
  }).then((r) => r.json());

  // Today sale 1: ₹1,800 total, ₹360 profit
  const s_curr1 = await fetch('http://127.0.0.1:8000/sales/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total_amount: 1800,
      total_profit: 360,
      payment_mode: 'UPI',
      date_time: now.toISOString(),
      items: [],
    }),
  }).then((r) => r.json());

  // Today sale 2: ₹750 total, ₹150 profit
  const s_curr2 = await fetch('http://127.0.0.1:8000/sales/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total_amount: 750,
      total_profit: 150,
      payment_mode: 'Cash',
      date_time: now.toISOString(),
      items: [],
    }),
  }).then((r) => r.json());

  // Capture desktop with data (1280px)
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sendSession('Page.navigate', { url: 'http://localhost:5173/dashboard' });
  await new Promise((res) => setTimeout(res, 1500));

  ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/desktop_dashboard_top_data_1280px.png', buffer);
  console.log('Saved screenshots/desktop_dashboard_top_data_1280px.png');

  // Mobile 360px with data
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sendSession('Page.navigate', { url: 'http://localhost:5173/dashboard' });
  await new Promise((res) => setTimeout(res, 1500));

  ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/mobile_dashboard_top_data_360px.png', buffer);
  console.log('Saved screenshots/mobile_dashboard_top_data_360px.png');

  // --- STEP 3: CLEAN UP TEST DATA (RESTORE ZERO-START BASELINE) ---
  console.log('\n--- 3. Cleaning Up Test Data to Restore Zero-Start Baseline ---');
  await fetch(`http://127.0.0.1:8000/sales/${s_prev.id}`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8000/sales/${s_curr1.id}`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8000/sales/${s_curr2.id}`, { method: 'DELETE' });
  console.log('Zero-start baseline restored.');

  edge.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
