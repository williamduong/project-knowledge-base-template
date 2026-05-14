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

type SessionContextResponse = {
  ok: boolean;
  error?: string;
  summary?: {
    sessionIntentId: string | null;
    sessionIntentSource: string | null;
    sessionLabel: string | null;
    checkpointEvent: string | null;
    checkpointIntentId: string | null;
    checkpointTimestamp: string | null;
    focusFile: string | null;
    activeIntentIds: string[];
  };
};

type IntentDetailResponse = {
  ok: boolean;
  error?: string;
  detail?: {
    id: string;
    title: string | null;
    slug: string | null;
    scope: string | null;
    lifecycle: string | null;
    status: string | null;
    mode: string | null;
    changeType: string | null;
    decisionSummary: string | null;
    goal: string | null;
    summary: string | null;
    focusCurrent: string | null;
    focusNextAction: string | null;
    focusUpdatedAt: string | null;
    tasks: Array<{
      title: string;
      description: string | null;
      text: string;
      done: boolean;
      status: string;
      tags: string[];
      section: string | null;
      source: string;
      relatedCommits: Array<{
        sha: string;
        subject: string;
        path: string | null;
      }>;
    }>;
    stagedFiles: string[];
    workspacePath: string | null;
    sourceFile: string | null;
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

type MutationResult = {
  ok: boolean;
  result?: unknown;
  error?: string;
};

type ApplyPreviewResult = {
  ok: boolean;
  diff?: {
    files_changed?: number;
    insertions?: number;
    deletions?: number;
    files?: string[];
  };
  warnings?: Array<{ level?: string; message?: string }>;
  error?: string;
};

type TabId = 'workspace' | 'system' | 'documents' | 'search';
type IntentDetailTabId = 'overview' | 'tasks' | 'actions' | 'raw';
type TaskFilterId = 'all' | 'running' | 'blocked' | 'done';
type TaskSortId = 'runtime' | 'title';

type IntentTask = NonNullable<NonNullable<IntentDetailResponse['detail']>['tasks'][number]>;
type TaskViewModel = IntentTask & {
  runtimeState: 'running' | 'blocked' | 'done' | 'review' | 'open';
  sectionLabel: string;
  sourceLabel: string;
  summaryTags: string[];
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
  const [sessionContext, setSessionContext] = useState<SessionContextResponse | null>(null);
  const [intentDetail, setIntentDetail] = useState<IntentDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('workspace');
  const [intentDetailTab, setIntentDetailTab] = useState<IntentDetailTabId>('overview');
  const [showCreateIntent, setShowCreateIntent] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilterId>('all');
  const [taskSort, setTaskSort] = useState<TaskSortId>('runtime');
  const [searchQuery, setSearchQuery] = useState('');

  // Phase 4 mutation state
  const [selectedIntentId, setSelectedIntentId] = useState('');
  const [createFormData, setCreateFormData] = useState({
    title: '',
    focus: '',
    next_action: '',
    decision_summary: '',
  });
  const [updateFormData, setUpdateFormData] = useState({
    title: '',
    focus: '',
    next_action: '',
    decision_summary: '',
    state: 'draft',
  });
  const [approveNote, setApproveNote] = useState('');
  const [applyConfirmed, setApplyConfirmed] = useState(false);
  const [createResult, setCreateResult] = useState<MutationResult | null>(null);
  const [updateResult, setUpdateResult] = useState<MutationResult | null>(null);
  const [approveResult, setApproveResult] = useState<MutationResult | null>(null);
  const [previewResult, setPreviewResult] = useState<ApplyPreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<MutationResult | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  async function loadAll() {
    setError(null);

    const [versionResponse, statusResponse, interactionResponse, phase2Response, rulesResponse, intentsResponse, workspaceResponse, systemResponse, documentsResponse, sessionContextResponse] = await Promise.all([
      fetch('/api/version').then((response) => response.json() as Promise<VersionResponse>),
      fetch('/api/status').then((response) => response.json() as Promise<StatusResponse>),
      fetch('/api/interaction-model').then((response) => response.json() as Promise<InteractionModel>),
      fetch('/api/phase2-bridge').then((response) => response.json() as Promise<Phase2BridgeResponse>),
      fetch('/api/rules').then((response) => response.json() as Promise<RulesResponse>),
      fetch('/api/intents').then((response) => response.json() as Promise<IntentsResponse>),
      fetch('/api/workspace').then((response) => response.json() as Promise<WorkspaceSnapshotResponse>),
      fetch('/api/system').then((response) => response.json() as Promise<SystemSnapshotResponse>),
      fetch('/api/documents').then((response) => response.json() as Promise<DocumentsSnapshotResponse>),
      fetch('/api/session-context').then((response) => response.json() as Promise<SessionContextResponse>),
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
    setSessionContext(sessionContextResponse);
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

  useEffect(() => {
    const intentIds = (intents?.parsed?.intents ?? []).map((intent) => intent.id).filter(Boolean) as string[];
    const sessionIntentId = sessionContext?.summary?.sessionIntentId ?? '';
    if (intentIds.length === 0) {
      if (selectedIntentId) {
        setSelectedIntentId('');
      }
      return;
    }

    if (selectedIntentId && intentIds.includes(selectedIntentId)) {
      return;
    }

    const fallbackIntentId = sessionIntentId && intentIds.includes(sessionIntentId)
      ? sessionIntentId
      : intentIds[0];
    setSelectedIntentId(fallbackIntentId ?? '');
  }, [intents, selectedIntentId, sessionContext]);

  useEffect(() => {
    async function loadIntentDetail() {
      if (!selectedIntentId) {
        setIntentDetail(null);
        return;
      }

      try {
        const response = await fetch(`/api/intents/${encodeURIComponent(selectedIntentId)}/detail`);
        const data = (await response.json()) as IntentDetailResponse;
        setIntentDetail(data);
      } catch (detailError) {
        setIntentDetail({ ok: false, error: detailError instanceof Error ? detailError.message : String(detailError) });
      }
    }

    void loadIntentDetail();
  }, [selectedIntentId]);

  useEffect(() => {
    const detail = intentDetail?.ok ? intentDetail.detail ?? null : null;
    if (!detail) {
      return;
    }

    setUpdateFormData((current) => ({
      ...current,
      title: detail.title || '',
      focus: detail.focusCurrent || '',
      next_action: detail.focusNextAction || '',
      decision_summary: detail.decisionSummary || detail.summary || '',
      state: detail.lifecycle || current.state,
    }));
  }, [intentDetail]);

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

      const data = (await response.json()) as MutationResult;
      if (!response.ok || !data.ok) {
        setCreateResult({
          ok: false,
          error: data.error || `HTTP ${response.status}`,
        });
        return;
      }

      setCreateResult({
        ok: true,
        result: data.result,
      });

      setCreateFormData({
        title: '',
        focus: '',
        next_action: '',
        decision_summary: '',
      });

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

  async function onUpdateIntent() {
    if (!selectedIntentId.trim()) {
      setUpdateResult({ ok: false, error: 'Select an intent first' });
      return;
    }

    const payload: Record<string, string | undefined> = {};
    const title = updateFormData.title.trim();
    const focus = updateFormData.focus.trim();
    const nextAction = updateFormData.next_action.trim();
    const decisionSummary = updateFormData.decision_summary.trim();
    const state = updateFormData.state.trim();

    if (title) payload.title = title;
    if (focus) payload.focus = focus;
    if (nextAction) payload.next_action = nextAction;
    if (decisionSummary) payload.decision_summary = decisionSummary;
    if (state) payload.state = state;

    if (Object.keys(payload).length === 0) {
      setUpdateResult({ ok: false, error: 'Provide at least one field to update' });
      return;
    }

    setUpdateLoading(true);
    try {
      const response = await fetch(`/api/intents/${encodeURIComponent(selectedIntentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as MutationResult;
      if (!response.ok || !data.ok) {
        setUpdateResult({ ok: false, error: data.error || `HTTP ${response.status}` });
        return;
      }

      setUpdateResult({ ok: true, result: data.result });
      await loadAll();
    } catch (err) {
      setUpdateResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setUpdateLoading(false);
    }
  }

  async function onApproveIntent() {
    if (!selectedIntentId.trim()) {
      setApproveResult({ ok: false, error: 'Select an intent first' });
      return;
    }

    setApproveLoading(true);
    try {
      const response = await fetch(`/api/intents/${encodeURIComponent(selectedIntentId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_note: approveNote.trim() || undefined }),
      });

      const data = (await response.json()) as MutationResult;
      if (!response.ok || !data.ok) {
        setApproveResult({ ok: false, error: data.error || `HTTP ${response.status}` });
        return;
      }

      setApproveResult({ ok: true, result: data.result });
      await loadAll();
    } catch (err) {
      setApproveResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setApproveLoading(false);
    }
  }

  async function onPreviewApply() {
    if (!selectedIntentId.trim()) {
      setPreviewResult({ ok: false, error: 'Select an intent first' });
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/intents/${encodeURIComponent(selectedIntentId)}/apply-preview`);
      const data = (await response.json()) as ApplyPreviewResult;
      if (!response.ok || !data.ok) {
        setPreviewResult({ ok: false, error: data.error || `HTTP ${response.status}` });
        return;
      }

      setPreviewResult({ ok: true, diff: data.diff, warnings: data.warnings ?? [] });
    } catch (err) {
      setPreviewResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onApplyIntent() {
    if (!selectedIntentId.trim()) {
      setApplyResult({ ok: false, error: 'Select an intent first' });
      return;
    }

    if (!applyConfirmed) {
      setApplyResult({ ok: false, error: 'Confirm apply before running the mutation' });
      return;
    }

    setApplyLoading(true);
    try {
      const response = await fetch(`/api/intents/${encodeURIComponent(selectedIntentId)}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });

      const data = (await response.json()) as MutationResult;
      if (!response.ok || !data.ok) {
        setApplyResult({ ok: false, error: data.error || `HTTP ${response.status}` });
        return;
      }

      setApplyResult({ ok: true, result: data.result });
      setApplyConfirmed(false);
      await loadAll();
    } catch (err) {
      setApplyResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setApplyLoading(false);
    }
  }

  const intentOptions = intents?.parsed?.intents ?? [];
  const selectedIntent = intentOptions.find((intent) => intent.id === selectedIntentId) ?? null;
  const activeIntents = intentOptions.filter((intent) => intent.lifecycle === 'active');
  const backlogIntents = intentOptions.filter((intent) => intent.lifecycle === 'backlog');
  const closedIntents = intentOptions.filter((intent) => intent.lifecycle === 'closed');
  const chaosResult = (status?.parsed as { observation?: { chaosResult?: { score?: number; level?: string } } } | null)?.observation?.chaosResult;
  const phase2CheckedAt = phase2 ? new Date(phase2.checkedAt).toLocaleString() : '--';
  const sessionIntentId = sessionContext?.summary?.sessionIntentId ?? null;
  const sessionIntentSource = sessionContext?.summary?.sessionIntentSource ?? null;
  const sessionLabel = sessionContext?.summary?.sessionLabel ?? null;
  const checkpointTimestamp = sessionContext?.summary?.checkpointTimestamp
    ? new Date(sessionContext.summary.checkpointTimestamp).toLocaleString()
    : null;
  const selectedIntentDetail = intentDetail?.ok ? intentDetail.detail ?? null : null;
  const selectedIntentRuntimeStatus = !selectedIntent
    ? null
    : selectedIntent.id === sessionIntentId
      ? 'running'
      : selectedIntent.lifecycle === 'active'
        ? 'idle'
        : selectedIntent.lifecycle === 'backlog'
          ? 'queued'
          : selectedIntent.lifecycle === 'closed'
            ? 'closed'
            : selectedIntent.lifecycle ?? 'unknown';
  const lifecycleLaneStep = selectedIntent?.lifecycle === 'closed'
    ? 3
    : selectedIntent?.lifecycle === 'active'
      ? 2
      : selectedIntent?.lifecycle === 'backlog'
        ? 1
        : 0;

  function getTaskRuntimeState(task: IntentTask): TaskViewModel['runtimeState'] {
    if (task.status === 'blocked') {
      return 'blocked';
    }

    if (task.status === 'done') {
      return 'done';
    }

    if (task.tags.includes('reviewed') || task.status === 'warning') {
      if (selectedIntentRuntimeStatus === 'running' && (task.tags.includes('partial') || task.status === 'warning')) {
        return 'running';
      }

      return 'review';
    }

    if (selectedIntentRuntimeStatus === 'running' && task.status === 'open') {
      return 'running';
    }

    return 'open';
  }

  function formatTaskSourceLabel(source: string) {
    if (source === 'intent.md') return 'Intent doc';
    if (source === 'plan.md') return 'Plan doc';
    return source;
  }

  const taskView = (selectedIntentDetail?.tasks ?? []).map((task) => {
    const runtimeState = getTaskRuntimeState(task);
    const sectionLabel = task.section || 'General';
    const summaryTags = task.tags.filter((tag) => tag !== 'reviewed');

    return {
      ...task,
      runtimeState,
      sectionLabel,
      sourceLabel: formatTaskSourceLabel(task.source),
      summaryTags,
    } satisfies TaskViewModel;
  });

  const filteredTasks = taskView.filter((task) => {
    if (taskFilter === 'all') return true;
    return task.runtimeState === taskFilter;
  });

  const runtimePriority: Record<TaskViewModel['runtimeState'], number> = {
    running: 0,
    blocked: 1,
    review: 2,
    open: 3,
    done: 4,
  };

  const sortedTasks = [...filteredTasks].sort((left, right) => {
    if (taskSort === 'title') {
      return left.title.localeCompare(right.title);
    }

    return runtimePriority[left.runtimeState] - runtimePriority[right.runtimeState]
      || left.sectionLabel.localeCompare(right.sectionLabel)
      || left.title.localeCompare(right.title);
  });

  const groupedTasks = sortedTasks.reduce<Record<string, TaskViewModel[]>>((groups, task) => {
    const key = task.sectionLabel;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
    return groups;
  }, {});

  const taskGroups = Object.entries(groupedTasks);
  const topRules = rules?.parsed?.rules?.slice(0, 8) ?? [];
  const topIssues = documentsSnapshot?.summary?.topIssues ?? [];
  const workspaceMilestones = [
    { version: 'v2.6', name: 'Evidence loop', progress: 100, state: 'done' as const },
    { version: 'v2.7', name: 'Supervision loop', progress: 100, state: 'done' as const },
    { version: 'v2.8', name: 'Principal grounding', progress: selectedIntentDetail ? 70 : 45, state: 'current' as const },
    { version: 'v2.9', name: 'Graph loop', progress: 20, state: 'planned' as const },
    { version: 'v3.0', name: 'Reasoning loop', progress: 0, state: 'planned' as const },
  ];
  const loopSteps = [
    { label: 'Goal', sublabel: selectedIntentDetail?.goal ? 'aligned' : 'pending', state: selectedIntentDetail?.goal ? 'done' : 'todo' },
    { label: 'Checkpoint', sublabel: selectedIntentDetail?.focusCurrent ? 'loaded' : 'missing', state: selectedIntentDetail?.focusCurrent ? 'current' : 'todo' },
    { label: 'Tasks', sublabel: `${selectedIntentDetail?.tasks?.length ?? 0} items`, state: (selectedIntentDetail?.tasks?.length ?? 0) > 0 ? 'done' : 'todo' },
    { label: 'Mutations', sublabel: selectedIntentRuntimeStatus ?? 'idle', state: selectedIntentRuntimeStatus === 'running' ? 'current' : selectedIntentDetail ? 'done' : 'todo' },
  ] as const;
  const cockpitTasks = sortedTasks.slice(0, 6);
  const searchNeedle = searchQuery.trim().toLowerCase();
  const searchResults = searchNeedle.length === 0
    ? []
    : [
        ...intentOptions.map((intent) => ({
          kind: 'intent',
          title: intent.id ?? 'Unknown intent',
          subtitle: `${intent.lifecycle ?? 'unknown'} · ${intent.mode ?? 'unknown'}`,
        })),
        ...topRules.map((rule) => ({
          kind: 'rule',
          title: rule.id ?? 'Unknown rule',
          subtitle: `${rule.severity ?? 'unknown'} · ${rule.title ?? 'Untitled rule'}`,
        })),
        ...topIssues.map((issue) => ({
          kind: 'issue',
          title: issue.message ?? 'Unnamed issue',
          subtitle: `${issue.severity ?? 'unknown'} · ${issue.evidencePath ?? 'no evidence path'}`,
        })),
      ].filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(searchNeedle));

  return (
    <main className="app-shell">
      <header className="hd">
        <div className="logo">
          <div className="logo-ico">KB</div>
          <div>
            <div className="logo-txt">KBAgent Control Plane</div>
            <div className="logo-ver">localhost</div>
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Main views">
          <button
            type="button"
            className={`tab ${activeTab === 'workspace' ? 'on' : ''}`}
            role="tab"
            aria-selected={activeTab === 'workspace'}
            onClick={() => setActiveTab('workspace')}
          >
            Workspace
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'system' ? 'on' : ''}`}
            role="tab"
            aria-selected={activeTab === 'system'}
            onClick={() => setActiveTab('system')}
          >
            System
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'documents' ? 'on' : ''}`}
            role="tab"
            aria-selected={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'search' ? 'on' : ''}`}
            role="tab"
            aria-selected={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
          >
            Search KB
          </button>
        </div>

        <div className="hd-r">
          <div className="chaos-pill" aria-live="polite">
            <span className="chaos-n">Chaos {chaosResult?.score ?? '--'}</span>
            <span className="chaos-l">{chaosResult?.level ?? 'unknown'}</span>
          </div>
          <button className="hbtn hbtn-p" type="button" onClick={onRefresh} disabled={refreshing || loading}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="found">
        <div className="found-top">
          <div className="found-ico">◆</div>
          <div>
            <h1 className="found-title">Phase 2 deterministic gate cockpit</h1>
            <p className="found-desc">
              Localhost webapp runs beside VS Code. Chat proposes actions, web visualizes state,
              CLI remains the deterministic write path.
            </p>
          </div>
        </div>
        <div className="found-meta">
          <span className="chip cb">checked {phase2CheckedAt}</span>
          {phase2 && <span className="chip cgr">pass {phase2.summary.pass} · warn {phase2.summary.warn} · fail {phase2.summary.fail}</span>}
          {phase2 && <span className={`chip ${phase2.summary.blocked ? 'cr' : 'cg'}`}>{phase2.summary.blocked ? 'blocked' : 'unblocked'}</span>}
          {sessionIntentId && <span className="chip ca">session intent {sessionIntentId}</span>}
        </div>
      </section>

      <section className={`page ${activeTab === 'workspace' ? 'on' : ''}`} role="tabpanel">
        <div className="scroll">
          <section className="workspace-cockpit">
            <article className="panel panel-wide workspace-section">
              <div className="panel-header-row">
                <div>
                  <p className="panel-label">Foundation</p>
                  <h2>Milestones</h2>
                </div>
                <button className="secondary-btn" type="button" onClick={() => setActiveTab('search')}>
                  Search KB
                </button>
              </div>
              <div className="milestone-strip">
                {workspaceMilestones.map((milestone) => (
                  <div key={milestone.version} className={`milestone-card ${milestone.state}`}>
                    <div className="milestone-version">{milestone.version}</div>
                    <div className="milestone-name">{milestone.name}</div>
                    <div className="milestone-bar"><div className="milestone-fill" style={{ width: `${milestone.progress}%` }} /></div>
                    <div className="milestone-meta">{milestone.progress}% {milestone.state === 'done' ? 'complete' : milestone.state === 'current' ? 'current' : 'planned'}</div>
                  </div>
                ))}
              </div>
            </article>

          <section className="grid">
        <article className="panel workspace-section">
          <p className="panel-label">Foundation</p>
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

        <article className="panel workspace-section">
          <p className="panel-label">Foundation</p>
          <h2>Runtime status</h2>
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

        <article className="panel workspace-section">
          <p className="panel-label">Checkpoint</p>
          <h2>Current focus</h2>
          <div className="checkpoint-card-ui">
            <h3>{sessionLabel || 'No active session label'}</h3>
            <p className="meta">
              {sessionIntentSource || 'unknown-source'}
              {checkpointTimestamp ? ` · ${checkpointTimestamp}` : ''}
            </p>
            <p className="muted">{selectedIntentDetail?.focusCurrent || 'No checkpoint summary loaded yet.'}</p>
            <div className="section-chip-row">
              {sessionIntentId && <span className="chip ca">intent {sessionIntentId}</span>}
              {sessionContext?.summary?.focusFile && <span className="chip cgr">{sessionContext.summary.focusFile}</span>}
            </div>
          </div>
        </article>

        <article className="panel panel-wide workspace-section">
          <div className="panel-header-row">
            <div>
              <p className="panel-label">Goals & criteria</p>
              <h2>Workspace goals</h2>
            </div>
            <div className="section-chip-row">
              <span className="chip cg">shared goals</span>
              <span className="chip cb">runtime partial</span>
            </div>
          </div>
          <div className="goal-list">
            <article className="goal-card-ui">
              <div className="goal-card-head">
                <div>
                  <h3>Deterministic write path integrity</h3>
                  <p className="muted">Chat proposes, web observes, CLI remains the write gate.</p>
                </div>
                <span className="chip cg">active</span>
              </div>
              <div className="goal-metric-row">
                <span>Phase 2 gates</span>
                <span>{phase2 ? `${phase2.summary.pass} pass / ${phase2.summary.fail} fail` : '--'}</span>
              </div>
              <div className="goal-metric-row">
                <span>Working tree</span>
                <span>{workspaceSnapshot?.summary?.hasWorkingTreeChanges ? 'changed' : 'clean or unknown'}</span>
              </div>
            </article>
            <article className="goal-card-ui warning">
              <div className="goal-card-head">
                <div>
                  <h3>Ontology and graph convergence</h3>
                  <p className="muted">Ontology already acts like a contract layer; graph runtime is still a smaller export surface.</p>
                </div>
                <span className="chip ca">gap exposed</span>
              </div>
              <div className="goal-metric-row">
                <span>Entities</span>
                <span>{documentsSnapshot?.summary?.entityCount ?? '--'}</span>
              </div>
              <div className="goal-metric-row">
                <span>Relations</span>
                <span>{documentsSnapshot?.summary?.relationCount ?? '--'}</span>
              </div>
            </article>
          </div>
        </article>

        <article className="panel panel-wide workspace-section">
          <div className="panel-header-row">
            <div>
              <p className="panel-label">Interaction boundary</p>
              <h2>Chat, web, CLI</h2>
            </div>
          </div>
          {interaction && (
            <ul className="boundary-list">
              <li><strong>Chat:</strong> {interaction.chat}</li>
              <li><strong>Web:</strong> {interaction.web}</li>
              <li><strong>Write path:</strong> {interaction.writePath}</li>
            </ul>
          )}
        </article>

        <article className="panel panel-wide workspace-section">
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

        <article className="panel panel-wide workspace-section">
          <div className="panel-header-row">
            <div>
              <p className="panel-label">Intents</p>
              <h2>Intent cockpit</h2>
            </div>
            <div className="section-chip-row">
              {selectedIntent && <span className="chip ca">selected {selectedIntent.id}</span>}
              {selectedIntentRuntimeStatus && <span className={`intent-runtime runtime-${selectedIntentRuntimeStatus}`}>{selectedIntentRuntimeStatus}</span>}
            </div>
          </div>

          <div className="loop-bar-ui" role="list" aria-label="Intent loop">
            {loopSteps.map((step, index) => (
              <div key={`${step.label}-${index}`} className={`loop-step ${step.state}`} role="listitem">
                <span className="loop-step-num">0{index + 1}</span>
                <span className="loop-step-label">{step.label}</span>
                <span className="loop-step-sub">{step.sublabel}</span>
              </div>
            ))}
          </div>

          <div className="quick-actions-ui">
            <span className="quick-actions-label">Quick actions</span>
            <button className="secondary-btn" type="button" onClick={() => sessionIntentId && setSelectedIntentId(sessionIntentId)} disabled={!sessionIntentId}>Load checkpoint</button>
            <button className="secondary-btn" type="button" onClick={() => setIntentDetailTab('tasks')} disabled={!selectedIntent}>Open tasks</button>
            <button className="secondary-btn" type="button" onClick={() => setIntentDetailTab('actions')} disabled={!selectedIntent}>Open mutations</button>
            <button className="secondary-btn" type="button" onClick={() => setShowCreateIntent((current) => !current)}>Create draft</button>
          </div>

          <div className="workspace-task-table-wrap">
            <table className="workspace-task-table">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Task</th>
                  <th>Section</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {cockpitTasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="workspace-task-empty">Select an intent with tasks to populate the cockpit table.</td>
                  </tr>
                )}
                {cockpitTasks.map((task, index) => (
                  <tr key={`${task.title}-${index}`}>
                    <td><span className={`intent-task-state ${task.runtimeState}`}>{task.runtimeState}</span></td>
                    <td>{task.title}</td>
                    <td>{task.sectionLabel}</td>
                    <td>{task.sourceLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel panel-wide">
          <p className="panel-label">Intents</p>
          <div className="panel-header-row">
            <div>
              <h2>Intent Command Center</h2>
              <p className="muted">Create from the top when needed. Inspect, update, approve, and apply inside the selected intent so command context stays local.</p>
            </div>
            <div className="intent-toolbar">
              <button
                className={`secondary-btn ${showCreateIntent ? 'is-open' : ''}`}
                type="button"
                onClick={() => setShowCreateIntent((current) => !current)}
              >
                {showCreateIntent ? 'Hide draft intent' : 'Create draft intent'}
              </button>
              <button className="refresh-btn" type="button" onClick={onRefresh} disabled={refreshing || loading}>
                {refreshing ? 'Refreshing...' : 'Reload intents'}
              </button>
            </div>
          </div>
          <div className="intent-kpis">
            <span className="chip cg">active {activeIntents.length}</span>
            <span className="chip cb">backlog {backlogIntents.length}</span>
            <span className="chip cgr">closed {closedIntents.length}</span>
            {selectedIntent && <span className="chip ca">selected {selectedIntent.id}</span>}
          </div>

          {showCreateIntent && (
            <div className="create-intent-inline">
              <div className="mutation-card">
                <div className="intent-section-head">
                  <div>
                    <p className="panel-label">Create</p>
                    <h3>Create draft intent</h3>
                  </div>
                </div>
                <div className="mutation-form">
                  <div className="form-field">
                    <label htmlFor="create-title">Title *</label>
                    <input
                      id="create-title"
                      type="text"
                      placeholder="Draft intent title (min 3 chars)"
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

                  <div className="intent-action-row">
                    <button
                      type="button"
                      onClick={onCreateIntent}
                      disabled={createLoading || !createFormData.title.trim()}
                      className="submit-btn"
                    >
                      {createLoading ? 'Creating...' : 'Create draft'}
                    </button>
                    <button type="button" className="secondary-btn" onClick={() => setShowCreateIntent(false)}>
                      Close
                    </button>
                  </div>

                  {createResult && (
                    <div className={`form-result ${createResult.ok ? 'ok' : 'error'}`}>
                      <p>
                        {createResult.ok
                          ? `✓ Intent created: ${createResult.result instanceof Object ? (createResult.result as { id?: string }).id || 'unknown' : 'unknown'}`
                          : `✗ Error: ${createResult.error}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </article>
            <article className="panel panel-wide intent-layout">
              <aside className="intent-rail" aria-label="Intent list">
                <div className="intent-rail-group">
                  <p className="panel-label">Active</p>
                  {activeIntents.length === 0 && <p className="muted">No active intents</p>}
                  {activeIntents.map((intent) => (
                    <button
                      key={`active-${intent.id}`}
                      type="button"
                      className={`intent-item ${selectedIntentId === intent.id ? 'on' : ''} ${sessionIntentId === intent.id ? 'session' : ''}`}
                      onClick={() => setSelectedIntentId(intent.id ?? '')}
                    >
                      <span className="intent-item-title">{intent.id}</span>
                      <span className="intent-item-meta">{intent.lifecycle} · {intent.mode}</span>
                      <span className={`intent-item-badge ${sessionIntentId === intent.id ? 'running' : 'idle'}`}>
                        {sessionIntentId === intent.id ? 'running' : 'idle'}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="intent-rail-group">
                  <p className="panel-label">Backlog</p>
                  {backlogIntents.slice(0, 12).map((intent) => (
                    <button
                      key={`backlog-${intent.id}`}
                      type="button"
                      className={`intent-item ${selectedIntentId === intent.id ? 'on' : ''} ${sessionIntentId === intent.id ? 'session' : ''}`}
                      onClick={() => setSelectedIntentId(intent.id ?? '')}
                    >
                      <span className="intent-item-title">{intent.id}</span>
                      <span className="intent-item-meta">{intent.lifecycle} · {intent.mode}</span>
                      <span className="intent-item-badge queued">queued</span>
                    </button>
                  ))}
                </div>

                <div className="intent-rail-group">
                  <p className="panel-label">Closed (recent)</p>
                  {closedIntents.slice(0, 8).map((intent) => (
                    <button
                      key={`closed-${intent.id}`}
                      type="button"
                      className={`intent-item ${selectedIntentId === intent.id ? 'on' : ''} ${sessionIntentId === intent.id ? 'session' : ''}`}
                      onClick={() => setSelectedIntentId(intent.id ?? '')}
                    >
                      <span className="intent-item-title">{intent.id}</span>
                      <span className="intent-item-meta">{intent.lifecycle} · {intent.mode}</span>
                      <span className="intent-item-badge closed">closed</span>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="intent-main">
                <div className="intent-focus">
                  <div className="intent-focus-head">
                    <div>
                      <h3>Selected Intent</h3>
                      {selectedIntent && (
                        <p className="muted session-copy">
                          {selectedIntent.id === sessionIntentId ? 'Running in current session' : 'Inspecting selected intent'}
                        </p>
                      )}
                    </div>
                    <select
                      id="intent-picker"
                      className="mutation-select"
                      value={selectedIntentId}
                      onChange={(e) => setSelectedIntentId(e.target.value)}
                    >
                      <option value="">Select an intent</option>
                      {intentOptions.map((intent, index) => (
                        <option key={`${intent.id}-${index}`} value={intent.id}>
                          {intent.id} · {intent.lifecycle} · {intent.mode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="intent-lane" role="list" aria-label="Intent lifecycle lane">
                    <div className={`intent-step ${lifecycleLaneStep >= 0 ? 'done' : ''}`}>Draft</div>
                    <div className={`intent-step ${lifecycleLaneStep >= 1 ? 'done' : ''}`}>Backlog</div>
                    <div className={`intent-step ${lifecycleLaneStep >= 2 ? 'done' : ''}`}>Active</div>
                    <div className={`intent-step ${lifecycleLaneStep >= 3 ? 'done' : ''}`}>Closed</div>
                  </div>

                  {!selectedIntent && <p className="muted">Pick an intent from left rail to inspect its goal and action context.</p>}

                  {selectedIntent && (
                    <div className="intent-detail-stack">
                      <div className="intent-detail-card">
                        <div className="intent-detail-head">
                          <div>
                            <h4>{selectedIntentDetail?.title || selectedIntent.id}</h4>
                            <p className="meta">{selectedIntent.id}</p>
                          </div>
                          {selectedIntentRuntimeStatus && <span className={`intent-runtime runtime-${selectedIntentRuntimeStatus}`}>{selectedIntentRuntimeStatus}</span>}
                        </div>
                        <p className="intent-goal">
                          {selectedIntentDetail?.goal || selectedIntentDetail?.decisionSummary || selectedIntentDetail?.focusCurrent || 'No goal captured yet for this intent.'}
                        </p>
                      </div>

                      <div className="intent-subtabs" role="tablist" aria-label="Intent detail views">
                        <button type="button" className={`intent-subtab ${intentDetailTab === 'overview' ? 'on' : ''}`} onClick={() => setIntentDetailTab('overview')}>Overview</button>
                        <button type="button" className={`intent-subtab ${intentDetailTab === 'tasks' ? 'on' : ''}`} onClick={() => setIntentDetailTab('tasks')}>Tasks</button>
                        <button type="button" className={`intent-subtab ${intentDetailTab === 'actions' ? 'on' : ''}`} onClick={() => setIntentDetailTab('actions')}>Actions</button>
                        <button type="button" className={`intent-subtab ${intentDetailTab === 'raw' ? 'on' : ''}`} onClick={() => setIntentDetailTab('raw')}>Raw</button>
                      </div>

                      {selectedIntent.id === sessionIntentId && (
                        <details className="intent-detail-card session-detail-card intent-collapsible" open>
                          <summary className="intent-section-head">
                            <div className="intent-detail-head">
                              <div>
                                <p className="panel-label">Session</p>
                                <h4>{sessionLabel || 'Unnamed session'}</h4>
                              </div>
                              <span className="intent-runtime runtime-running">running</span>
                            </div>
                          </summary>
                          <p className="muted session-copy">
                            {sessionIntentSource ? `source ${sessionIntentSource}` : 'source unavailable'}
                            {checkpointTimestamp ? ` · checkpoint ${checkpointTimestamp}` : ''}
                          </p>
                          {sessionContext?.summary?.focusFile && <p className="meta">focus file: {sessionContext.summary.focusFile}</p>}
                        </details>
                      )}

                      {intentDetailTab === 'overview' && (
                        <div className="intent-detail-grid">
                          <details className="intent-detail-card intent-collapsible" open>
                            <summary className="intent-section-head">
                              <div>
                                <p className="panel-label">Goal</p>
                                <h4>Intent goal</h4>
                              </div>
                            </summary>
                            <p>{selectedIntentDetail?.goal || 'No explicit Goal section found in intent.md.'}</p>
                          </details>
                          <details className="intent-detail-card intent-collapsible" open>
                            <summary className="intent-section-head">
                              <div>
                                <p className="panel-label">Next action</p>
                                <h4>Execution next step</h4>
                              </div>
                            </summary>
                            <p>{selectedIntentDetail?.focusNextAction || 'No next action recorded.'}</p>
                          </details>
                          <details className="intent-detail-card intent-collapsible" open>
                            <summary className="intent-section-head">
                              <div>
                                <p className="panel-label">Current focus</p>
                                <h4>Current checkpoint</h4>
                              </div>
                            </summary>
                            <p>{selectedIntentDetail?.focusCurrent || 'No current focus recorded.'}</p>
                          </details>
                          <details className="intent-detail-card intent-collapsible" open>
                            <summary className="intent-section-head">
                              <div>
                                <p className="panel-label">Decision summary</p>
                                <h4>Why this intent exists</h4>
                              </div>
                            </summary>
                            <p>{selectedIntentDetail?.decisionSummary || selectedIntentDetail?.summary || 'No summary recorded.'}</p>
                          </details>
                          {!!selectedIntentDetail?.stagedFiles?.length && (
                            <details className="intent-detail-card intent-collapsible intent-detail-span" open>
                              <summary className="intent-section-head">
                                <div>
                                  <p className="panel-label">Staged files</p>
                                  <h4>{selectedIntentDetail.stagedFiles.length} tracked paths</h4>
                                </div>
                              </summary>
                              <div className="intent-chip-row">
                                {selectedIntentDetail.stagedFiles.map((file) => (
                                  <span key={file} className="intent-path-chip">{file}</span>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}

                      {intentDetailTab === 'tasks' && (
                        <details className="intent-detail-card intent-collapsible" open>
                          <summary className="intent-section-head">
                            <div>
                              <p className="panel-label">Tasks</p>
                              <h4>{selectedIntentDetail?.tasks?.length ?? 0} items</h4>
                            </div>
                            <div className="intent-chip-row">
                              {selectedIntentRuntimeStatus === 'running' && <span className="intent-runtime runtime-running">intent running</span>}
                              <span className="chip cgr">UI heuristic, not CLI-native task state</span>
                            </div>
                          </summary>
                          {selectedIntentDetail?.tasks && selectedIntentDetail.tasks.length > 0 ? (
                            <div className="intent-task-stack">
                              <div className="intent-task-toolbar">
                                <div className="intent-filter-group" role="tablist" aria-label="Task filters">
                                  {(['all', 'running', 'blocked', 'done'] as TaskFilterId[]).map((filterId) => (
                                    <button
                                      key={filterId}
                                      type="button"
                                      className={`intent-filter-chip ${taskFilter === filterId ? 'on' : ''}`}
                                      onClick={() => setTaskFilter(filterId)}
                                    >
                                      {filterId}
                                    </button>
                                  ))}
                                </div>
                                <label className="task-sort-label">
                                  <span>Sort</span>
                                  <select className="mutation-select task-sort-select" value={taskSort} onChange={(e) => setTaskSort(e.target.value as TaskSortId)}>
                                    <option value="runtime">runtime</option>
                                    <option value="title">title</option>
                                  </select>
                                </label>
                              </div>

                              <div className="intent-task-legend">
                                <span className="chip ca">running = candidate current work</span>
                                <span className="chip cr">blocked = gap or hard issue</span>
                                <span className="chip cg">done = explicitly complete</span>
                                <span className="chip cb">review = reviewed or partial evidence</span>
                              </div>

                              <div className="intent-task-groups">
                                {taskGroups.map(([section, tasks]) => (
                                  <details key={section} className="intent-task-group" open>
                                    <summary className="intent-task-group-head">
                                      <div>
                                        <p className="panel-label">Section</p>
                                        <h4>{section}</h4>
                                      </div>
                                      <span className="chip cgr">{tasks.length} tasks</span>
                                    </summary>
                                    <div className="intent-task-list compact">
                                      {tasks.map((task, index) => (
                                        <details className={`intent-task-row intent-task-card ${task.runtimeState === 'running' ? 'is-running' : ''}`} key={`${task.source}-${task.section ?? 'none'}-${index}`}>
                                          <summary className="intent-task-summary compact">
                                            <span className={`intent-task-state ${task.runtimeState}`}>{task.runtimeState}</span>
                                            <div className="intent-task-copy">
                                              <p>{task.title}</p>
                                              <div className="intent-task-inline-meta">
                                                <span className="intent-task-meta-chip">{task.sourceLabel}</span>
                                                {task.summaryTags.slice(0, 2).map((tag) => (
                                                  <span key={`${task.title}-${tag}`} className="intent-task-meta-chip tag">{tag}</span>
                                                ))}
                                                {task.relatedCommits[0] && <span className="intent-task-meta-chip commit">{task.relatedCommits[0].sha}</span>}
                                              </div>
                                            </div>
                                          </summary>
                                          <div className="intent-task-body">
                                            {task.description && <p className="intent-task-description">{task.description}</p>}
                                            <div className="intent-chip-row detail-meta-row">
                                              <span className="intent-path-chip">section: {task.sectionLabel}</span>
                                              <span className="intent-path-chip">source: {task.sourceLabel}</span>
                                            </div>
                                            {task.tags.length > 0 && (
                                              <div className="intent-task-tags">
                                                {task.tags.map((tag) => (
                                                  <span key={tag} className="intent-task-tag">{tag}</span>
                                                ))}
                                              </div>
                                            )}
                                            {task.relatedCommits.length > 0 && (
                                              <div className="intent-task-commits">
                                                {task.relatedCommits.map((commit) => (
                                                  <div key={`${task.title}-${commit.sha}`} className="intent-task-commit">
                                                    <span className="intent-task-sha">{commit.sha}</span>
                                                    <span>{commit.subject}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </details>
                                      ))}
                                    </div>
                                  </details>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p>No tasks match the current filter, or no checklist was found in intent.md / plan.md.</p>
                          )}
                        </details>
                      )}

                      {intentDetailTab === 'actions' && (
                        <div className="intent-detail-stack">
                          <details className="intent-detail-card intent-collapsible" open>
                            <summary className="intent-section-head">
                              <div>
                                <p className="panel-label">Update</p>
                                <h4>Update intent</h4>
                              </div>
                              <span className="intent-runtime runtime-idle">selected intent</span>
                            </summary>
                            <div className="mutation-form compact-form">
                              <div className="form-field">
                                <label htmlFor="update-title">Title</label>
                                <input id="update-title" type="text" value={updateFormData.title} onChange={(e) => setUpdateFormData({ ...updateFormData, title: e.target.value })} disabled={updateLoading} />
                              </div>
                              <div className="form-field">
                                <label htmlFor="update-focus">Focus</label>
                                <input id="update-focus" type="text" value={updateFormData.focus} onChange={(e) => setUpdateFormData({ ...updateFormData, focus: e.target.value })} disabled={updateLoading} />
                              </div>
                              <div className="form-field">
                                <label htmlFor="update-action">Next action</label>
                                <input id="update-action" type="text" value={updateFormData.next_action} onChange={(e) => setUpdateFormData({ ...updateFormData, next_action: e.target.value })} disabled={updateLoading} />
                              </div>
                              <div className="form-field">
                                <label htmlFor="update-state">State</label>
                                <select id="update-state" className="mutation-select" value={updateFormData.state} onChange={(e) => setUpdateFormData({ ...updateFormData, state: e.target.value })} disabled={updateLoading}>
                                  <option value="draft">draft</option>
                                  <option value="staged">staged</option>
                                  <option value="active">active</option>
                                  <option value="closed">closed</option>
                                </select>
                              </div>
                              <div className="form-field intent-detail-span">
                                <label htmlFor="update-summary">Decision summary</label>
                                <textarea id="update-summary" rows={3} value={updateFormData.decision_summary} onChange={(e) => setUpdateFormData({ ...updateFormData, decision_summary: e.target.value })} disabled={updateLoading} />
                              </div>
                              <div className="intent-action-row intent-detail-span">
                                <button type="button" onClick={onUpdateIntent} disabled={updateLoading || !selectedIntentId.trim()} className="submit-btn">{updateLoading ? 'Updating...' : 'Update intent'}</button>
                              </div>
                              {updateResult && <div className={`form-result ${updateResult.ok ? 'ok' : 'error'} intent-detail-span`}><p>{updateResult.ok ? '✓ Intent updated' : `✗ Error: ${updateResult.error}`}</p></div>}
                            </div>
                          </details>

                          <details className="intent-detail-card intent-collapsible" open>
                            <summary className="intent-section-head">
                              <div>
                                <p className="panel-label">Approve and apply</p>
                                <h4>Mutation gate</h4>
                              </div>
                              {selectedIntentRuntimeStatus && <span className={`intent-runtime runtime-${selectedIntentRuntimeStatus}`}>{selectedIntentRuntimeStatus}</span>}
                            </summary>
                            <div className="mutation-form">
                              <div className="form-field">
                                <label htmlFor="approve-note">Approval note</label>
                                <textarea id="approve-note" rows={3} value={approveNote} onChange={(e) => setApproveNote(e.target.value)} disabled={approveLoading} placeholder="Optional approval note" />
                              </div>
                              <div className="intent-action-row">
                                <button type="button" onClick={onApproveIntent} disabled={approveLoading || !selectedIntentId.trim()} className="submit-btn">{approveLoading ? 'Approving...' : 'Approve intent'}</button>
                                <button type="button" onClick={onPreviewApply} disabled={previewLoading || !selectedIntentId.trim()} className="secondary-btn">{previewLoading ? 'Loading preview...' : 'Preview apply'}</button>
                              </div>
                              {approveResult && <div className={`form-result ${approveResult.ok ? 'ok' : 'error'}`}><p>{approveResult.ok ? '✓ Intent approved' : `✗ Error: ${approveResult.error}`}</p></div>}
                              {previewResult && (
                                <div className={`form-result ${previewResult.ok ? 'ok' : 'error'}`}>
                                  <p>{previewResult.ok ? '✓ Preview ready' : `✗ Error: ${previewResult.error}`}</p>
                                  {previewResult.ok && (
                                    <>
                                      <p className="meta">Files changed: {previewResult.diff?.files_changed ?? 0} · +{previewResult.diff?.insertions ?? 0} / -{previewResult.diff?.deletions ?? 0}</p>
                                      <pre>{JSON.stringify(previewResult.diff, null, 2)}</pre>
                                      {previewResult.warnings && previewResult.warnings.length > 0 && (
                                        <ul className="warning-list">
                                          {previewResult.warnings.map((warning, index) => (
                                            <li key={`${warning.message ?? 'warning'}-${index}`}>{warning.level ?? 'info'} · {warning.message ?? 'No message'}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                              <label className="confirm-row">
                                <input type="checkbox" checked={applyConfirmed} onChange={(e) => setApplyConfirmed(e.target.checked)} />
                                <span>I understand this will apply the selected intent</span>
                              </label>
                              <button type="button" onClick={onApplyIntent} disabled={applyLoading || !selectedIntentId.trim()} className="submit-btn">{applyLoading ? 'Applying...' : 'Apply intent'}</button>
                              {applyResult && <div className={`form-result ${applyResult.ok ? 'ok' : 'error'}`}><p>{applyResult.ok ? '✓ Intent applied' : `✗ Error: ${applyResult.error}`}</p></div>}
                            </div>
                          </details>
                        </div>
                      )}

                      {intentDetailTab === 'raw' && <pre>{selectedIntentDetail ? JSON.stringify(selectedIntentDetail, null, 2) : JSON.stringify(selectedIntent, null, 2)}</pre>}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <article className="panel">
              <p className="panel-label">Rules context</p>
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
              <p className="panel-label">Intent registry</p>
              <h2>Registry snapshot</h2>
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
          </section>
          </section>
        </div>
      </section>

      <section className={`page ${activeTab === 'system' ? 'on' : ''}`} role="tabpanel">
        <div className="scroll">
          <section className="grid">

        <article className="panel panel-wide workspace-section">
          <div className="panel-header-row">
            <div>
              <p className="panel-label">Graph · infra · runtime</p>
              <h2>Current architecture truth</h2>
            </div>
            <div className="section-chip-row">
              <span className="chip cb">runtime-backed</span>
              <span className="chip ca">graph partial</span>
            </div>
          </div>
          <div className="system-stat-grid">
            <div className="stat-card-ui">
              <span className="stat-num">{systemSnapshot?.summary?.nodeVersion ?? '--'}</span>
              <span className="stat-label">node</span>
            </div>
            <div className="stat-card-ui">
              <span className="stat-num">{documentsSnapshot?.summary?.entityCount ?? '--'}</span>
              <span className="stat-label">entities</span>
            </div>
            <div className="stat-card-ui">
              <span className="stat-num">{documentsSnapshot?.summary?.relationCount ?? '--'}</span>
              <span className="stat-label">relations</span>
            </div>
            <div className="stat-card-ui">
              <span className="stat-num">{documentsSnapshot?.summary?.issueCount ?? '--'}</span>
              <span className="stat-label">doc issues</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <p className="panel-label">Workspace</p>
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
          <p className="panel-label">System</p>
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
          <p className="panel-label">Documents graph</p>
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

          </section>
        </div>
      </section>

      <section className={`page ${activeTab === 'documents' ? 'on' : ''}`} role="tabpanel">
        <div className="scroll">
          <section className="grid">
            <article className="panel panel-wide workspace-section">
              <div className="panel-header-row">
                <div>
                  <p className="panel-label">Documents</p>
                  <h2>Knowledge-base surface</h2>
                </div>
                <div className="section-chip-row">
                  <span className="chip cb">design-aligned shell</span>
                  <span className="chip cgr">runtime partial</span>
                </div>
              </div>
              <div className="docs-shell">
                <aside className="docs-list">
                  <button type="button" className="docs-item on">system-map.md</button>
                  <button type="button" className="docs-item">focus.md</button>
                  <button type="button" className="docs-item">intent registry</button>
                  <button type="button" className="docs-item">rules catalog</button>
                </aside>
                <div className="docs-detail">
                  <h3>system-map.md</h3>
                  <p className="muted">The target cockpit model keeps shared goals above project-specific intents, with graph and system state exposed underneath.</p>
                  <pre>{`Current observed runtime\n- Goals are visible through gates, focus, and rules\n- Intents are project-specific and session-aware\n- Ontology is ahead of the graph runtime\n- Documents graph remains a partial export surface`}</pre>
                </div>
              </div>
            </article>

            <article className="panel">
              <p className="panel-label">Rules</p>
              <h2>Registered rules</h2>
              <pre>{topRules.map((rule) => `${rule.id} · ${rule.severity} · ${rule.title}`).join('\n') || 'No rules loaded'}</pre>
            </article>

            <article className="panel">
              <p className="panel-label">Issues</p>
              <h2>Top document issues</h2>
              <pre>{topIssues.map((issue) => `${issue.severity} · ${issue.message} · ${issue.evidencePath}`).join('\n') || 'No issues loaded'}</pre>
            </article>
          </section>
        </div>
      </section>

      <section className={`page ${activeTab === 'search' ? 'on' : ''}`} role="tabpanel">
        <div className="scroll">
          <section className="grid">
            <article className="panel panel-wide workspace-section">
              <div className="panel-header-row">
                <div>
                  <p className="panel-label">Search KB</p>
                  <h2>Cross-surface search</h2>
                </div>
              </div>
              <div className="search-shell">
                <input
                  className="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search intents, rules, issues..."
                />
                <div className="search-results">
                  {searchNeedle.length === 0 && <p className="muted">Type to search current runtime-backed surfaces.</p>}
                  {searchNeedle.length > 0 && searchResults.length === 0 && <p className="muted">No matches.</p>}
                  {searchResults.map((result, index) => (
                    <div key={`${result.kind}-${result.title}-${index}`} className="search-result-item">
                      <strong>{result.title}</strong>
                      <span className="meta">{result.kind} · {result.subtitle}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>
        </div>
      </section>

      {error && (
        <section className="error-banner">
          <p><strong>Load error:</strong> {error}</p>
        </section>
      )}
    </main>
  );
}