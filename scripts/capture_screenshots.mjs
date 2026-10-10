import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const USER_DATA = path.resolve('scratch/edge_profile');

// Ensure directories
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

  // Wait for Edge to start
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

  console.log('Connected to Edge CDP:', wsUrl);
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

  // Create new target/tab
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
  await sendSession('Network.enable');

  // Set auth cookie
  // First obtain JWT from backend
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

  const routes = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'upload', path: '/upload' },
    { name: 'analytics', path: '/analytics' },
    { name: 'insights', path: '/insights' },
  ];

  // 1. Test at 1280px (Desktop)
  console.log('\n--- Capturing 1280px Desktop Viewports ---');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  for (const r of routes) {
    console.log(`Navigating to http://localhost:5173${r.path} (1280px)...`);
    await sendSession('Page.navigate', { url: `http://localhost:5173${r.path}` });
    await new Promise((res) => setTimeout(res, 1200));
    const ss = await sendSession('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(ss.result.data, 'base64');
    fs.writeFileSync(`screenshots/desktop_${r.name}_1280px.png`, buffer);
    console.log(`Saved screenshots/desktop_${r.name}_1280px.png (${buffer.length} bytes)`);
  }

  // 2. Test at 360px (Mobile)
  console.log('\n--- Capturing 360px Mobile Viewports ---');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 2,
    mobile: true,
  });

  for (const r of routes) {
    console.log(`Navigating to http://localhost:5173${r.path} (360px)...`);
    await sendSession('Page.navigate', { url: `http://localhost:5173${r.path}` });
    await new Promise((res) => setTimeout(res, 1200));
    const ss = await sendSession('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(ss.result.data, 'base64');
    fs.writeFileSync(`screenshots/mobile_${r.name}_360px.png`, buffer);
    console.log(`Saved screenshots/mobile_${r.name}_360px.png (${buffer.length} bytes)`);
  }

  console.log('\nAll 8 viewport test screenshots captured successfully!');
  edge.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
