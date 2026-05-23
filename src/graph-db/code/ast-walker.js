'use strict';

// ---------------------------------------------------------------------------
// Code Graph — AST walker (Phase 1)
//
// Parses a single JS/TS/JSX/TSX file using @babel/parser and extracts:
//   symbols  — function / class / variable / type declarations
//   imports  — static import + require() call targets
//   exports  — named + default exports
//   calls    — intra-file call edges (callee is a locally-defined symbol)
//   inherits — class extends relationships
//
// No DB calls here. Returns plain objects; the ingester writes to ArangoDB.
// ---------------------------------------------------------------------------

const fs   = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', '__pycache__']);

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function fileKey(relPath) {
  return relPath.replace(/[^a-zA-Z0-9]/g, '_');
}

function symbolKey(relPath, name, line) {
  return `${fileKey(relPath)}__${name.replace(/[^a-zA-Z0-9_]/g, '_')}__${line}`;
}

// ---------------------------------------------------------------------------
// Parser config per extension
// ---------------------------------------------------------------------------

function parserPlugins(ext) {
  const plugins = ['decorators-legacy', 'classProperties'];
  if (ext === '.ts' || ext === '.tsx') plugins.push('typescript');
  if (ext === '.jsx' || ext === '.tsx') plugins.push('jsx');
  return plugins;
}

function parseSource(source, ext) {
  return parse(source, {
    sourceType: 'unambiguous',
    plugins: parserPlugins(ext),
    errorRecovery: true,
    strictMode: false,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
  });
}

function detectLanguage(ext) {
  if (ext === '.ts' || ext === '.tsx') return 'typescript';
  if (ext === '.jsx' || ext === '.tsx') return 'jsx';
  if (ext === '.mjs') return 'esm';
  if (ext === '.cjs') return 'commonjs';
  return 'javascript';
}

// ---------------------------------------------------------------------------
// Resolve an import source to a workspace-relative path.
// Returns null for external packages (node_modules).
// ---------------------------------------------------------------------------

function resolveImportSource(source, fromAbsolute, workspaceRoot) {
  if (!source.startsWith('.')) return null; // external package

  const fromDir = path.dirname(fromAbsolute);
  const resolved = path.resolve(fromDir, source);

  // Try exact match, then with extensions
  const candidates = [
    resolved,
    ...SUPPORTED_EXTENSIONS.values().map ? [...SUPPORTED_EXTENSIONS].map(ext => resolved + ext) : [],
    path.join(resolved, 'index.js'),
    path.join(resolved, 'index.ts'),
    path.join(resolved, 'index.mjs'),
  ];

  // Handle Set iteration for older Node
  const exts = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'];
  const allCandidates = [resolved, ...exts.map(e => resolved + e),
    path.join(resolved, 'index.js'), path.join(resolved, 'index.ts'), path.join(resolved, 'index.mjs')];

  for (const candidate of allCandidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.relative(workspaceRoot, candidate).replace(/\\/g, '/');
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Extract the string value from a Babel StringLiteral or TemplateLiteral
// ---------------------------------------------------------------------------

function extractStringValue(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  // TemplateLiteral with no expressions → treat as static
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Collect all CallExpression callee names within a subtree (for CALLS edges)
// ---------------------------------------------------------------------------

function collectCallNames(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectCallNames(n, out)); return; }

  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.type === 'Identifier') {
      out.push({ name: callee.name, line: callee.loc && callee.loc.start.line });
    } else if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
      // e.g. obj.method() — record the object name
      out.push({ name: callee.object.name, line: callee.loc && callee.loc.start.line });
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end' || key === 'extra') continue;
    const child = node[key];
    if (child && typeof child === 'object') collectCallNames(child, out);
  }
}

// ---------------------------------------------------------------------------
// Extract MemberExpression as dotted name string (e.g. React.Component)
// ---------------------------------------------------------------------------

