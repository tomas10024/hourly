import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApiDocument } from '../openapi.js';
import { captureExamples, type NewmanExecution } from './example-capture.js';

/**
 * Turns a Newman run of the Postman collection into the request and response
 * examples of the OpenAPI document (`src/openapi-examples.json`).
 *
 * The collection already calls every operation with its success and error
 * cases against a seeded database, so the examples are real responses rather
 * than hand-written ones.
 *
 *   npm run demo -- --reporters cli,json --reporter-json-export <run.json>
 *   npm run openapi:examples --workspace apps/api -- <run.json>
 *   npm run openapi:export
 */
const runFile = process.argv[2];
if (!runFile) {
  console.error('Usage: capture-examples <newman-json-export>');
  process.exit(1);
}

const run = JSON.parse(readFileSync(runFile, 'utf8')) as { run: { executions: NewmanExecution[] } };
const examples = captureExamples(openApiDocument, run.run.executions);

const here = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(here, '../openapi-examples.json');
writeFileSync(outputPath, `${JSON.stringify(examples, null, 2)}
`, 'utf8');

const count = Object.values(examples).reduce((sum, s) => sum + Object.keys(s).length, 0);
console.log(`${count} examples of ${Object.keys(examples).length} operations written.`);
