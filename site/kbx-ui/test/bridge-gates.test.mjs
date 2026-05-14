import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePhase2Gates, summarizeGateResults } from '../bridge-gates.mjs';

test('summarizeGateResults counts hard-fail as blocked', () => {
  const summary = summarizeGateResults([
    { severity: 'hard-fail', ok: false },
    { severity: 'warn', ok: false },
    { severity: 'info', ok: true },
  ]);

  assert.deepEqual(summary, {
    pass: 1,
    warn: 1,
    fail: 1,
    blocked: true,
  });
});

test('evaluatePhase2Gates passes when status+doctor are valid and active intent is unique', () => {
  const { summary, gateItems } = evaluatePhase2Gates({
    statusResult: {
      ok: true,
      parsed: {
        activeIntents: {
          count: 1,
        },
        observation: {
          chaosResult: {
            score: 50,
            level: 'manageable',
          },
        },
      },
      stdout: 'stable',
      stderr: '',
    },
    doctorResult: {
      ok: true,
      parsed: {
        checks: [{ name: 'Node version', status: 'PASS' }],
      },
      stdout: 'ok',
      stderr: '',
    },
    chaosResult: {
      ok: true,
      stdout: 'Forward estimates: UNSTABLE',
      stderr: '',
    },
  });

  assert.equal(summary.blocked, false);
  assert.equal(summary.fail, 0);
  assert.equal(gateItems.length, 5);
  assert.equal(gateItems.some((item) => item.gate === 'G-INTENT-UNIQUENESS' && item.ok), true);
});

test('evaluatePhase2Gates blocks when multiple active intents are detected', () => {
  const { summary, gateItems } = evaluatePhase2Gates({
    statusResult: {
      ok: true,
      parsed: {
        activeIntents: {
          count: 3,
        },
        observation: {
          chaosResult: {
            score: 50,
            level: 'manageable',
          },
        },
      },
      stdout: 'ok',
      stderr: '',
    },
    doctorResult: {
      ok: true,
      parsed: {
        checks: [{ name: 'rules-lint', status: 'PASS' }],
      },
      stdout: 'ok',
      stderr: '',
    },
    chaosResult: {
      ok: true,
      stdout: 'Forward estimates: UNSTABLE',
      stderr: '',
    },
  });

  assert.equal(summary.blocked, true);
  assert.equal(summary.fail >= 1, true);

  const uniquenessGate = gateItems.find((item) => item.gate === 'G-INTENT-UNIQUENESS');
  assert.ok(uniquenessGate);
  assert.equal(uniquenessGate.ok, false);
  assert.match(uniquenessGate.detail, /expected <= 1 active intent/i);
});
