import test from 'node:test';
import assert from 'node:assert/strict';
import { createSystemSnapshotStore } from '../system-snapshot-store.mjs';

test('read returns pending snapshot without invoking collector', () => {
  let calls = 0;
  const store = createSystemSnapshotStore({
    ttlMs: 50,
    collectSnapshot: async () => {
      calls += 1;
      return { ok: true, metadata: { generatedAt: 'now' } };
    },
    buildPendingSnapshot: () => ({
      ok: false,
      metadata: {
        generatedAt: null,
        reloadReasons: ['snapshot-pending'],
      },
    }),
  });

  assert.deepEqual(store.read(), {
    ok: false,
    metadata: {
      generatedAt: null,
      reloadReasons: ['snapshot-pending'],
    },
  });
  assert.equal(calls, 0);
});

test('refresh collects once and updates cache', async () => {
  let calls = 0;
  const store = createSystemSnapshotStore({
    collectSnapshot: async () => {
      calls += 1;
      return {
        ok: true,
        metadata: {
          generatedAt: `run-${calls}`,
        },
      };
    },
  });

  const snapshot = await store.refresh({ reason: 'manual-refresh' });
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.metadata.generatedAt, 'run-1');
  assert.equal(store.read().metadata.generatedAt, 'run-1');
  assert.equal(calls, 1);
});

test('concurrent refresh calls share one in-flight collector run', async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  const store = createSystemSnapshotStore({
    collectSnapshot: async () => {
      calls += 1;
      await gate;
      return {
        ok: true,
        metadata: {
          generatedAt: 'shared-run',
        },
      };
    },
  });

  const first = store.refresh({ reason: 'a' });
  const second = store.refresh({ reason: 'b' });
  release();

  const [left, right] = await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(left.metadata.generatedAt, 'shared-run');
  assert.equal(right.metadata.generatedAt, 'shared-run');
});
