import assert from 'node:assert/strict';
import test from 'node:test';
import {parseConfig, startupSources, validateEnvironment} from '../dist/config.js';

/**
 * testで変更する最小の有効なIngester設定を生成する。
 * @returns schema検証前の設定object。
 */
function baseConfig() {
  return {
    version: 1,
    project: {root: '/wiki'},
    scheduler: {timezone: 'Asia/Tokyo'},
    defaults: {
      ingest: {
        enabled: false,
        run_on_start: false,
        schedule: '0 * * * *',
        timeout_seconds: 600,
      },
    },
    sources: [],
  };
}

test('source別設定を既定値へ上書きする', () => {
  const value = baseConfig();
  value.sources = [{
    id: 'obsidian-couchdb',
    adapter: 'couchdb',
    url: 'http://couchdb:5984',
    database: 'obsidian',
    username_env: 'COUCHDB_USERNAME',
    password_env: 'COUCHDB_PASSWORD',
    ingest: {enabled: true, run_on_start: true, schedule: '0 */6 * * *'},
  }];

  const config = parseConfig(value);

  assert.deepEqual(config.sources[0].ingest, {
    enabled: true,
    runOnStart: true,
    schedule: '0 */6 * * *',
    timeoutSeconds: 600,
  });
  assert.deepEqual(startupSources(config).map((source) => source.id), ['obsidian-couchdb']);
});

test('有効なCouchDB sourceの参照credentialを検証する', () => {
  const value = baseConfig();
  value.sources = [{
    id: 'obsidian-couchdb',
    adapter: 'couchdb',
    url: 'http://couchdb:5984',
    database: 'obsidian',
    username_env: 'COUCHDB_USERNAME',
    password_env: 'COUCHDB_PASSWORD',
    ingest: {enabled: true},
  }];
  const config = parseConfig(value);

  assert.throws(() => validateEnvironment(config, {}), /COUCHDB_USERNAME/);
  assert.doesNotThrow(() => validateEnvironment(config, {
    COUCHDB_USERNAME: 'reader',
    COUCHDB_PASSWORD: 'secret',
  }));
});
