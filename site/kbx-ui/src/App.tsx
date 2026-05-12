import { useEffect, useState } from 'react';

type VersionResponse = {
  command: string;
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
};

type StatusResponse = {
  command: string;
  ok: boolean;
  exitCode: number;
  parsed: {
    command?: string;
    status?: string;
    release?: {
      current?: string;
      latest?: string;
      hasTaggedRelease?: boolean;
    };
  } | null;
  stdout: string;
  stderr: string;
};

type InteractionModel = {
  chat: string;
  web: string;
  writePath: string;
};

type RulesResponse = {
  command: string;
  ok: boolean;
  exitCode: number;
  parsed: {
    count?: number;
    rules?: Array<{
      id?: string;
      severity?: string;
      title?: string;
    }>;
  } | null;
  stdout: string;
  stderr: string;
};

type IntentsResponse = {
  command: string;
  ok: boolean;
  exitCode: number;
  parsed: {
    count?: number;
    intents?: Array<{
      id?: string;
      lifecycle?: string;
      mode?: string;
    }>;
  } | null;
  stdout: string;
  stderr: string;
};

type WorkspaceSnapshotResponse = {
  source: {
    command: string;
    ok: boolean;
    exitCode: number;
  };
  summary: {
    activeIntentCount: number | null;
    activeIntentId: string | null;
    releaseCurrent: string | null;
    releaseLatest: string | null;
    hasWorkingTreeChanges: boolean;
  };
};

type SystemSnapshotResponse = {
  source: {
    command: string;
    ok: boolean;
    exitCode: number;
  };
  summary: {
    result: string | null;
    nodeVersion: string | null;
    workspaceRoot: string | null;
    checkSummary: {
      pass: number;
      warn: number;
      error: number;
      info: number;
    };
  };
};

type DocumentsSnapshotResponse = {
  source: {
    command: string;
    ok: boolean;
    exitCode: number;
  };
  summary: {
    entityCount: number | null;
    relationCount: number | null;
    issueCount: number;
    topIssues: Array<{
      checkId: string | null;
      severity: string | null;
      message: string | null;
      evidencePath: string | null;
    }>;
  };
};

type GateSeverity = 'hard-fail' | 'warn' | 'info';

type Phase2Gate = {
  gate: string;
  severity: GateSeverity;
  command: string;
  ok: boolean;
  detail: string;
};

type Phase2BridgeResponse = {
  phase: string;
  checkedAt: string;
  summary: {
    pass: number;
    warn: number;
    fail: number;
    blocked: boolean;
  };
  gates: Phase2Gate[];
};

