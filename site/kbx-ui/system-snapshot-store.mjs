export function createSystemSnapshotStore(options = {}) {
  const {
    ttlMs = 15000,
    collectSnapshot,
    buildPendingSnapshot = () => ({
      ok: false,
      metadata: {
        snapshotVersion: 1,
        generatedAt: null,
        staleAt: null,
        ttlMs,
        reloadRecommended: true,
        reloadReasons: ['snapshot-pending'],
        fingerprint: 'pending',
        branchName: null,
        focusIntentId: null,
        activeIntentId: null,
        workingTreeDirty: null,
      },
    }),
  } = options;

  if (typeof collectSnapshot !== 'function') {
    throw new Error('collectSnapshot is required');
  }

  let cache = null;
  let inFlight = null;
  let refreshTimer = null;

  async function refresh(refreshOptions = {}) {
    if (inFlight) {
      return inFlight;
    }

    inFlight = (async () => {
      const snapshot = await collectSnapshot({
        previousSnapshot: cache,
        ttlMs,
        ...refreshOptions,
      });
      cache = snapshot;
      return cache;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  function read() {
    return cache ?? buildPendingSnapshot({ previousSnapshot: null, ttlMs });
  }

  function getCache() {
    return cache;
  }

  function scheduleRefresh(reason) {
    refresh({ reason }).catch(() => {});
  }

  function start(startOptions = {}) {
    const {
      warm = true,
      intervalMs = ttlMs,
    } = startOptions;

    if (warm) {
      queueMicrotask(() => {
        scheduleRefresh('startup');
      });
    }

    if (intervalMs > 0 && !refreshTimer) {
      refreshTimer = setInterval(() => {
        scheduleRefresh('interval');
      }, intervalMs);
      if (typeof refreshTimer.unref === 'function') {
        refreshTimer.unref();
      }
    }
  }

  function stop() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  return {
    read,
    getCache,
    refresh,
    start,
    stop,
  };
}
