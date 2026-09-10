import assert from 'node:assert/strict';
import test from 'node:test';
import {startStatusServer} from '../dist/status.js';

/**
 * Status API、Web UIおよびmanual triggerが同じruntime状態を共有することを検証する。
 * @returns 検証完了時にresolveするPromise。
 */
test('status APIとWeb UIから同じIngester状態を確認できる', async () => {
  const snapshot = {
    startedAt: '2026-09-09T00:00:00.000Z',
    ready: true,
    projectRoot: '/wiki',
    timezone: 'Asia/Tokyo',
    sources: [{
      id: 'obsidian-couchdb',
      adapter: 'couchdb',
      enabled: true,
      runOnStart: true,
      schedule: '0 */6 * * *',
      state: 'success',
      lastSummary: {documents: 104, created: 0, updated: 0, unchanged: 104, removed: 0, skippedEmpty: 0},
    }],
  };
  let triggeredSource;
  const server = await startStatusServer(
    0,
    () => snapshot,
    (sourceId) => {
      triggeredSource = sourceId;
      snapshot.sources[0].state = 'queued';
      return sourceId === 'obsidian-couchdb' ? 'accepted' : 'not-found';
    },
    'test-token',
  );
  const address = server.address();
  assert(address && typeof address === 'object');

  try {
    const statusResponse = await fetch(`http://127.0.0.1:${address.port}/api/status`);
    assert.equal(statusResponse.status, 200);
    assert.deepEqual(await statusResponse.json(), snapshot);

    const pageResponse = await fetch(`http://127.0.0.1:${address.port}/`);
    assert.equal(pageResponse.status, 200);
    assert.match(await pageResponse.text(), /Sage Wiki Ingester/);

    const unauthorizedResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/sources/obsidian-couchdb/ingest`,
      {method: 'POST'},
    );
    assert.equal(unauthorizedResponse.status, 401);

    const invalidSourceResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/sources/%E0%A4%A/ingest`,
      {method: 'POST', headers: {authorization: 'Bearer test-token'}},
    );
    assert.equal(invalidSourceResponse.status, 400);

    const triggerResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/sources/obsidian-couchdb/ingest`,
      {method: 'POST', headers: {authorization: 'Bearer test-token'}},
    );
    assert.equal(triggerResponse.status, 202);
    assert.deepEqual(await triggerResponse.json(), {
      source: 'obsidian-couchdb',
      state: 'queued',
    });
    assert.equal(triggeredSource, 'obsidian-couchdb');
    assert.equal(snapshot.sources[0].state, 'queued');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
