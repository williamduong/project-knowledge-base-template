const test = require('node:test');
const assert = require('node:assert');

const { runHelp } = require('../../src/commands/help');

test('help --advanced includes ontology command surface', () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  runHelp({ packageJson: { name: '@williamduong/kbx', version: '2.6.0' }, args: ['--advanced'] });

  console.log = originalLog;

  assert.ok(output.includes('kbx ontology <show|validate|audit|build>'), 'Advanced help should list ontology command');
  assert.ok(output.includes('ontology   Validate and inspect ontology lifecycle contracts.'), 'Advanced help should describe ontology command');
});

test('help (basic) includes ontology command hint', () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  runHelp({ packageJson: { name: '@williamduong/kbx', version: '2.6.0' }, args: [] });

  console.log = originalLog;

  assert.ok(output.includes('kbx ontology <show|validate|audit|build>'), 'Basic help should mention ontology command');
});
