'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { resolveExistingState } = require('../lib/context');

const SCHEMA_VERSION = 1;
const SUPPORTED_TYPES = new Set(['auto', 'text', 'pdf', 'image', 'docx', 'xlsx']);

function parseArgs(args) {
  const options = {
    sourcePath: null,
    type: 'auto',
    json: false,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--type=')) {
      options.type = String(arg.slice('--type='.length) || '').trim().toLowerCase();
      continue;
    }
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    throw new Error('Unknown ingest option "' + arg + '". Supported: --type=<auto|text|pdf|image|docx|xlsx>, --json');
  }

  if (rest.length === 0) {
    throw new Error('kbx ingest requires a source file path');
  }

  if (!SUPPORTED_TYPES.has(options.type)) {
    throw new Error('Invalid --type value "' + options.type + '". Supported: auto, text, pdf, image, docx, xlsx');
  }

  options.sourcePath = rest[0];
  return options;
}

function detectTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.yml', '.toml', '.py', '.go', '.rs', '.java', '.cs', '.rb', '.php'].includes(ext)) {
    return 'text';
  }
  if (ext === '.pdf') return 'pdf';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'].includes(ext)) return 'image';
  if (ext === '.docx') return 'docx';
  if (ext === '.xlsx') return 'xlsx';
  return 'text';
}

function hashContent(content) {
  return crypto.createHash('sha1').update(content).digest('hex').slice(0, 12);
}

function chunkText(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function buildIngestionId(relSourcePath) {
  const slug = relSourcePath.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').slice(-30);
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  return slug + '-' + ts;
}

function createBasePayload({ ingestionId, relSourcePath, type, sourceHash }) {
  return {
    schema_version: SCHEMA_VERSION,
    ingestion_id: ingestionId,
    generated_at: new Date().toISOString(),
    metadata: {
      source_path: relSourcePath,
      type,
      source_hash: sourceHash,
    },
    text_chunks: [],
    tables: [],
    entities: [],
    confidence: {
      overall: 0,
      extraction: 'none',
    },
    warnings: [],
    status: 'pending',
  };
}

function writePayload(contentRoot, payload) {
  const ingestionDir = path.join(contentRoot, '.kb', 'ingestion');
  fs.mkdirSync(ingestionDir, { recursive: true });
  const filePath = path.join(ingestionDir, payload.ingestion_id + '.json');
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}

function printHumanOutput({ payload, payloadPath, selectedType }) {
  console.log('Ingestion completed.');
  console.log('ID      : ' + payload.ingestion_id);
  console.log('Source  : ' + payload.metadata.source_path);
  console.log('Type    : ' + selectedType);
  console.log('Status  : ' + payload.status);
  console.log('Payload : ' + payloadPath);

  if (payload.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of payload.warnings) {
      console.log('  - ' + warning);
    }
  }
}

function runIngest({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const ctx = resolveExistingState({ workspaceRoot });

  const absSourcePath = path.isAbsolute(options.sourcePath)
    ? options.sourcePath
    : path.join(workspaceRoot, options.sourcePath);

  if (!fs.existsSync(absSourcePath)) {
    throw new Error('Source file not found: ' + absSourcePath);
  }

  const relSourcePath = path.relative(workspaceRoot, absSourcePath).replace(/\\/g, '/');
  const selectedType = options.type === 'auto' ? detectTypeFromPath(absSourcePath) : options.type;
  const sourceBuffer = fs.readFileSync(absSourcePath);
  const sourceHash = hashContent(sourceBuffer);
  const ingestionId = buildIngestionId(relSourcePath);
  const payload = createBasePayload({ ingestionId, relSourcePath, type: selectedType, sourceHash });

  if (selectedType === 'text') {
    const text = sourceBuffer.toString('utf8');
    const chunks = chunkText(text, 2000);
    payload.text_chunks = chunks.map((chunk, index) => ({
      index,
      char_start: index * 2000,
      char_end: (index * 2000) + chunk.length,
      content: chunk,
    }));
    payload.confidence = {
      overall: 0.95,
      extraction: 'direct-text-read',
    };
    payload.status = 'ready';
  } else {
    payload.status = 'requires-parser';
    payload.warnings.push('Parser for type "' + selectedType + '" is not installed in this patch build.');
    payload.warnings.push('Use external extraction to markdown/text, then rerun: kbx ingest <converted-file> --type=text');
    payload.confidence = {
      overall: 0.2,
      extraction: 'metadata-only',
    };
  }

  const payloadPath = writePayload(ctx.contentRoot, payload);

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx ingest',
      source_path: relSourcePath,
      type: selectedType,
      payload_path: payloadPath,
      status: payload.status,
      warnings: payload.warnings,
    }, null, 2));
    return;
  }

  printHumanOutput({ payload, payloadPath, selectedType });
}

module.exports = {
  runIngest,
  parseArgs,
};
