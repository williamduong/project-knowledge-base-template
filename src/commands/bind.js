const path = require('path');

const { resolveExistingState } = require('../lib/context');
const {
  addBinding,
  getDocBindings,
  listAllDocBindings,
  readBindingsFile,
  writeBindingsFile,
} = require('../lib/bindings');

function parseArgs(args) {
  const options = {
    list: false,
    json: false,
    doc: null,
    paths: [],
  };

  const rest = [];
  for (const arg of args || []) {
    if (arg === '--list') {
      options.list = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown bind option "${arg}". Supported: --list, --json`);
    }
    rest.push(arg);
  }

  if (options.list) {
    if (rest.length > 1) {
      throw new Error('kb bind --list accepts at most 1 argument: [<doc>]');
    }
    options.doc = rest[0] || null;
  } else {
    if (rest.length < 2) {
      throw new Error('kb bind requires: <doc> <path...>   (or use --list)');
    }
    options.doc = rest[0];
    options.paths = rest.slice(1);
  }

  return options;
}

function runListAll({ context, options }) {
  const bindings = listAllDocBindings(context.contentRoot);
  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb bind --list',
      contentRoot: context.contentRoot,
      bindings,
    }, null, 2));
    return;
  }

  if (bindings.length === 0) {
    console.log('kb bind: no bindings declared.');
    console.log(`Add one with: kb bind <doc> <path...>`);
    return;
  }

  console.log(`kb bind: ${bindings.length} doc(s) bound`);
  for (const b of bindings) {
    console.log(`  ${b.doc}  [${b.source}]`);
    for (const p of b.paths) {
      console.log(`    - ${p}`);
    }
  }
}

function runListOne({ context, options }) {
  const resolved = getDocBindings(context.contentRoot, options.doc);
  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb bind --list',
      doc: options.doc,
      paths: resolved.paths,
      source: resolved.source,
    }, null, 2));
    return;
  }
  if (resolved.paths.length === 0) {
    console.log(`kb bind: no binding for "${options.doc}".`);
    return;
  }
  console.log(`kb bind: ${options.doc}  [${resolved.source}]`);
  for (const p of resolved.paths) {
    console.log(`  - ${p}`);
  }
}

function runAdd({ context, options }) {
  const current = readBindingsFile(context.contentRoot);
  const next = addBinding(current, options.doc, options.paths, 'user');
  const filePath = writeBindingsFile(context.contentRoot, next);

  const entry = next.bindings.find((b) => b.doc === options.doc.replace(/\\/g, '/'));
  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb bind',
      written: filePath,
      doc: entry.doc,
      paths: entry.paths,
    }, null, 2));
    return;
  }
  console.log(`kb bind: updated ${filePath}`);
  console.log(`  doc  : ${entry.doc}`);
  console.log(`  paths: ${entry.paths.length}`);
  for (const p of entry.paths) {
    console.log(`    - ${p}`);
  }
}

function runBind({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });

  if (options.list) {
    if (options.doc) {
      runListOne({ context, options });
    } else {
      runListAll({ context, options });
    }
    return;
  }

  runAdd({ context, options });
}

module.exports = {
  runBind,
};
