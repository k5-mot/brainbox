import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {documentTitle, synchronizeCouchDb} from '../dist/couchdb.js';

/**
 * test用のCouchDB source設定を生成する。
 * @returns credential参照とfilterを含むsource設定。
 */
function sourceConfig() {
  return {
    id: 'obsidian-couchdb',
    adapter: 'couchdb',
    url: 'http://couchdb:5984',
    database: 'obsidian',
    usernameEnv: 'COUCHDB_USERNAME',
    passwordEnv: 'COUCHDB_PASSWORD',
    titleStrategy: 'hierarchy',
    excludePathPrefixes: ['ix:'],
    maxDocuments: 1000,
    ingest: {
      enabled: true,
      runOnStart: true,
      schedule: '0 */6 * * *',
      timeoutSeconds: 600,
    },
  };
}

test('LiveSync Markdownをchildren順に復元してsnapshot同期する', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'sage-wiki-ingester-'));
  const rows = [
    {doc: {_id: 'note', type: 'plain', path: 'AWS/設計.md', children: ['leaf-b', 'leaf-a']}},
    {doc: {_id: 'leaf-a', type: 'leaf', data: '後半'}},
    {doc: {_id: 'leaf-b', type: 'leaf', data: '前半'}},
    {doc: {_id: 'hidden', type: 'plain', path: '.obsidian/app.md', children: []}},
    {doc: {_id: 'livesync', type: 'plain', path: 'ix:device/config.md', children: []}},
  ];
  const fetchSnapshot = async () => new Response(JSON.stringify({rows}), {status: 200});

  try {
    const first = await synchronizeCouchDb(
      projectRoot,
      sourceConfig(),
      {COUCHDB_USERNAME: 'reader', COUCHDB_PASSWORD: 'secret'},
      fetchSnapshot,
    );
    const sourceFiles = await readdir(path.join(projectRoot, 'sources'));
    const markdown = await readFile(path.join(projectRoot, 'sources', sourceFiles[0]), 'utf8');

    assert.equal(first.created, 1);
    assert.match(markdown, /title: AWS 設計/);
    assert.match(markdown, /前半後半/);

    const emptySnapshot = async () => new Response(JSON.stringify({rows: []}), {status: 200});
    const second = await synchronizeCouchDb(
      projectRoot,
      sourceConfig(),
      {COUCHDB_USERNAME: 'reader', COUCHDB_PASSWORD: 'secret'},
      emptySnapshot,
    );
    assert.equal(second.removed, 1);
    assert.deepEqual(await readdir(path.join(projectRoot, 'sources')), []);
  } finally {
    await rm(projectRoot, {recursive: true, force: true});
  }
});

test('階層titleは末尾のMarkdown拡張子だけを除去する', () => {
  assert.equal(documentTitle('AWS/AWS CLF/事前テスト.md', 'hierarchy'), 'AWS AWS CLF 事前テスト');
});
