import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const workerDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(workerDirectory, 'wrangler.production.jsonc');
const generatedPath = path.join(workerDirectory, 'wrangler.production.generated.jsonc');
const databaseIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function createProductionConfig(templateText, databaseId) {
  if (!databaseIdPattern.test(databaseId ?? '')) {
    throw new Error('D1_DATABASE_ID must be a Cloudflare D1 database UUID.');
  }

  const config = JSON.parse(templateText);
  const database = config.d1_databases?.find(binding => binding.binding === 'DB');
  if (!database || database.database_id !== '__D1_DATABASE_ID__') {
    throw new Error('Production Wrangler config must contain the D1 database ID placeholder.');
  }

  database.database_id = databaseId;
  return `${JSON.stringify(config, null, 2)}\n`;
}

async function main() {
  const databaseId = process.env.D1_DATABASE_ID;
  if (!databaseId) {
    throw new Error('Set D1_DATABASE_ID as a Workers Builds build variable.');
  }

  const templateText = await readFile(templatePath, 'utf8');
  const generatedConfig = createProductionConfig(templateText, databaseId);
  await writeFile(generatedPath, generatedConfig, { mode: 0o600 });
  console.log('Generated wrangler.production.generated.jsonc.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
