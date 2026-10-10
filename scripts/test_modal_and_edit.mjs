import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const USER_DATA = path.resolve('scratch/edge_profile_modal');

fs.mkdirSync(USER_DATA, { recursive: true });

async function run() {
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

  // Obtain JWT
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

  // Create temporary product
  const p = await fetch('http://127.0.0.1:8000/products/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Madhur Sugar 1kg',
      category: 'Grocery',
      cost_price: 38,
      selling_price: 44,
      stock_qty: 4,
      reorder_level: 10,
    }),
  }).then((r) => r.json());

  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await sendSession('Page.navigate', { url: 'http://localhost:5173/upload' });
  await new Promise((res) => setTimeout(res, 1200));

  // 1. Click Delete button to trigger Confirmation Modal
  await sendSession('Runtime.evaluate', {
    expression: `
      const deleteBtn = document.querySelector('button[title="Delete product"]');
      if (deleteBtn) deleteBtn.click();
    `,
  });
  await new Promise((res) => setTimeout(res, 600));

  let ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  let buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/desktop_upload_delete_modal_1280px.png', buffer);
  console.log('Saved screenshots/desktop_upload_delete_modal_1280px.png');

  // 2. Click Cancel in modal
  await sendSession('Runtime.evaluate', {
    expression: `
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    `,
  });
  await new Promise((res) => setTimeout(res, 400));

  // 3. Click Inline Edit
  await sendSession('Runtime.evaluate', {
    expression: `
      const editBtn = document.querySelector('button[title="Inline edit"]');
      if (editBtn) editBtn.click();
    `,
  });
  await new Promise((res) => setTimeout(res, 600));

  ss = await sendSession('Page.captureScreenshot', { format: 'png' });
  buffer = Buffer.from(ss.result.data, 'base64');
  fs.writeFileSync('screenshots/desktop_upload_inline_edit_1280px.png', buffer);
  console.log('Saved screenshots/desktop_upload_inline_edit_1280px.png');

  // Cleanup product
  await fetch(`http://127.0.0.1:8000/products/${p.id}`, { method: 'DELETE' });
  console.log('Test completed and cleaned up.');

  edge.kill();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
