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
  ok: boolean;
  error?: string;
  summary?: {
    activeIntentCount: number | null;
    activeIntentId: string | null;
    releaseCurrent: string | null;
    releaseLatest: string | null;
    hasWorkingTreeChanges: boolean;
  };
};

type SystemSnapshotResponse = {
  ok: boolean;
  error?: string;
  summary?: {
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
  ok: boolean;
  error?: string;
  summary?: {
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

  // Phase 4 mutation state
  const [createFormData, setCreateFormData] = useState({
    title: '',
    focus: '',
    next_action: '',
    decision_summary: '',
  });
  const [createResult, setCreateResult] = useState<{ok: boolean; result?: any; error?: string} | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

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

  async function onCreateIntent() {
    if (!createFormData.title.trim()) {
      setCreateResult({ ok: false, error: 'Title required' });
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch('/api/intents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createFormData.title.trim(),
          focus: createFormData.focus.trim() || undefined,
          next_action: createFormData.next_action.trim() || undefined,
          decision_summary: createFormData.decision_summary.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as {ok: boolean; error?: string};
        setCreateResult({
          ok: false,
          error: data.error || `HTTP ${response.status}`,
        });
        return;
      }

      const data = await response.json() as {ok: boolean; result?: any};
      setCreateResult({
        ok: true,
        result: data.result,
      });

      // Clear form on success
      setCreateFormData({
        title: '',
        focus: '',
        next_action: '',
        decision_summary: '',
      });

      // Reload intents list
      await loadAll();
    } catch (err) {
      setCreateResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreateLoading(false);
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
              <p className={workspaceSnapshot.ok ? 'status ok' : 'status error'}>
                {workspaceSnapshot.ok ? 'Workspace summary loaded' : `Failed: ${workspaceSnapshot.error}`}
              </p>
              <pre>{workspaceSnapshot.summary ? JSON.stringify(workspaceSnapshot.summary, null, 2) : 'No data'}</pre>
            </>
          )}
        </article>

        <article className="panel">
          <p className="panel-label">Phase 3 read-only</p>
          <h2>System snapshot</h2>
          {loading && <p className="muted">Loading system checks...</p>}
          {!loading && systemSnapshot && (
            <>
              <p className={systemSnapshot.ok ? 'status ok' : 'status error'}>
                {systemSnapshot.ok ? 'System summary loaded' : `Failed: ${systemSnapshot.error}`}
              </p>
              <pre>{systemSnapshot.summary ? JSON.stringify(systemSnapshot.summary, null, 2) : 'No data'}</pre>
            </>
          )}
        </article>

        <article className="panel panel-wide">
          <p className="panel-label">Phase 3 read-only</p>
          <h2>Documents graph snapshot</h2>
          {loading && <p className="muted">Loading documents graph checks...</p>}
          {!loading && documentsSnapshot && (
            <>
              <p className={documentsSnapshot.ok ? 'status ok' : 'status error'}>
                {documentsSnapshot.ok ? 'Documents summary loaded' : `Failed: ${documentsSnapshot.error}`}
              </p>
              <pre>{documentsSnapshot.summary ? JSON.stringify(documentsSnapshot.summary, null, 2) : 'No data'}</pre>
            </>
          )}
        </article>

        <article className="panel panel-wide">
          <p className="panel-label">Phase 4 mutations</p>
          <h2>Create intent (CLI-backed mutation)</h2>
          <div className="mutation-form">
            <div className="form-field">
              <label htmlFor="create-title">Title *</label>
              <input
                id="create-title"
                type="text"
                placeholder="Intent title (min 3 chars)"
                value={createFormData.title}
                onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                disabled={createLoading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="create-focus">Focus</label>
              <input
                id="create-focus"
                type="text"
                placeholder="Focus domain (optional)"
                value={createFormData.focus}
                onChange={(e) => setCreateFormData({ ...createFormData, focus: e.target.value })}
                disabled={createLoading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="create-action">Next action</label>
              <input
                id="create-action"
                type="text"
                placeholder="Next action (optional)"
                value={createFormData.next_action}
                onChange={(e) => setCreateFormData({ ...createFormData, next_action: e.target.value })}
                disabled={createLoading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="create-summary">Decision summary</label>
              <textarea
                id="create-summary"
                placeholder="Why this intent exists (optional)"
                rows={3}
                value={createFormData.decision_summary}
                onChange={(e) => setCreateFormData({ ...createFormData, decision_summary: e.target.value })}
                disabled={createLoading}
              />
            </div>

            <button
              type="button"
              onClick={onCreateIntent}
              disabled={createLoading || !createFormData.title.trim()}
              className="submit-btn"
            >
              {createLoading ? 'Creating...' : 'Create Intent'}
            </button>

            {createResult && (
              <div className={`form-result ${createResult.ok ? 'ok' : 'error'}`}>
                <p>
                  {createResult.ok
                    ? `✓ Intent created: ${createResult.result?.id || 'unknown'}`
                    : `✗ Error: ${createResult.error}`}
                </p>
              </div>
            )}
          </div>
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