import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function getFreePort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function httpRequest(port, pathname) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: pathname,
      method: 'GET'
    };
    http.request(options, (res) => {
      resolve({
        status: res.statusCode,
        type: res.headers['content-type']
      });
    }).on('error', reject).end();
  });
}

test('server serves index.html', async () => {
  const port = await getFreePort();
  const server = spawn('node', ['scripts/serve.js'], { 
    cwd: rootDir,
    env: { ...process.env, PORT: port.toString() }
  });
  
  // Wait for "Server running"
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Server running')) {
        resolve();
      }
    });
  });

  try {
    const res1 = await httpRequest(port, '/');
    assert.strictEqual(res1.status, 200, 'index.html should be 200');

    const res2 = await httpRequest(port, '/src/lucky.js');
    assert.strictEqual(res2.status, 200, 'lucky.js should be 200');
    assert.ok(res2.type && res2.type.includes('javascript'), 'lucky.js should be JS type');

    const res3 = await httpRequest(port, '/nope.txt');
    assert.strictEqual(res3.status, 404, 'missing file should be 404');

    // Traversal test: encode the slash to prevent URL parser from collapsing it
    const res4 = await httpRequest(port, '/..%2fpackage.json');
    assert.ok(res4.status === 403 || res4.status === 404, `traversal should be 403/404, got ${res4.status}`);

    // Dot-file test
    const res5 = await httpRequest(port, '/.git/config');
    assert.ok(res5.status === 403 || res5.status === 404, `dot-file should be 403/404, got ${res5.status}`);

  } finally {
    server.kill();
  }
});

test('server with BASE_PATH', async () => {
  const port = await getFreePort();
  const server = spawn('node', ['scripts/serve.js'], { 
    cwd: rootDir,
    env: { ...process.env, PORT: port.toString(), BASE_PATH: '/devteam-pilot/' }
  });
  
  // Wait for "Server running"
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Server running')) {
        resolve();
      }
    });
  });

  try {
    // Should serve from base path
    const res1 = await httpRequest(port, '/devteam-pilot/');
    assert.strictEqual(res1.status, 200, '/devteam-pilot/ should be 200');

    const res2 = await httpRequest(port, '/devteam-pilot/manifest.webmanifest');
    assert.strictEqual(res2.status, 200, '/devteam-pilot/manifest.webmanifest should be 200');
    assert.ok(res2.type && res2.type.includes('manifest'), 'manifest should be manifest+json type');

    // Root should return 404 when BASE_PATH is set
    const res3 = await httpRequest(port, '/');
    assert.strictEqual(res3.status, 404, '/ should be 404 when BASE_PATH is set');

    // Traversal test with BASE_PATH
    const res4 = await httpRequest(port, '/devteam-pilot/..%2fpackage.json');
    assert.ok(res4.status === 403 || res4.status === 404, `traversal with BASE_PATH should be 403/404, got ${res4.status}`);

  } finally {
    server.kill();
  }
});