function memberName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const obj = memberName(node.object);
    const prop = node.property && node.property.name;
    if (obj && prop) return `${obj}.${prop}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main walker
// ---------------------------------------------------------------------------

/**
 * Walk a single file and return:
 * {
 *   file:     { relPath, language, size, last_modified }
 *   symbols:  [{ key, name, kind, file, line, exported }]
 *   imports:  [{ fromFile, toFile|null, rawSource, external, specifiers }]
 *   exports:  [{ fromFile, symbolKey|null, symbolName, isDefault }]
 *   calls:    [{ fromSymbolKey, toSymbolKey }]   — intra-file only
 *   inherits: [{ fromSymbolKey, toSymbolKey|null, toName }]
 * }
 *
 * absolutePath — absolute path to file
 * relPath      — path relative to workspaceRoot (forward slashes)
 * workspaceRoot — absolute path to workspace root
 */
function walkFile(absolutePath, relPath, workspaceRoot) {
  const ext = path.extname(absolutePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) return null;

  let source;
  try { source = fs.readFileSync(absolutePath, 'utf8'); } catch { return null; }

  const stat = fs.statSync(absolutePath);
  const fileNode = {
    relPath,
    language: detectLanguage(ext),
    size:     stat.size,
    last_modified: stat.mtime.toISOString(),
  };

  let ast;
  try { ast = parseSource(source, ext); } catch { return null; }

  const program = ast.program || ast;
  const body = program.body || [];

  const symbols  = [];
  const imports  = [];
  const exports  = [];
  const inherits = [];

  // localSymbolsByName: name → symbolKey (for CALLS + INHERITS resolution)
  const localSymbolsByName = new Map();

  // --- Pass 1: collect top-level declarations ---

  function registerSymbol(name, kind, line, isExported) {
    if (!name) return null;
    const key = symbolKey(relPath, name, line || 0);
    symbols.push({ key, name, kind, file: relPath, line: line || 0, exported: !!isExported });
    localSymbolsByName.set(name, key);
    return key;
  }

  // bodyWithNode: pairs of { sym, bodyNode } for Pass 2 (CALLS scan)
  const bodyWithNode = [];

  function processDeclaration(node, isExported) {
    if (!node) return;
    const line = node.loc && node.loc.start.line;

    if (node.type === 'FunctionDeclaration' && node.id) {
      const key = registerSymbol(node.id.name, 'function', line, isExported);
      if (key) bodyWithNode.push({ symKey: key, bodyNode: node.body });
    }

    if (node.type === 'ClassDeclaration' && node.id) {
      const key = registerSymbol(node.id.name, 'class', line, isExported);
      if (key && node.superClass) {
        const parentName = memberName(node.superClass);
        inherits.push({ fromSymbolKey: key, toName: parentName });
      }
      // Class methods → register as symbols too
      if (node.body && node.body.body) {
        for (const member of node.body.body) {
          if ((member.type === 'ClassMethod' || member.type === 'ClassPrivateMethod') && member.key) {
            const methodName = member.key.name || (member.key.id && member.key.id.name);
            if (methodName) {
              const mKey = registerSymbol(`${node.id.name}.${methodName}`, 'function', member.loc && member.loc.start.line, false);
              if (mKey) bodyWithNode.push({ symKey: mKey, bodyNode: member.body });
            }
          }
        }
      }
    }

    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations || []) {
        if (!decl.id || decl.id.type !== 'Identifier') continue;
        const name = decl.id.name;
        const init = decl.init;
        let kind = 'variable';
        let bodyNode = null;
        if (init && (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression')) {
          kind = 'function';
          bodyNode = init.body;
        }
        const key = registerSymbol(name, kind, line, isExported);
        if (key && bodyNode) bodyWithNode.push({ symKey: key, bodyNode });
      }
    }

    // TypeScript type aliases + interfaces
    if (node.type === 'TSTypeAliasDeclaration' && node.id) {
      registerSymbol(node.id.name, 'type', line, isExported);
    }
    if (node.type === 'TSInterfaceDeclaration' && node.id) {
      registerSymbol(node.id.name, 'type', line, isExported);
    }
    if (node.type === 'TSEnumDeclaration' && node.id) {
      registerSymbol(node.id.name, 'type', line, isExported);
    }
  }

  for (const stmt of body) {
    // ImportDeclaration
    if (stmt.type === 'ImportDeclaration') {
      const rawSource = stmt.source && stmt.source.value;
      if (rawSource) {
        const specifiers = (stmt.specifiers || []).map(s => s.local && s.local.name).filter(Boolean);
        const toFile = resolveImportSource(rawSource, absolutePath, workspaceRoot);
        imports.push({ fromFile: relPath, toFile, rawSource, external: !rawSource.startsWith('.'), specifiers });
      }
      continue;
    }

    // ExportNamedDeclaration
    if (stmt.type === 'ExportNamedDeclaration') {
      if (stmt.declaration) {
        processDeclaration(stmt.declaration, true);
        // The declared name(s) are picked up by processDeclaration with isExported=true
        const names = extractDeclaredNames(stmt.declaration);
        for (const name of names) {
          const key = localSymbolsByName.get(name);
          exports.push({ fromFile: relPath, symbolKey: key || null, symbolName: name, isDefault: false });
        }
      } else {
        // export { foo, bar as baz }
        for (const spec of stmt.specifiers || []) {
          const exportedName = spec.exported && spec.exported.name;
          const localName    = spec.local && spec.local.name;
          const key = localSymbolsByName.get(localName || exportedName);
          exports.push({ fromFile: relPath, symbolKey: key || null, symbolName: exportedName || localName, isDefault: false });
        }
        // Re-export from another module (export { x } from './y') — also an import
        if (stmt.source) {
          const rawSource = stmt.source.value;
          const toFile = resolveImportSource(rawSource, absolutePath, workspaceRoot);
          imports.push({ fromFile: relPath, toFile, rawSource, external: !rawSource.startsWith('.'), specifiers: [] });
        }
      }
      continue;
    }

    // ExportDefaultDeclaration
    if (stmt.type === 'ExportDefaultDeclaration') {
      const decl = stmt.declaration;
      processDeclaration(decl, true);
      const name = (decl && decl.id && decl.id.name) || 'default';
      const key = localSymbolsByName.get(name);
      exports.push({ fromFile: relPath, symbolKey: key || null, symbolName: name, isDefault: true });
      continue;
    }

    // module.exports = ... (CJS)
    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'AssignmentExpression' &&
      stmt.expression.operator === '='
    ) {
      const left = stmt.expression.left;
      if (
        left.type === 'MemberExpression' &&
        left.object.type === 'Identifier' && left.object.name === 'module' &&
        left.property.type === 'Identifier' && left.property.name === 'exports'
      ) {
        const right = stmt.expression.right;
        if (right.type === 'ObjectExpression') {
          for (const prop of right.properties || []) {
            if (prop.type === 'ObjectProperty' && prop.key) {
              const name = prop.key.name || prop.key.value;
              const key = localSymbolsByName.get(name);
              exports.push({ fromFile: relPath, symbolKey: key || null, symbolName: name, isDefault: false });
            }
          }
        } else if (right.type === 'Identifier') {
          const key = localSymbolsByName.get(right.name);
          exports.push({ fromFile: relPath, symbolKey: key || null, symbolName: right.name, isDefault: true });
        }
      }
      // require() in top-level variable: const x = require('./foo')
      if (stmt.expression.type === 'AssignmentExpression') {
        const right = stmt.expression.right;
        if (right && right.type === 'CallExpression') {
          const rawSource = extractRequireSource(right);
          if (rawSource) {
            const toFile = resolveImportSource(rawSource, absolutePath, workspaceRoot);
            imports.push({ fromFile: relPath, toFile, rawSource, external: !rawSource.startsWith('.'), specifiers: [] });
          }
        }
      }
      continue;
    }

    // require() in top-level VariableDeclaration
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations || []) {
        const rawSource = decl.init && extractRequireSource(decl.init);
        if (rawSource) {
          const specifiers = decl.id.type === 'Identifier' ? [decl.id.name] :
            (decl.id.type === 'ObjectPattern' ? decl.id.properties.map(p => p.key && p.key.name).filter(Boolean) : []);
          const toFile = resolveImportSource(rawSource, absolutePath, workspaceRoot);
          imports.push({ fromFile: relPath, toFile, rawSource, external: !rawSource.startsWith('.'), specifiers });
        }
      }
      processDeclaration(stmt, false);
      continue;
    }

    // Other top-level declarations (plain function/class)
    processDeclaration(stmt, false);
  }

  // --- Pass 2: CALLS scan (intra-file only) ---

  const calls = [];
  for (const { symKey, bodyNode } of bodyWithNode) {
    const callNames = [];
    collectCallNames(bodyNode, callNames);
    for (const { name, line: callLine } of callNames) {
      const toKey = localSymbolsByName.get(name);
      if (toKey && toKey !== symKey) {
        calls.push({ fromSymbolKey: symKey, toSymbolKey: toKey });
      }
    }
  }

  // Dedup calls
  const callSet = new Set();
  const uniqueCalls = calls.filter(c => {
    const k = `${c.fromSymbolKey}→${c.toSymbolKey}`;
    if (callSet.has(k)) return false;
    callSet.add(k);
    return true;
  });

  // --- Resolve INHERITS to local symbol keys where possible ---

  const resolvedInherits = inherits.map(inh => ({
    ...inh,
    toSymbolKey: inh.toName ? (localSymbolsByName.get(inh.toName) || null) : null,
  }));

  return { file: fileNode, symbols, imports, exports, calls: uniqueCalls, inherits: resolvedInherits };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractDeclaredNames(node) {
  if (!node) return [];
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' ||
      node.type === 'TSTypeAliasDeclaration' || node.type === 'TSInterfaceDeclaration' || node.type === 'TSEnumDeclaration') {
    return node.id ? [node.id.name] : [];
  }
  if (node.type === 'VariableDeclaration') {
    return (node.declarations || []).map(d => d.id && d.id.name).filter(Boolean);
  }
  return [];
}

function extractRequireSource(node) {
  if (!node || node.type !== 'CallExpression') return null;
  const callee = node.callee;
  if (callee.type !== 'Identifier' || callee.name !== 'require') return null;
  if (!node.arguments || node.arguments.length === 0) return null;
  return extractStringValue(node.arguments[0]);
}

// ---------------------------------------------------------------------------
// Directory walker
// ---------------------------------------------------------------------------

function collectFiles(rootDir, files = []) {
  if (!fs.existsSync(rootDir)) return files;
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, files);
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  SKIP_DIRS,
  fileKey,
  symbolKey,
  walkFile,
  collectFiles,
};
