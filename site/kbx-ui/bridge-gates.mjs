export const phase2GatePolicy = [
  {
    gate: 'G-DETERMINISTIC-PLACEMENT',
    severity: 'hard-fail',
    command: 'kbx status --json',
    evaluate: ({ statusResult }) => {
      if (!statusResult.ok) {
        return {
          ok: false,
          detail: 'status command failed, deterministic runtime cannot be trusted',
        };
      }

      return {
        ok: true,
        detail: 'status command completed with deterministic exit code',
      };
    },
  },
  {
    gate: 'G-EVIDENCE-SUFFICIENCY',
    severity: 'hard-fail',
    command: 'kbx doctor --json',
    evaluate: ({ doctorResult }) => {
      if (!doctorResult.ok) {
        return {
          ok: false,
          detail: 'doctor command failed, cannot verify workspace evidence',
        };
      }

      if (!doctorResult.parsed || !Array.isArray(doctorResult.parsed.checks)) {
        return {
          ok: false,
          detail: 'doctor output is not parseable JSON with checks[] evidence',
        };
      }

      return {
        ok: true,
        detail: `doctor returned ${doctorResult.parsed.checks.length} checks`,
      };
    },
  },
  {
    gate: 'G-INTENT-UNIQUENESS',
    severity: 'hard-fail',
    command: 'kbx status --json',
    evaluate: ({ statusResult }) => {
      const activeCount = statusResult.parsed?.activeIntents?.count;
      if (typeof activeCount !== 'number') {
        return {
          ok: false,
          detail: 'active intent count missing from status payload',
        };
      }

      if (activeCount > 1) {
        return {
          ok: false,
          detail: `expected <= 1 active intent, observed ${activeCount}`,
        };
      }

      return {
        ok: true,
        detail: `active intent policy satisfied (${activeCount})`,
      };
    },
  },
  {
    gate: 'G-CHAOS-ESTIMATE',
    severity: 'warn',
    command: 'kbx chaos --estimate',
    evaluate: ({ chaosResult }) => {
      if (!chaosResult.ok) {
        return {
          ok: false,
          detail: 'chaos estimate command failed',
        };
      }

      const summary = chaosResult.stdout || chaosResult.stderr;
      if (/UNSTABLE|RISK|WARNING/i.test(summary)) {
        return {
          ok: false,
          detail: 'chaos estimate reports elevated risk signals',
        };
      }

      return {
        ok: true,
        detail: 'chaos estimate does not show unstable markers',
      };
    },
  },
  {
    gate: 'G-THREE-LAYER-TRACE',
    severity: 'info',
    command: 'kbx status --json + kbx doctor --json + kbx chaos --estimate',
    evaluate: ({ statusResult, doctorResult, chaosResult }) => {
      const ok = statusResult.ok && doctorResult.ok && chaosResult.ok;
      return {
        ok,
        detail: ok
          ? 'intake/runtime/completion evidence captured in one bridge response'
          : 'one or more trace commands failed',
      };
    },
  },
];

export function summarizeGateResults(items) {
  const summary = {
    pass: 0,
    warn: 0,
    fail: 0,
    blocked: false,
  };

  for (const item of items) {
    if (item.ok) {
      summary.pass += 1;
      continue;
    }

    if (item.severity === 'hard-fail') {
      summary.fail += 1;
      summary.blocked = true;
      continue;
    }

    summary.warn += 1;
  }

  return summary;
}

export function evaluatePhase2Gates(commandResults) {
  const gateItems = phase2GatePolicy.map((policy) => {
    const evaluation = policy.evaluate(commandResults);
    return {
      gate: policy.gate,
      severity: policy.severity,
      command: policy.command,
      ok: evaluation.ok,
      detail: evaluation.detail,
    };
  });

  return {
    gateItems,
    summary: summarizeGateResults(gateItems),
  };
}
