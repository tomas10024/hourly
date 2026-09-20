import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApiDocument } from '../openapi.js';

/**
 * Writes the OpenAPI document to `docs/openapi.json`.
 *
 * The specification is generated from the Zod schemas at runtime and served at
 * `/api/docs`, but a file in the repository can be read without starting
 * anything - and CI regenerates it to prove the committed copy still matches
 * the code.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(here, '../../../../docs/openapi.json');

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');

const repoRoot = path.resolve(here, '../../../..');
const relative = path.relative(repoRoot, outputPath).split(path.sep).join('/');
console.log(`OpenAPI document written: ${relative}`);
