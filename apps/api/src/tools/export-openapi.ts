import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { openApiDocument } from '../openapi.js';
import { examples } from '../openapi-examples.js';
import { renderMarkdown } from './openapi-markdown.js';

/**
 * Writes the OpenAPI document in three forms: `docs/openapi.json`,
 * `api-spec.yaml` (the specification file the report refers to) and
 * `docs/api.md` (the same, readable on GitHub).
 *
 * The specification is generated from the Zod schemas at runtime and served at
 * `/api/docs`, but files in the repository can be read without starting
 * anything - and CI regenerates them to prove the committed copies still match
 * the code.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');

const outputs: [string, string][] = [
  ['docs/openapi.json', `${JSON.stringify(openApiDocument, null, 2)}\n`],
  // No line folding and no anchors: the file is read by people, not only tools.
  ['api-spec.yaml', stringify(openApiDocument, { lineWidth: 0, aliasDuplicateObjects: false })],
  ['docs/api.md', renderMarkdown(openApiDocument, examples)],
];

for (const [relative, content] of outputs) {
  const outputPath = path.join(repoRoot, relative);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, 'utf8');
  console.log(`OpenAPI document written: ${relative}`);
}
