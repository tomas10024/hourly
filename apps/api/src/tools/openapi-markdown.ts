import { STATUS_CODES } from 'node:http';
import {
  fallbackExamples,
  primaryExample,
  type CapturedExample,
  type ExampleMap,
} from '../openapi-examples.js';

/**
 * Renders the OpenAPI document as one Markdown page (`docs/api.md`) that
 * GitHub displays without Swagger: per operation its parameters, every
 * documented status and the recorded request/response examples.
 *
 * The prose around the generated text is Lithuanian, like the rest of the
 * report; summaries and descriptions come from the document as they are.
 */

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

interface ParameterLike {
  in: string;
  name: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string | string[]; enum?: unknown[]; format?: string };
}

interface OperationLike {
  tags?: string[];
  summary?: string;
  description?: string;
  security?: Record<string, string[]>[];
  parameters?: ParameterLike[];
  requestBody?: { content?: Record<string, unknown> };
  responses?: Record<string, { description?: string; content?: Record<string, unknown> }>;
}

interface DocumentLike {
  info: { title: string; version: string };
  servers?: { url: string }[];
  tags?: { name: string }[];
  paths?: Record<string, object | undefined>;
}

const LOCATIONS: Record<string, string> = { path: 'adresas', query: 'užklausa' };

/** The anchor GitHub gives a heading: lower case, punctuation dropped, spaces to hyphens. */
const anchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/ /g, '-');

const statusLine = (status: number | string) =>
  `${status} ${STATUS_CODES[Number(status)] ?? ''}`.trim();

const json = (value: unknown) => JSON.stringify(value, null, 2);

function authentication(operation: OperationLike): string {
  const schemes = (operation.security ?? []).map((entry) => Object.keys(entry)[0]);
  if (schemes.includes('refreshCookie')) return 'atnaujinimo žetono slapukas `hourly_refresh`';
  if (schemes.includes('bearerAuth')) {
    return schemes.includes(undefined)
      ? 'neprivaloma – su žetonu atsakymas priklauso nuo naudotojo'
      : '`Authorization: Bearer <prieigos žetonas>`';
  }
  return 'nereikia';
}

function schemaType(parameter: ParameterLike): string {
  const schema = parameter.schema ?? {};
  if (schema.enum) return schema.enum.map((value) => `\`${String(value)}\``).join(', ');
  const type = Array.isArray(schema.type) ? schema.type.join(' | ') : (schema.type ?? '');
  return schema.format ? `${type} (${schema.format})` : type;
}

function requestBlock(example: CapturedExample, operation: OperationLike): string {
  const { request } = example;
  const query = request.query
    ? `?${Object.entries(request.query)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}`
    : '';
  const lines = [`${request.method} ${request.path}${query} HTTP/1.1`];
  if (request.bearer) lines.push('Authorization: Bearer <prieigos žetonas>');
  if (authentication(operation).startsWith('atnaujinimo')) {
    lines.push('Cookie: hourly_refresh=<atnaujinimo žetonas>');
  }
  if (request.accept) lines.push(`Accept: ${request.accept}`);
  if (request.body !== undefined) {
    const body = typeof request.body === 'string' ? request.body : json(request.body);
    lines.push('Content-Type: application/json', '', body);
  }
  return ['```http', ...lines, '```'].join('\n');
}

function responseBlock(
  status: number | string,
  contentType: string | undefined,
  headers: Record<string, string> | undefined,
  body: unknown,
): string {
  const lines = [`HTTP/1.1 ${statusLine(status)}`];
  if (contentType) lines.push(`Content-Type: ${contentType}`);
  for (const [name, value] of Object.entries(headers ?? {})) lines.push(`${name}: ${value}`);
  if (body !== undefined) lines.push('', typeof body === 'string' ? body : json(body));
  return ['```http', ...lines, '```'].join('\n');
}

