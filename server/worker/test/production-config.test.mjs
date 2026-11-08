import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createProductionConfig } from '../scripts/prepare-production-config.mjs';

const template = await readFile(new URL('../wrangler.production.jsonc', import.meta.url), 'utf8');
const databaseId = '12345678-1234-1234-1234-123456789abc';

test('production config generator inserts the D1 ID without changing bindings', () => {
  const generated = JSON.parse(createProductionConfig(template, databaseId));
  assert.equal(generated.name, 'wadayano-production');
  assert.equal(generated.d1_databases[0].database_id, databaseId);
  assert.equal(generated.d1_databases[0].binding, 'DB');
  assert.deepEqual(generated.assets.run_worker_first, ['/api', '/api/*', '/lti', '/lti/*']);
});

test('production config generator rejects missing or malformed D1 IDs', () => {
  assert.throws(() => createProductionConfig(template, ''), /D1_DATABASE_ID/);
  assert.throws(() => createProductionConfig(template, 'not-a-database-id'), /D1_DATABASE_ID/);
});

test('production config generator rejects a missing placeholder', () => {
  const modifiedTemplate = template.replace('"__D1_DATABASE_ID__"', '"already-configured"');
  assert.throws(() => createProductionConfig(modifiedTemplate, databaseId), /placeholder/);
});