export default function App() {
  const [version, setVersion] = useState<VersionResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [interaction, setInteraction] = useState<InteractionModel | null>(null);
  const [phase2, setPhase2] = useState<Phase2BridgeResponse | null>(null);
  const [rules, setRules] = useState<RulesResponse | null>(null);
  const [intents, setIntents] = useState<IntentsResponse | null>(null);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceSnapshotResponse | null>(null);
  const [systemSnapshot, setSystemSnapshot] = useState<SystemSnapshotResponse | null>(null);
  const [documentsSnapshot, setDocumentsSnapshot] = useState<DocumentsSnapshotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setError(null);

    const [versionResponse, statusResponse, interactionResponse, phase2Response, rulesResponse, intentsResponse, workspaceResponse, systemResponse, documentsResponse] = await Promise.all([
      fetch('/api/version').then((response) => response.json() as Promise<VersionResponse>),
      fetch('/api/status').then((response) => response.json() as Promise<StatusResponse>),
      fetch('/api/interaction-model').then((response) => response.json() as Promise<InteractionModel>),
      fetch('/api/phase2-bridge').then((response) => response.json() as Promise<Phase2BridgeResponse>),
      fetch('/api/rules').then((response) => response.json() as Promise<RulesResponse>),
      fetch('/api/intents').then((response) => response.json() as Promise<IntentsResponse>),
      fetch('/api/workspace').then((response) => response.json() as Promise<WorkspaceSnapshotResponse>),
      fetch('/api/system').then((response) => response.json() as Promise<SystemSnapshotResponse>),
      fetch('/api/documents').then((response) => response.json() as Promise<DocumentsSnapshotResponse>),
    ]);

    setVersion(versionResponse);
    setStatus(statusResponse);
    setInteraction(interactionResponse);
    setPhase2(phase2Response);
    setRules(rulesResponse);
    setIntents(intentsResponse);
    setWorkspaceSnapshot(workspaceResponse);
    setSystemSnapshot(systemResponse);
    setDocumentsSnapshot(documentsResponse);
  }

  async function initialLoad() {
    try {
      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void initialLoad();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadAll();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">KBAgent Localhost UI</p>
        <h1>Phase 1 shell proof for Option B</h1>
        <p className="lede">
          This localhost webapp runs beside VS Code. Copilot Chat with KBAgent remains in the editor,
          while the webapp reads state and triggers CLI-backed actions.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <p className="panel-label">Bridge proof</p>
          <h2>kbx version</h2>
          {loading && <p className="muted">Loading version from CLI bridge...</p>}
          {!loading && version && (
            <>
              <p className={version.ok ? 'status ok' : 'status error'}>
                {version.ok ? 'CLI bridge reachable' : 'CLI bridge failed'}
              </p>
              <pre>{version.stdout || version.stderr}</pre>
              <p className="meta">{version.command} · exit {version.exitCode}</p>
            </>
          )}
        </article>

        <article className="panel">
          <p className="panel-label">Next bridge step</p>
          <h2>kbx status --json</h2>
          {loading && <p className="muted">Loading runtime status...</p>}
          {!loading && status && (
            <>
              <p className={status.ok ? 'status ok' : 'status error'}>
                {status.ok ? 'Runtime status readable' : 'Runtime status failed'}
              </p>
              <pre>{status.parsed ? JSON.stringify(status.parsed, null, 2) : status.stdout || status.stderr}</pre>
              <p className="meta">{status.command} · exit {status.exitCode}</p>
            </>
          )}
        </article>

        <article className="panel">
          <p className="panel-label">Interaction boundary</p>
          <h2>Chat, web, CLI</h2>
          {interaction && (
            <ul className="boundary-list">
              <li><strong>Chat:</strong> {interaction.chat}</li>
              <li><strong>Web:</strong> {interaction.web}</li>
              <li><strong>Write path:</strong> {interaction.writePath}</li>
            </ul>
          )}
        </article>

        <article className="panel panel-wide">
          <div className="panel-header-row">
            <div>
              <p className="panel-label">Phase 2 gate evaluation</p>
              <h2>Deterministic bridge gates</h2>
            </div>
            <button className="refresh-btn" type="button" onClick={onRefresh} disabled={refreshing || loading}>
              {refreshing ? 'Refreshing...' : 'Refresh gates'}
            </button>
          </div>

          {loading && <p className="muted">Evaluating gate policy...</p>}

          {!loading && phase2 && (
            <>
              <p className={phase2.summary.blocked ? 'status error' : 'status ok'}>
                {phase2.summary.blocked ? 'Blocked by hard-fail gate' : 'Phase 2 gates pass'}
              </p>

              <p className="meta gate-summary">
                pass {phase2.summary.pass} · warn {phase2.summary.warn} · fail {phase2.summary.fail}
                {' '}· checked {new Date(phase2.checkedAt).toLocaleString()}
              </p>

              <div className="gate-list">
                {phase2.gates.map((gate) => (
                  <div className="gate-row" key={gate.gate}>
                    <div className="gate-head">
                      <strong>{gate.gate}</strong>
                      <span className={`gate-severity ${gate.severity}`}>{gate.severity}</span>
                      <span className={`gate-result ${gate.ok ? 'ok' : 'fail'}`}>{gate.ok ? 'PASS' : 'FAIL'}</span>
                    </div>
                    <p>{gate.detail}</p>
                    <p className="meta">{gate.command}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>

        <article className="panel">
          <p className="panel-label">Phase 3 read-only</p>
          <h2>Rules catalog snapshot</h2>
          {loading && <p className="muted">Loading rules...</p>}
          {!loading && rules && (
            <>
              <p className={rules.ok ? 'status ok' : 'status error'}>
                {rules.ok ? 'Rules payload loaded' : 'Rules payload failed'}
              </p>
              <p className="meta">{rules.command} · exit {rules.exitCode}</p>
              <p className="muted">count: {rules.parsed?.count ?? 0}</p>
              <pre>
                {rules.parsed?.rules?.slice(0, 5).map((rule) => `${rule.id} · ${rule.severity} · ${rule.title}`).join('\n')
                  || rules.stdout
                  || rules.stderr}
              </pre>
            </>
          )}
        </article>

        <article className="panel">
          <p className="panel-label">Phase 3 read-only</p>
          <h2>Intent registry snapshot</h2>
          {loading && <p className="muted">Loading intents...</p>}
          {!loading && intents && (
            <>
              <p className={intents.ok ? 'status ok' : 'status error'}>
                {intents.ok ? 'Intent payload loaded' : 'Intent payload failed'}
              </p>
              <p className="meta">{intents.command} · exit {intents.exitCode}</p>
              <p className="muted">count: {intents.parsed?.count ?? 0}</p>
              <pre>
                {intents.parsed?.intents?.slice(0, 8).map((intent) => `${intent.id} · ${intent.lifecycle} · ${intent.mode}`).join('\n')
                  || intents.stdout
                  || intents.stderr}
              </pre>
            </>
          )}
        </article>

        <article className="panel">
          <p className="panel-label">Phase 3 read-only</p>
          <h2>Workspace snapshot</h2>
          {loading && <p className="muted">Loading workspace summary...</p>}
          {!loading && workspaceSnapshot && (
            <>
              <p className={workspaceSnapshot.source.ok ? 'status ok' : 'status error'}>
                {workspaceSnapshot.source.ok ? 'Workspace payload loaded' : 'Workspace payload failed'}
              </p>
              <p className="meta">{workspaceSnapshot.source.command} · exit {workspaceSnapshot.source.exitCode}</p>
              <pre>{JSON.stringify(workspaceSnapshot.summary, null, 2)}</pre>
            </>
          )}
        </article>

        <article className="panel">
          <p className="panel-label">Phase 3 read-only</p>
          <h2>System snapshot</h2>
          {loading && <p className="muted">Loading system checks...</p>}
          {!loading && systemSnapshot && (
            <>
              <p className={systemSnapshot.source.ok ? 'status ok' : 'status error'}>
                {systemSnapshot.source.ok ? 'System payload loaded' : 'System payload failed'}
              </p>
              <p className="meta">{systemSnapshot.source.command} · exit {systemSnapshot.source.exitCode}</p>
              <pre>{JSON.stringify(systemSnapshot.summary, null, 2)}</pre>
            </>
          )}
        </article>

        <article className="panel panel-wide">
          <p className="panel-label">Phase 3 read-only</p>
          <h2>Documents graph snapshot</h2>
          {loading && <p className="muted">Loading documents graph checks...</p>}
          {!loading && documentsSnapshot && (
            <>
              <p className={documentsSnapshot.source.ok ? 'status ok' : 'status error'}>
                {documentsSnapshot.source.ok ? 'Documents payload loaded' : 'Documents payload failed'}
              </p>
              <p className="meta">{documentsSnapshot.source.command} · exit {documentsSnapshot.source.exitCode}</p>
              <pre>{JSON.stringify(documentsSnapshot.summary, null, 2)}</pre>
            </>
          )}
        </article>
      </section>

      {error && (
        <section className="error-banner">
          <p><strong>Load error:</strong> {error}</p>
        </section>
      )}
    </main>
  );
}