function renderOperation(
  method: string,
  template: string,
  operation: OperationLike,
  byStatus: Record<string, CapturedExample>,
): string {
  const out: string[] = [`### ${method.toUpperCase()} ${template}`, ''];
  out.push(`**${operation.summary ?? ''}**`, '');
  if (operation.description) out.push(operation.description, '');
  out.push(`Autentifikacija: ${authentication(operation)}.`, '');

  const parameters = operation.parameters ?? [];
  if (parameters.length > 0) {
    out.push('| Parametras | Vieta | Tipas | Privalomas | Aprašymas |', '|---|---|---|---|---|');
    for (const parameter of parameters) {
      out.push(
        `| \`${parameter.name}\` | ${LOCATIONS[parameter.in] ?? parameter.in} | ` +
          `${schemaType(parameter)} | ${parameter.required ? 'taip' : 'ne'} | ` +
          `${(parameter.description ?? '').replace(/\n/g, ' ')} |`,
      );
    }
    out.push('');
  }
  if (operation.requestBody) {
    out.push('Užklausos kūnas: `application/json` (schema – `api-spec.yaml`).', '');
  }

  const statuses = Object.keys(operation.responses ?? {}).sort();
  out.push('| Atsako kodas | Reikšmė | Pavyzdys |', '|---|---|---|');
  for (const status of statuses) {
    const recorded = Object.keys(byStatus).some((slot) => slot.split(' ')[0] === status);
    out.push(
      `| ${statusLine(status)} | ${operation.responses?.[status]?.description ?? ''} | ` +
        `${recorded ? 'užfiksuotas' : 'tipinis'} |`,
    );
  }
  out.push('');

  const primary = primaryExample(byStatus);
  const slots = Object.keys(byStatus).sort();
  for (const slot of slots) {
    const example = byStatus[slot]!;
    const description = operation.responses?.[slot.split(' ')[0]!]?.description ?? '';
    const title = `${statusLine(example.response.status)} – ${description}`;
    out.push(
      example === primary ? '<details open>' : '<details>',
      `<summary>${title}</summary>`,
      '',
      'Užklausa:',
      '',
      requestBlock(example, operation),
      '',
      'Atsakymas:',
      '',
      responseBlock(
        example.response.status,
        example.response.contentType,
        example.response.headers,
        example.response.body,
      ),
      '',
      '</details>',
      '',
    );
  }

  for (const status of statuses) {
    if (slots.some((slot) => slot.split(' ')[0] === status)) continue;
    const media = operation.responses?.[status]?.content;
    const body = media ? fallbackExamples[status] : undefined;
    const description = operation.responses?.[status]?.description ?? '';
    out.push(
      '<details>',
      `<summary>${statusLine(status)} – ${description} (tipinis atsakymas)</summary>`,
      '',
      responseBlock(status, media ? 'application/json' : undefined, undefined, body),
      '',
      '</details>',
      '',
    );
  }
  return out.join('\n');
}

export function renderMarkdown(document: DocumentLike, examples: ExampleMap): string {
  const operations = Object.entries(document.paths ?? {}).flatMap(([template, item]) =>
    METHODS.flatMap((method) => {
      const operation = (item as Record<string, OperationLike | undefined>)[method];
      return operation ? [{ method, template, operation }] : [];
    }),
  );

  const out: string[] = [
    `# ${document.info.title} – specifikacija`,
    '',
    '<!-- Generated by `npm run openapi:export` from apps/api/src/openapi.ts. Do not edit. -->',
    '',
    `Versija ${document.info.version}. Mašinai skaitoma specifikacija – ` +
      '[api-spec.yaml](../api-spec.yaml) (OpenAPI 3.1), interaktyvi – Swagger UI adresu ' +
      '`/api/docs`. Šis puslapis sugeneruotas iš to paties dokumento.',
    '',
    `Bazinis adresas: \`${document.servers?.[0]?.url ?? '/api'}\`. Visos klaidos grąžinamos ` +
      'vienodu formatu `{ "error": { "code", "message", "details" } }`.',
    '',
    'Pavyzdžiai **užfiksuoti** paleidus Postman kolekciją su pradiniais duomenimis – tai ' +
      'tikri sąsajos atsakymai. Ilgi sąrašai sutrumpinti iki dviejų elementų, JWT parašas ' +
      'pakeistas `<signature>`. Kodams, kurių kolekcija konkrečiam metodui nesukelia ' +
      '(pvz., 403 užblokuotai paskyrai), pateikiamas **tipinis** atsakymas.',
    '',
    '## Metodų suvestinė',
    '',
    '| Metodas | Paskirtis | Atsako kodai |',
    '|---|---|---|',
  ];
  for (const { method, template, operation } of operations) {
    const heading = `${method.toUpperCase()} ${template}`;
    const statuses = Object.keys(operation.responses ?? {}).sort().join(', ');
    out.push(`| [\`${heading}\`](#${anchor(heading)}) | ${operation.summary ?? ''} | ${statuses} |`);
  }
  out.push('');

  for (const { name } of document.tags ?? []) {
    out.push(`## ${name}`, '');
    for (const { method, template, operation } of operations) {
      if (!operation.tags?.includes(name)) continue;
      const byStatus = examples[`${method.toUpperCase()} ${template}`] ?? {};
      out.push(renderOperation(method, template, operation, byStatus));
    }
  }
  return `${out.join('\n').trimEnd()}\n`;
}
