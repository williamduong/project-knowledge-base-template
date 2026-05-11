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

export default function App() {
  const [version, setVersion] = useState<VersionResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [interaction, setInteraction] = useState<InteractionModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [versionResponse, statusResponse, interactionResponse] = await Promise.all([
          fetch('/api/version').then((response) => response.json() as Promise<VersionResponse>),
          fetch('/api/status').then((response) => response.json() as Promise<StatusResponse>),
          fetch('/api/interaction-model').then((response) => response.json() as Promise<InteractionModel>),
        ]);

        setVersion(versionResponse);
        setStatus(statusResponse);
        setInteraction(interactionResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

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
      </section>

      {error && (
        <section className="error-banner">
          <p><strong>Load error:</strong> {error}</p>
        </section>
      )}
    </main>
  );
}