import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const USER_DATA = path.resolve('scratch/edge_profile_upload');

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
  console.log('\n--- 1. Testing Zero Data State (/upload) ---');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await sendSession('Page.navigate', { url: 'http://localhost:5173/upload' });
  await new Promise((res) => setTimeout(res, 1200));

  let ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  let buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/desktop_upload_zero_data_1280px.png', buffer);
  console.log('Saved screenshots/desktop_upload_zero_data_1280px.png');

  // Mobile 360px Zero Data
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sendSession('Page.navigate', { url: 'http://localhost:5173/upload' });
  await new Promise((res) => setTimeout(res, 1200));

  ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/mobile_upload_zero_data_360px.png', buffer);
  console.log('Saved screenshots/mobile_upload_zero_data_360px.png');

  // --- STEP 2: INSERT TEST ITEMS TO VERIFY STATUS CHIPS, INLINE EDIT, SEARCH & SORT ---
  console.log('\n--- 2. Populating Test Data for Status Chip Verification ---');
  // Today's date calculations
  const today = new Date();
  const nearExpiryDate = new Date(today);
  nearExpiryDate.setDate(today.getDate() + 12);
  const expiredDate = new Date(today);
  expiredDate.setDate(today.getDate() - 10);
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 180);

  // 1. Low stock product (amber chip)
  const p1 = await fetch('http://127.0.0.1:8000/products/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tata Tea Gold 500g',
      category: 'Grocery',
      cost_price: 240,
      selling_price: 285,
      stock_qty: 3,
      reorder_level: 10,
      expiry_date: futureDate.toISOString().split('T')[0],
    }),
  }).then((r) => r.json());

  // 2. Near expiry product (amber chip)
  const p2 = await fetch('http://127.0.0.1:8000/products/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Amul Butter 500g',
      category: 'Dairy',
      cost_price: 220,
      selling_price: 250,
      stock_qty: 25,
      reorder_level: 5,
      expiry_date: nearExpiryDate.toISOString().split('T')[0],
    }),
  }).then((r) => r.json());

  // 3. Out of stock product (red chip)
  const p3 = await fetch('http://127.0.0.1:8000/products/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Maggi 2-Minute Masala 280g',
      category: 'Instant Food',
      cost_price: 45,
      selling_price: 56,
      stock_qty: 0,
      reorder_level: 12,
      expiry_date: futureDate.toISOString().split('T')[0],
    }),
  }).then((r) => r.json());

  // 4. Expired product (red chip)
  const p4 = await fetch('http://127.0.0.1:8000/products/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Crocin Pain Relief Strip',
      category: 'Pharmacy',
      cost_price: 30,
      selling_price: 42,
      stock_qty: 15,
      reorder_level: 5,
      expiry_date: expiredDate.toISOString().split('T')[0],
    }),
  }).then((r) => r.json());

  // 5. Add a Sale
  const s1 = await fetch('http://127.0.0.1:8000/sales/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total_amount: 535,
      total_profit: 75,
      payment_mode: 'UPI',
      items: [],
    }),
  }).then((r) => r.json());

  // 6. Add an Expense
  const e1 = await fetch('http://127.0.0.1:8000/expenses/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: today.toISOString().split('T')[0],
      category: 'Electricity',
      amount: 1450,
      note: 'Meter bill shop front',
    }),
  }).then((r) => r.json());

  // --- STEP 3: CAPTURE WITH DATA (1280px & 360px) ---
  console.log('\n--- 3. Capturing Table with Products & Amber/Red Status Chips ---');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await sendSession('Page.navigate', { url: 'http://localhost:5173/upload' });
  await new Promise((res) => setTimeout(res, 1200));

  ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/desktop_upload_with_data_1280px.png', buffer);
  console.log('Saved screenshots/desktop_upload_with_data_1280px.png');

  // Mobile 360px with data
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sendSession('Page.navigate', { url: 'http://localhost:5173/upload' });
  await new Promise((res) => setTimeout(res, 1200));

  ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/mobile_upload_with_data_360px.png', buffer);
  console.log('Saved screenshots/mobile_upload_with_data_360px.png');

  // --- STEP 4: CLEAN UP TEST ITEMS (RESTORE ZERO-START DEFAULT) ---
  console.log('\n--- 4. Cleaning Up Test Data to Restore Zero-Start Baseline ---');
  await fetch(`http://127.0.0.1:8000/products/${p1.id}`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8000/products/${p2.id}`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8000/products/${p3.id}`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8000/products/${p4.id}`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8000/sales/${s1.id}`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8000/expenses/${e1.id}`, { method: 'DELETE' });
  console.log('Zero data restored.');

  // Verify final count
  const finalCounts = await fetch('http://127.0.0.1:8000/upload/counts').then((r) => r.json());
  console.log('Final Database Counts:', finalCounts);

  edge.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
