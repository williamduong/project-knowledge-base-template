export function createRuntimeServicesCron(options) {
  const intervalMs = options.intervalMs ?? 60_000;
  let timer = null;
  let lastSnapshot = {
    refreshedAt: null,
    nextRunAt: null,
    intervalMs,
    summary: {
      registeredCount: 0,
      runningCount: 0,
      healthyCount: 0,
      summaryLabel: '0/0 services',
      services: [],
    },
    lastError: null,
  };

  async function refresh(reason = 'interval') {
    try {
      const services = await options.collectStatuses();
      let autoStartError = null;

      if (typeof options.ensureService === 'function') {
        for (const service of services) {
          if (service.autoStart === true && service.running === false && !service.pid) {
            // eslint-disable-next-line no-await-in-loop
            const result = await options.ensureService(service.id);
            if (!result?.ok && !autoStartError) {
              autoStartError = result?.error ?? `Auto-start failed for ${service.id}`;
            }
          }
        }
      }

      const nextServices = await options.collectStatuses();
      lastSnapshot = {
        refreshedAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + intervalMs).toISOString(),
        intervalMs,
        summary: options.summarizeStatuses(nextServices),
        lastError: autoStartError,
        reason,
      };
      return lastSnapshot;
    } catch (error) {
      lastSnapshot = {
        ...lastSnapshot,
        refreshedAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + intervalMs).toISOString(),
        intervalMs,
        lastError: error instanceof Error ? error.message : String(error),
        reason,
      };
      return lastSnapshot;
    }
  }

  return {
    start() {
      if (timer) {
        return;
      }

      refresh('startup');
      timer = setInterval(() => {
        refresh('interval');
      }, intervalMs);
    },
    stop() {
      if (!timer) {
        return;
      }

      clearInterval(timer);
      timer = null;
    },
    getSnapshot() {
      return lastSnapshot;
    },
    refresh,
  };
}
