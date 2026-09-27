import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uncoveredOperations, type PostmanCollectionLike } from './postman-coverage.js';

/**
 * Fails when a documented endpoint has no request in the Postman collection.
 * Run by CI after the OpenAPI document has been checked to be current.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const docs = path.resolve(here, '../../../../docs');

const readJson = <T>(file: string) => JSON.parse(readFileSync(file, 'utf8')) as T;
const openapi = readJson<Parameters<typeof uncoveredOperations>[0]>(
  path.join(docs, 'openapi.json'),
);
const collection = readJson<PostmanCollectionLike>(
  path.join(docs, 'postman/hourly.postman_collection.json'),
);

const missing = uncoveredOperations(openapi, collection);
const total = Object.values(openapi.paths).reduce(
  (sum, operations) => sum + Object.keys(operations).length,
  0,
);

if (missing.length > 0) {
  console.error(`The Postman collection does not call ${missing.length} of ${total} operations:`);
  for (const operation of missing) console.error(`  ${operation}`);
  process.exitCode = 1;
} else {
  console.log(`The Postman collection calls all ${total} documented operations.`);
}
