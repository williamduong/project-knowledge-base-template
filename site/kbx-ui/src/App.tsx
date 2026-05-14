import { useEffect, useState, type ReactNode, type SVGProps } from 'react';

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
      description?: string;
      owner_layer?: string;
      enforceability?: string;
      runtime_status?: string;
      since_version?: string;
      source_doc?: string | null;
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

type TabId = 'overview' | 'workspace' | 'documents' | 'search';
type IntentDetailTabId = 'tasks' | 'edit';
type TaskFilterId = 'all' | 'backlog' | 'active' | 'close';
type TaskSortId = 'runtime' | 'title';

type IntentTask = NonNullable<NonNullable<IntentDetailResponse['detail']>['tasks'][number]>;
type TaskViewModel = IntentTask & {
  runtimeState: 'running' | 'blocked' | 'done' | 'review' | 'open';
  taskState: 'backlog' | 'active' | 'close';
  taskId: string;
  sectionLabel: string;
  sourceLabel: string;
  summaryTags: string[];
  runtimeLabel: string;
  detailDescription: string;
  closeCondition: string;
  nextStepLabel: string;
  dependency: {
    taskId: string;
    title: string;
    relation: string;
  } | null;
  actionItems: Array<{
    label: string;
    description: string;
    prompt: string;
    Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  }>;
};

type TaskLifecycleStep = {
  key: 'draft' | 'active' | 'review' | 'close';
  label: string;
  status: 'done' | 'current' | 'todo';
};

type RegisteredRule = NonNullable<NonNullable<RulesResponse['parsed']>['rules']>[number];

const RULE_DOMAIN_COPY: Record<string, { label: string; summary: string }> = {
  M: {
    label: 'Metadata rules',
    summary: 'Giữ frontmatter và trường metadata đúng schema để KB không bị hỏng nền dữ liệu.',
  },
  V: {
    label: 'Verification rules',
    summary: 'Kiểm soát mối quan hệ giữa verification và time_state để claim có thể kiểm chứng được.',
  },
  I: {
    label: 'Intent rules',
    summary: 'Giữ intent đủ ngữ cảnh vận hành, đặc biệt là next action và change scope.',
  },
  GB: {
    label: 'Git binding rules',
    summary: 'Ràng buộc intent và checkpoint với dấu vết git để truy vết được thay đổi.',
  },
  AX: {
    label: 'Axiom rules',
    summary: 'Các rule hành vi nền tảng để agent không lệch khỏi contract gốc.',
  },
  GV: {
    label: 'Governance verification rules',
    summary: 'Kiểm tra những chỗ contract quản trị bắt buộc phải tồn tại và còn đồng bộ.',
  },
  P: {
    label: 'Pipeline rules',
    summary: 'Ràng buộc các bước pipeline và lane vận hành khi shell phát triển thêm.',
  },
  PR: {
    label: 'Principle alignment rules',
    summary: 'Giữ các nguyên tắc cốt lõi giữa SVFactory và KBAgent không bị drift.',
  },
  WF: {
    label: 'Workflow alignment rules',
    summary: 'Kiểm tra workflow thực thi có còn khớp với contract và lane làm việc hay không.',
  },
  KA: {
    label: 'Knowledge alignment rules',
    summary: 'Giữ KBAgent nói đúng runtime truth, đúng guidance và đúng knowledge contract.',
  },
  UNKNOWN: {
    label: 'Unknown domain',
    summary: 'Rule chưa map được vào domain đã biết.',
  },
};

function UiIcon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

function DraftIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></UiIcon>;
}

function BacklogIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></UiIcon>;
}

function ActiveIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><path d="M12 3v18" /><path d="m5 10 7-7 7 7" /></UiIcon>;
}

function ClosedIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><circle cx="12" cy="12" r="8" /><path d="m9 12 2 2 4-4" /></UiIcon>;
}

function ApproveIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><path d="M5 12.5 9.5 17 19 7.5" /></UiIcon>;
}

function PreviewIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></UiIcon>;
}

function ApplyIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></UiIcon>;
}

function RetroIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v4h4" /></UiIcon>;
}

function ImpactIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><path d="M12 3 4 7v5c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V7l-8-4Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></UiIcon>;
}

function ArchiveIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><rect x="4" y="5" width="16" height="4" rx="1" /><path d="M6 9h12v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9Z" /><path d="M10 13h4" /></UiIcon>;
}

function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return <UiIcon {...props}><path d="m6 9 6 6 6-6" /></UiIcon>;
}

type CollapsiblePanelProps = {
  className?: string;
  label: string;
  title: string;
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

function CollapsiblePanel({ className = '', label, title, actions, defaultOpen = true, children }: CollapsiblePanelProps) {
  return (
    <details className={`panel intent-collapsible collapsible-panel ${className}`.trim()} open={defaultOpen}>
      <summary className="panel-header-row collapsible-panel-summary">
        <div>
          <p className="panel-label">{label}</p>
          <h2>{title}</h2>
        </div>
        <div className="section-chip-row collapsible-panel-actions">
          {actions}
          <span className="collapse-icon-shell" aria-hidden="true">
            <ChevronIcon className="collapse-icon" />
          </span>
        </div>
      </summary>
      {children}
    </details>
  );
}

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
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [intentDetailTab, setIntentDetailTab] = useState<IntentDetailTabId>('tasks');
  const [showCreateIntent, setShowCreateIntent] = useState(false);
  const [copyToast, setCopyToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilterId>('all');
  const [taskSort, setTaskSort] = useState<TaskSortId>('runtime');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRuleDomains, setExpandedRuleDomains] = useState<string[]>([]);

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
      await loadAll();
    } catch (err) {
      setApplyResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setApplyLoading(false);
    }
  }

  function showCopyToast(kind: 'success' | 'error', message: string) {
    setCopyToast({ kind, message });
    window.setTimeout(() => {
      setCopyToast((current) => (current?.message === message ? null : current));
    }, 2200);
  }

  async function copyToClipboard(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      showCopyToast('success', successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      showCopyToast('error', 'Không sao chép được vào clipboard');
    }
  }

  async function copyCopilotPrompt(prompt: string, label: string) {
    await copyToClipboard(prompt, `Đã sao chép: ${label}`);
  }

  const intentOptions = Array.from(new Map((intents?.parsed?.intents ?? []).filter((intent) => intent.id).map((intent) => [intent.id, intent])).values());
  const selectedIntent = intentOptions.find((intent) => intent.id === selectedIntentId) ?? null;
  const activeIntents = intentOptions.filter((intent) => intent.lifecycle === 'active');
  const backlogIntents = intentOptions.filter((intent) => intent.lifecycle === 'backlog');
  const closedIntents = intentOptions.filter((intent) => intent.lifecycle === 'closed');
  const chaosResult = (status?.parsed as { observation?: { chaosResult?: { score?: number; level?: string } } } | null)?.observation?.chaosResult;
  const phase2CheckedAt = phase2 ? new Date(phase2.checkedAt).toLocaleString() : '--';
  const sessionIntentId = sessionContext?.summary?.sessionIntentId ?? null;
  const sessionIntentSource = sessionContext?.summary?.sessionIntentSource ?? null;
  const sessionLabel = sessionContext?.summary?.sessionLabel ?? null;
  const currentSessionLabel = sessionLabel?.trim() || 'Kiểm tra intent và làm sạch';
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
  function getLifecycleLaneStep(lifecycle?: string | null) {
    if (lifecycle === 'closed') return 3;
    if (lifecycle === 'active') return 2;
    if (lifecycle === 'backlog') return 1;
    return 0;
  }

  const lifecycleLaneStep = getLifecycleLaneStep(selectedIntent?.lifecycle);

  function getIntentVersion(id?: string | null) {
    if (!id) return 'v?.?';
    const match = id.match(/^v(\d+)-(\d+)/i);
    return match ? `v${match[1]}.${match[2]}` : 'v?.?';
  }

  function getLifecycleTone(lifecycle?: string | null) {
    if (lifecycle === 'active') return 'cg';
    if (lifecycle === 'backlog') return 'cb';
    if (lifecycle === 'closed') return 'cgr';
    if (lifecycle === 'staged') return 'ca';
    return 'ca';
  }

  function formatLifecycleLabel(lifecycle?: string | null) {
    if (lifecycle === 'active') return 'Đang làm';
    if (lifecycle === 'backlog') return 'Hàng chờ';
    if (lifecycle === 'closed') return 'Đã đóng';
    if (lifecycle === 'staged') return 'Tạm chốt';
    return lifecycle ?? 'Không rõ';
  }

  function formatScopeLabel(scope?: string | null) {
    if (scope === 'active') return 'Bản đang dùng';
    if (scope === 'backlog') return 'Bản backlog';
    if (scope === 'closed') return 'Bản đã đóng';
    return scope ?? 'Không rõ nguồn';
  }

  async function updateIntentLifecycle(nextState: string) {
    setUpdateFormData((current) => ({ ...current, state: nextState }));
    setUpdateLoading(true);
    try {
      const response = await fetch(`/api/intents/${encodeURIComponent(selectedIntentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updateFormData.title.trim() || undefined,
          focus: updateFormData.focus.trim() || undefined,
          next_action: updateFormData.next_action.trim() || undefined,
          decision_summary: updateFormData.decision_summary.trim() || undefined,
          state: nextState,
        }),
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

  function formatTaskRuntimeLabel(runtimeState: TaskViewModel['runtimeState']) {
    if (runtimeState === 'running') return 'Đang xử lý';
    if (runtimeState === 'blocked') return 'Đang bị chặn';
    if (runtimeState === 'review') return 'Chờ soát';
    if (runtimeState === 'done') return 'Đã xong';
    return 'Chưa xử lý';
  }

  function getTaskState(runtimeState: TaskViewModel['runtimeState']): TaskViewModel['taskState'] {
    if (runtimeState === 'done') return 'close';
    if (runtimeState === 'running' || runtimeState === 'review') return 'active';
    return 'backlog';
  }

  function formatTaskStateLabel(taskState: TaskViewModel['taskState']) {
    if (taskState === 'active') return 'Active';
    if (taskState === 'close') return 'Close';
    return 'Backlog';
  }

  function getRuleDomain(ruleId?: string) {
    const match = String(ruleId || '').match(/^KBX-([A-Z]+)\d{3}$/);
    return match?.[1] ?? 'UNKNOWN';
  }

  function getRuleDomainMeta(domain: string) {
    return RULE_DOMAIN_COPY[domain] ?? RULE_DOMAIN_COPY.UNKNOWN;
  }

  function formatOwnerLayer(ownerLayer?: string) {
    if (ownerLayer === 'svfactory') return 'SVFactory';
    if (ownerLayer === 'kbagent') return 'KBAgent';
    if (ownerLayer === 'shared') return 'Shared';
    return ownerLayer || 'Unknown';
  }

  function formatRuleSeverity(severity?: string) {
    if (severity === 'error') return 'Hard fail';
    if (severity === 'warn') return 'Warning';
    if (severity === 'info') return 'Soft guidance';
    return severity || 'Unknown';
  }

  function formatEnforceability(enforceability?: string) {
    if (enforceability === 'auto') return 'Auto check';
    if (enforceability === 'semi') return 'Mixed: runtime + reviewer';
    if (enforceability === 'human') return 'Human review only';
    return enforceability || 'Unknown';
  }

  function formatRuntimeStatus(runtimeStatus?: string) {
    if (runtimeStatus === 'implemented') return 'Live in runtime';
    if (runtimeStatus === 'planned') return 'Planned only';
    return runtimeStatus || 'Unknown';
  }

  function getRuleTone(severity?: string) {
    if (severity === 'error') return 'cr';
    if (severity === 'warn') return 'ca';
    if (severity === 'info') return 'cg';
    return 'cgr';
  }

  function toggleRuleDomain(domain: string) {
    setExpandedRuleDomains((current) => (
      current.includes(domain)
        ? current.filter((item) => item !== domain)
        : [...current, domain]
    ));
  }

  function getTaskLifecycleSteps(task: TaskViewModel): TaskLifecycleStep[] {
    const currentKey: TaskLifecycleStep['key'] = task.runtimeState === 'done'
      ? 'close'
      : task.runtimeState === 'review'
        ? 'review'
        : task.runtimeState === 'running' || task.runtimeState === 'blocked'
          ? 'active'
          : 'draft';
    const order: TaskLifecycleStep['key'][] = ['draft', 'active', 'review', 'close'];
    const labels: Record<TaskLifecycleStep['key'], string> = {
      draft: 'Draft',
      active: 'Active',
      review: 'Review',
      close: 'Close',
    };
    const currentIndex = order.indexOf(currentKey);

    return order.map((key, index) => ({
      key,
      label: labels[key],
      status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo',
    }));
  }

  function buildTaskDescription(task: IntentTask, sourceLabel: string, sectionLabel: string) {
    if (task.description?.trim()) {
      return task.description.trim();
    }

    if (/verification/i.test(sectionLabel)) {
      return `Task kiểm chứng lấy từ ${sourceLabel}. Cần đối chiếu runtime, tài liệu hoặc evidence để xác nhận kết luận.`;
    }

    if (sourceLabel === 'Plan doc') {
      return 'Task này đến từ plan, thường là việc triển khai hoặc đồng bộ trạng thái giữa kế hoạch và intent.';
    }

    if (task.tags.includes('partial')) {
      return 'Task đang ở trạng thái một phần. Có tín hiệu đã làm nhưng chưa đủ bằng chứng để kết luận hoàn tất.';
    }

    return `Task lấy từ ${sourceLabel} trong section ${sectionLabel}. Cần làm rõ đầu ra mong đợi trước khi đóng.`;
  }

  function buildTaskCloseCondition(task: IntentTask, runtimeState: TaskViewModel['runtimeState'], sourceLabel: string) {
    if (runtimeState === 'done') {
      return 'Chỉ giữ trạng thái đóng khi checklist đã được đánh dấu xong và evidence liên quan vẫn còn hợp lệ.';
    }

    if (runtimeState === 'blocked') {
      return 'Chỉ được đóng khi blocker được gỡ, có đường xử lý rõ ràng, và kết quả được cập nhật lại vào intent hoặc plan.';
    }

    if (task.tags.includes('partial') || runtimeState === 'review') {
      return 'Chỉ đóng khi bỏ được trạng thái partial, có kết luận review rõ ràng, và không còn điểm mơ hồ trong evidence.';
    }

    if (sourceLabel === 'Intent doc') {
      return 'Chỉ đóng khi intent.md phản ánh kết quả cuối cùng và các commit hoặc bằng chứng liên quan đã đủ để kiểm chứng.';
    }

    return 'Chỉ đóng khi đầu ra của task đã hoàn tất, trạng thái được cập nhật lại trong plan, và còn có thể truy vết bằng evidence hoặc commit.';
  }

  function buildTaskNextStepLabel(task: IntentTask, runtimeState: TaskViewModel['runtimeState']) {
    if (runtimeState === 'blocked') return 'Gỡ blocker trước';
    if (runtimeState === 'review') return 'Soát lại evidence';
    if (runtimeState === 'running') return 'Hoàn tất phần còn lại';
    if (task.tags.includes('partial')) return 'Chốt phần còn thiếu';
    if (runtimeState === 'done') return 'Giữ nguyên và theo dõi';
    return 'Làm rõ đầu ra cần đạt';
  }

  function buildTaskDependency(tasks: IntentTask[], currentIndex: number, taskState: TaskViewModel['taskState']) {
    if (taskState === 'close') {
      return null;
    }

    const currentTask = tasks[currentIndex];
    const sameSectionCandidate = [...tasks]
      .slice(0, currentIndex)
      .reverse()
      .find((task) => (task.section || 'General') === (currentTask.section || 'General') && task.status !== 'done');

    const fallbackCandidate = [...tasks]
      .slice(0, currentIndex)
      .reverse()
      .find((task) => task.status !== 'done');

    const dependencyTask = sameSectionCandidate || fallbackCandidate;
    if (!dependencyTask) {
      return null;
    }

    const dependencyIndex = tasks.indexOf(dependencyTask);
    return {
      taskId: `T-${String(dependencyIndex + 1).padStart(3, '0')}`,
      title: dependencyTask.title,
      relation: sameSectionCandidate ? 'Phụ thuộc task trước trong cùng section' : 'Phụ thuộc task chưa đóng gần nhất',
    };
  }

  function buildTaskActionItems(task: IntentTask, taskId: string, runtimeLabel: string, closeCondition: string, detailDescription: string) {
    return [
      {
        label: 'Làm rõ task',
        description: 'Tóm tắt mục tiêu và đầu ra',
        Icon: PreviewIcon,
        prompt: `Explain task ${taskId} in Vietnamese. Current runtime state: ${runtimeLabel}. Raw title: ${task.title}. Description: ${detailDescription}. Tell me what this task means, what output is expected, and what file or evidence I should inspect first.`,
      },
      {
        label: 'Điều kiện đóng',
        description: 'Kiểm tra tiêu chí hoàn tất',
        Icon: ApproveIcon,
        prompt: `Review close criteria for task ${taskId}. Current task text: ${task.text}. Proposed close condition: ${closeCondition}. Tell me whether this is enough to close, what evidence is still missing, and what exact proof should be added before marking done.`,
      },
      {
        label: 'Hướng xử lý',
        description: 'Đề xuất bước tiếp theo',
        Icon: ImpactIcon,
        prompt: `Give the next action plan for task ${taskId}. Runtime state: ${runtimeLabel}. Tags: ${task.tags.join(', ') || 'none'}. Related commits: ${task.relatedCommits.map((commit) => commit.sha).join(', ') || 'none'}. Return 3 concrete next steps in Vietnamese, ordered from safest to most direct.`,
      },
    ];
  }

  const taskView = (selectedIntentDetail?.tasks ?? []).map((task, index, tasks) => {
    const runtimeState = getTaskRuntimeState(task);
    const taskState = getTaskState(runtimeState);
    const sectionLabel = task.section || 'General';
    const sourceLabel = formatTaskSourceLabel(task.source);
    const summaryTags = task.tags.filter((tag) => tag !== 'reviewed');
    const runtimeLabel = formatTaskRuntimeLabel(runtimeState);
    const detailDescription = buildTaskDescription(task, sourceLabel, sectionLabel);
    const closeCondition = buildTaskCloseCondition(task, runtimeState, sourceLabel);
    const nextStepLabel = buildTaskNextStepLabel(task, runtimeState);
    const taskId = `T-${String(index + 1).padStart(3, '0')}`;
    const dependency = buildTaskDependency(tasks, index, taskState);
    const actionItems = buildTaskActionItems(task, taskId, runtimeLabel, closeCondition, detailDescription);

    return {
      ...task,
      runtimeState,
      taskState,
      taskId,
      sectionLabel,
      sourceLabel,
      summaryTags,
      runtimeLabel,
      detailDescription,
      closeCondition,
      nextStepLabel,
      dependency,
      actionItems,
    } satisfies TaskViewModel;
  });

  const filteredTasks = taskView.filter((task) => {
    if (taskFilter === 'all') return true;
    return task.taskState === taskFilter;
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
  const pipelinePrinciples = [
    {
      id: 'P1',
      name: 'Intent lifecycle',
      summary: 'Mở intent theo draft/backlog, kích hoạt khi đủ điều kiện, apply qua CLI, rồi close hoặc archive.',
      flow: 'draft -> activate -> apply -> close/archive',
      status: 'runtime-backed',
    },
    {
      id: 'P2',
      name: 'Task lifecycle',
      summary: 'Task phải đi qua trạng thái rõ ràng từ draft đến close; không để review partial treo mãi trong parent intent.',
      flow: 'draft -> active -> review -> close',
      status: 'ui-derived',
    },
    {
      id: 'P3',
      name: 'Checkpoint and maintain',
      summary: 'Checkpoint ghi focus hiện tại, còn maintain chạy vòng kiểm tra sức khỏe để giữ shell và evidence nhất quán.',
      flow: 'focus/checkpoint -> maintain -> verify',
      status: 'runtime-backed',
    },
    {
      id: 'P4',
      name: 'Release gate',
      summary: 'Release KB là pipeline riêng: plan/run/init-pipeline, nhưng contract release-gate đầy đủ vẫn còn drift so với roadmap.',
      flow: 'plan -> validate -> run -> catalog',
      status: 'partial',
    },
  ];

  const topRules = rules?.parsed?.rules?.slice(0, 8) ?? [];
  const registeredRules = rules?.parsed?.rules ?? [];
  const ruleLandscape = Object.values(
    registeredRules.reduce<Record<string, {
      domain: string;
      label: string;
      summary: string;
      count: number;
      severities: Set<string>;
      enforceabilities: Set<string>;
      runtimeStatuses: Set<string>;
      ownerLayers: Set<string>;
      rules: RegisteredRule[];
    }>>((accumulator, rule) => {
      const domain = getRuleDomain(rule.id);
      const domainMeta = getRuleDomainMeta(domain);
      if (!accumulator[domain]) {
        accumulator[domain] = {
          domain,
          label: domainMeta.label,
          summary: domainMeta.summary,
          count: 0,
          severities: new Set<string>(),
          enforceabilities: new Set<string>(),
          runtimeStatuses: new Set<string>(),
          ownerLayers: new Set<string>(),
          rules: [],
        };
      }
      accumulator[domain].count += 1;
      if (rule.severity) accumulator[domain].severities.add(rule.severity);
      if (rule.enforceability) accumulator[domain].enforceabilities.add(rule.enforceability);
      if (rule.runtime_status) accumulator[domain].runtimeStatuses.add(rule.runtime_status);
      if (rule.owner_layer) accumulator[domain].ownerLayers.add(rule.owner_layer);
      accumulator[domain].rules.push(rule);
      return accumulator;
    }, {}),
  ).sort((left, right) => left.label.localeCompare(right.label));
  const topIssues = documentsSnapshot?.summary?.topIssues ?? [];
  const workspaceMilestones = [
    { version: 'v2.6', name: 'Evidence loop', progress: 100, state: 'done' as const },
    { version: 'v2.7', name: 'Supervision loop', progress: 100, state: 'done' as const },
    { version: 'v2.8', name: 'Principal grounding', progress: selectedIntentDetail ? 70 : 45, state: 'current' as const },
    { version: 'v2.9', name: 'Graph loop', progress: 20, state: 'planned' as const },
    { version: 'v3.0', name: 'Reasoning loop', progress: 0, state: 'planned' as const },
  ];
  const workspaceIntents = [...intentOptions].sort((left, right) => {
    const leftPriority = left.id === sessionIntentId ? 0 : left.lifecycle === 'active' ? 1 : left.lifecycle === 'backlog' ? 2 : left.lifecycle === 'closed' ? 3 : 4;
    const rightPriority = right.id === sessionIntentId ? 0 : right.lifecycle === 'active' ? 1 : right.lifecycle === 'backlog' ? 2 : right.lifecycle === 'closed' ? 3 : 4;
    return leftPriority - rightPriority || (left.id ?? '').localeCompare(right.id ?? '');
  });
  const selectedIntentTaskCount = selectedIntentDetail?.tasks?.length ?? 0;
  const totalTasks = selectedIntentDetail?.tasks?.length ?? selectedIntentTaskCount;
  const completedTasks = (selectedIntentDetail?.tasks ?? []).filter((task) => task.status === 'done').length;
  const remainingTasks = Math.max(totalTasks - completedTasks, 0);
  const intentProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const lifecyclePercent = selectedIntent?.lifecycle === 'closed'
    ? 100
    : totalTasks > 0
      ? intentProgress
      : selectedIntent?.lifecycle === 'active'
        ? 70
        : selectedIntent?.lifecycle === 'backlog'
          ? 35
          : 10;
  const intentPriority = selectedIntent?.id === sessionIntentId ? 'P1' : selectedIntent?.lifecycle === 'active' ? 'P1' : selectedIntent?.lifecycle === 'backlog' ? 'P2' : 'P3';
  const closeCriteria = selectedIntentDetail?.focusNextAction || 'Hoàn tất checklist, chốt bằng chứng kiểm chứng, rồi mới đóng hoặc lưu trữ intent.';
  const lifecycleSteps = [
    {
      label: 'Phác thảo',
      shortLabel: 'Draft',
      state: lifecycleLaneStep > 0 ? 'done' : lifecycleLaneStep === 0 ? 'current' : 'todo',
      percent: lifecycleLaneStep > 0 ? 100 : lifecycleLaneStep === 0 ? lifecyclePercent : 0,
      Icon: DraftIcon,
    },
    {
      label: 'Hàng chờ',
      shortLabel: 'Backlog',
      state: lifecycleLaneStep > 1 ? 'done' : lifecycleLaneStep === 1 ? 'current' : 'todo',
      percent: lifecycleLaneStep > 1 ? 100 : lifecycleLaneStep === 1 ? lifecyclePercent : 0,
      Icon: BacklogIcon,
    },
    {
      label: 'Đang làm',
      shortLabel: 'Active',
      state: lifecycleLaneStep > 2 ? 'done' : lifecycleLaneStep === 2 ? 'current' : 'todo',
      percent: lifecycleLaneStep > 2 ? 100 : lifecycleLaneStep === 2 ? lifecyclePercent : 0,
      Icon: ActiveIcon,
    },
    {
      label: 'Hoàn tất',
      shortLabel: 'Closed',
      state: lifecycleLaneStep === 3 ? 'current' : 'todo',
      percent: lifecycleLaneStep === 3 ? 100 : 0,
      Icon: ClosedIcon,
    },
  ] as const;
  function formatLifecycleStepStatus(step: typeof lifecycleSteps[number]) {
    if (step.shortLabel === 'Closed' && step.state !== 'current') {
      return 'chưa đóng';
    }

    if (step.state === 'done') {
      return 'đã qua';
    }

    if (step.state === 'current') {
      return 'đang active';
    }

    return 'chưa tới';
  }
  const insightActions = selectedIntent ? [
    {
      label: 'Retrospective',
      description: 'Nhìn lại thay đổi',
      kind: 'copy' as const,
      Icon: RetroIcon,
      prompt: `Start a retrospective for intent ${selectedIntent.id}. Summarize what changed, what is still risky, and what should happen next based on the current task states and decision summary.`,
    },
    {
      label: 'Impact',
      description: 'Đánh giá ảnh hưởng',
      kind: 'copy' as const,
      Icon: ImpactIcon,
      prompt: `Run an impact check for intent ${selectedIntent.id}. Identify affected contracts, likely regressions, validation gaps, and the safest next verification steps.`,
    },
  ] : [];
  const lifecycleActionColumns = selectedIntent ? [
    {
      stage: 'Phác thảo',
      actions: [
        ...(selectedIntent.lifecycle !== 'backlog' ? [{ label: 'Đưa vào backlog', description: 'Chốt hướng xử lý', kind: 'state' as const, state: 'backlog', Icon: BacklogIcon }] : []),
      ],
    },
    {
      stage: 'Hàng chờ',
      actions: [
        ...(selectedIntent.lifecycle !== 'active' ? [{ label: 'Kích hoạt', description: 'Bắt đầu thực thi', kind: 'state' as const, state: 'active', Icon: ActiveIcon }] : []),
        { label: 'Phê duyệt', description: 'Mở quyền triển khai', kind: 'approve' as const, Icon: ApproveIcon },
      ],
    },
    {
      stage: 'Đang làm',
      actions: [
        { label: 'Xem trước', description: 'Soát thay đổi dự kiến', kind: 'preview' as const, Icon: PreviewIcon },
        { label: 'Áp dụng', description: 'Chạy mutation', kind: 'apply' as const, Icon: ApplyIcon },
      ],
    },
    {
      stage: 'Hoàn tất',
      actions: [
        ...(selectedIntent.lifecycle !== 'closed' ? [{ label: 'Đóng intent', description: 'Kết thúc vòng đời', kind: 'state' as const, state: 'closed', Icon: ClosedIcon }] : []),
        { label: 'Lưu trữ', description: 'Giữ làm bằng chứng', kind: 'state' as const, state: 'closed', Icon: ArchiveIcon },
        ...insightActions,
      ],
    },
  ] : [];
  const intentOverviewItems = [
    { label: 'active', value: activeIntents.length, tone: 'cg' },
    { label: 'backlog', value: backlogIntents.length, tone: 'cb' },
    { label: 'closed', value: closedIntents.length, tone: 'cgr' },
    { label: 'session', value: sessionIntentId ? 1 : 0, tone: 'ca' },
  ];
  const signalItems = [
    phase2 && phase2.summary.fail > 0 ? `Phase 2 has ${phase2.summary.fail} failing gate(s)` : null,
    topIssues[0]?.message ? `Doc issue: ${topIssues[0].message}` : null,
    selectedIntentRuntimeStatus === 'running' ? `Session intent ${sessionIntentId} is running` : null,
    workspaceSnapshot?.summary?.hasWorkingTreeChanges ? 'Working tree has local changes' : null,
  ].filter(Boolean) as string[];
  const gitOverviewItems = [
    {
      name: 'project-knowledge-base-template',
      detail: workspaceSnapshot?.summary?.hasWorkingTreeChanges ? 'working tree changed' : 'working tree clean/unknown',
      tone: workspaceSnapshot?.summary?.hasWorkingTreeChanges ? 'ca' : 'cg',
    },
    {
      name: 'active session intent',
      detail: sessionIntentId ?? 'no session intent',
      tone: sessionIntentId ? 'cb' : 'cgr',
    },
  ];
  const infrastructureItems = [
    { name: 'Local UI', value: 'http://localhost:4173/', tone: 'cg' },
    { name: 'CLI bridge', value: interaction?.web ?? 'localhost bridge', tone: 'cb' },
    { name: 'Node runtime', value: systemSnapshot?.summary?.nodeVersion ?? '--', tone: 'cgr' },
    { name: 'Workspace root', value: systemSnapshot?.summary?.workspaceRoot ?? '--', tone: 'cgr' },
  ];
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
        <div className="project-head">
          <div className="project-head-title">project-knowledge-base-template</div>
        </div>

        <div className="tabs" role="tablist" aria-label="Main views">
          <button
            type="button"
            className={`tab ${activeTab === 'overview' ? 'on' : ''}`}
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
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
            {refreshing ? 'Refreshing...' : 'Refresh All page'}
          </button>
        </div>
      </header>

      <section className={`page ${(activeTab === 'overview' || activeTab === 'workspace') ? 'on' : ''}`} role="tabpanel">
        <div className="scroll">
          <section className="workspace-cockpit">
            {activeTab === 'overview' && (
              <>
            <CollapsiblePanel
              className="panel-wide workspace-section"
              label="Checkpoint / Focus"
              title="Current focus"
              actions={(
                <>
                  {sessionIntentId && <span className="chip ca">focus {sessionIntentId}</span>}
                  <button className="secondary-btn" type="button" onClick={(event) => {
                    event.preventDefault();
                    setActiveTab('workspace');
                  }}>Open workspace</button>
                </>
              )}
            >
              <div className="checkpoint-card-ui">
                <h3>{sessionLabel || 'No active session label'}</h3>
                <p className="meta">
                  {sessionIntentSource || 'unknown-source'}
                  {checkpointTimestamp ? ` · ${checkpointTimestamp}` : ''}
                </p>
                <p className="muted">Foundation note: localhost webapp is the observability surface, chat proposes actions, and CLI remains the deterministic write path.</p>
                <p className="muted">{selectedIntentDetail?.focusCurrent || 'No checkpoint summary loaded yet.'}</p>
                <div className="section-chip-row">
                  <span className="chip cb">checked {phase2CheckedAt}</span>
                  {phase2 && <span className="chip cgr">pass {phase2.summary.pass} · warn {phase2.summary.warn} · fail {phase2.summary.fail}</span>}
                  {phase2 && <span className={`chip ${phase2.summary.blocked ? 'cr' : 'cg'}`}>{phase2.summary.blocked ? 'blocked' : 'unblocked'}</span>}
                  {sessionIntentId && <span className="chip ca">session intent {sessionIntentId}</span>}
                  {sessionContext?.summary?.focusFile && <span className="chip cgr">{sessionContext.summary.focusFile}</span>}
                  {selectedIntentDetail?.focusNextAction && <span className="chip cb">next: {selectedIntentDetail.focusNextAction}</span>}
                </div>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel
              className="panel-wide workspace-section"
              label="Milestone"
              title="Milestones"
              actions={(
                <button className="secondary-btn" type="button" onClick={(event) => {
                  event.preventDefault();
                  setActiveTab('search');
                }}>
                  Search KB
                </button>
              )}
            >
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
            </CollapsiblePanel>

          <section className="grid">
        <CollapsiblePanel
          className="panel-wide workspace-section"
          label="Goals & criteria"
          title="Workspace goals"
          actions={(
            <>
              <span className="chip cg">shared goals</span>
              <span className="chip cb">runtime partial</span>
            </>
          )}
        >
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
        </CollapsiblePanel>

        <CollapsiblePanel className="workspace-section" label="Intent Overview" title="Intent state summary">
          <div className="overview-stat-list">
            {intentOverviewItems.map((item) => (
              <div key={item.label} className="overview-stat-row">
                <span>{item.label}</span>
                <span className={`chip ${item.tone}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel className="workspace-section" label="Git Repositories" title="Repository overview">
          <div className="overview-list">
            {gitOverviewItems.map((item) => (
              <div key={item.name} className="overview-list-item">
                <strong>{item.name}</strong>
                <span className="meta">{item.detail}</span>
                <span className={`chip ${item.tone}`}>{item.tone === 'cg' ? 'ok' : item.tone === 'ca' ? 'attention' : 'tracked'}</span>
              </div>
            ))}
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          className="panel-wide workspace-section"
          label="Rule Landscape"
          title="What is enforcing what"
          actions={(
            <>
              <span className="chip cb">{registeredRules.length} rules</span>
              <span className="chip cgr">runtime catalog</span>
            </>
          )}
        >
          <p className="muted rule-landscape-intro">
            Mỗi nhóm bên dưới cho biết nó đang canh phần nào của hệ thống, đang là hard gate hay soft guidance,
            và bên trong có những rule cụ thể nào đang chạy thật trong runtime.
          </p>
          <div className="overview-list rule-landscape-list">
            {ruleLandscape.map((group) => (
              <div key={group.domain} className="overview-list-item rule-landscape-item">
                <div className="rule-group-header">
                  <div className="rule-group-title-wrap">
                    <div className="pipeline-item-head">
                      <strong>{group.label}</strong>
                      <span className="chip cgr">{group.domain}</span>
                    </div>
                    <span className="pipeline-item-copy">{group.summary}</span>
                  </div>
                  <div className="rule-group-actions">
                    <span className="chip cb">{group.count} rules</span>
                    <button
                      type="button"
                      className="rule-toggle-btn"
                      onClick={() => toggleRuleDomain(group.domain)}
                      aria-label={expandedRuleDomains.includes(group.domain) ? `Thu gọn ${group.label}` : `Mở ${group.label}`}
                    >
                      <ChevronIcon className={`collapse-icon ${expandedRuleDomains.includes(group.domain) ? 'up' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="rule-group-meta-row">
                  <span className="chip ca">{[...group.severities].map(formatRuleSeverity).join(' · ') || 'Unknown severity'}</span>
                  <span className="chip cb">{[...group.enforceabilities].map(formatEnforceability).join(' · ') || 'Unknown enforceability'}</span>
                  <span className="chip cg">{[...group.runtimeStatuses].map(formatRuntimeStatus).join(' · ') || 'Unknown status'}</span>
                </div>
                <span className="meta">Owner layer: {[...group.ownerLayers].map(formatOwnerLayer).join(', ') || 'Unknown'}</span>
                {expandedRuleDomains.includes(group.domain) ? (
                  <div className="rule-detail-list">
                    {group.rules
                      .slice()
                      .sort((left, right) => (left.id ?? '').localeCompare(right.id ?? ''))
                      .map((rule) => (
                        <div key={rule.id} className="rule-detail-card">
                          <div className="rule-detail-head">
                            <strong>{rule.id}</strong>
                            <div className="section-chip-row">
                              <span className={`chip ${getRuleTone(rule.severity)}`}>{formatRuleSeverity(rule.severity)}</span>
                              <span className="chip cgr">{formatEnforceability(rule.enforceability)}</span>
                            </div>
                          </div>
                          <span className="rule-detail-title">{rule.title || 'Untitled rule'}</span>
                          <span className="pipeline-item-copy">{rule.description || 'No description available.'}</span>
                          <span className="meta">Status: {formatRuntimeStatus(rule.runtime_status)}{rule.source_doc ? ` · Source: ${rule.source_doc}` : ''}</span>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          className="workspace-section"
          label="Signals & alerts"
          title="Attention queue"
          actions={<span className="chip ca">{signalItems.length} signals</span>}
        >
          <div className="overview-list">
            {(signalItems.length > 0 ? signalItems : ['No major signals at the moment.']).map((item) => (
              <div key={item} className="overview-list-item compact">
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel label="Chaos score" title="Trend">
          <div className="overview-stat-list">
            <div className="overview-stat-row">
              <span>score</span>
              <span className="chip cg">{chaosResult?.score ?? '--'}</span>
            </div>
            <div className="overview-stat-row">
              <span>level</span>
              <span className="chip cb">{chaosResult?.level ?? 'unknown'}</span>
            </div>
            <div className="overview-stat-row">
              <span>gate health</span>
              <span className={`chip ${phase2?.summary.blocked ? 'cr' : 'cg'}`}>{phase2?.summary.blocked ? 'blocked' : 'ok'}</span>
            </div>
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel label="Knowledge Graph Overview" title="Graph status">
          <div className="overview-stat-list">
            <div className="overview-stat-row">
              <span>entities</span>
              <span className="chip cb">{documentsSnapshot?.summary?.entityCount ?? '--'}</span>
            </div>
            <div className="overview-stat-row">
              <span>relations</span>
              <span className="chip cb">{documentsSnapshot?.summary?.relationCount ?? '--'}</span>
            </div>
            <div className="overview-stat-row">
              <span>issues</span>
              <span className={`chip ${(documentsSnapshot?.summary?.issueCount ?? 0) > 0 ? 'ca' : 'cg'}`}>{documentsSnapshot?.summary?.issueCount ?? '--'}</span>
            </div>
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          className="workspace-section"
          label="Pipeline principles"
          title="Operational pipelines"
          actions={(
            <>
              <span className="chip cb">4 principles</span>
              <span className="chip cgr">runtime + target</span>
            </>
          )}
        >
          <div className="overview-list pipeline-list">
            {pipelinePrinciples.map((pipeline) => (
              <div key={pipeline.id} className="overview-list-item pipeline-item principle-item">
                <div className="pipeline-item-head">
                  <strong>{pipeline.id}</strong>
                  <span className={`chip ${pipeline.status === 'runtime-backed' ? 'cg' : pipeline.status === 'partial' ? 'ca' : 'cb'}`}>
                    {pipeline.status}
                  </span>
                </div>
                <strong>{pipeline.name}</strong>
                <span className="meta">{pipeline.flow}</span>
                <span className="pipeline-item-copy">{pipeline.summary}</span>
              </div>
            ))}
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel className="panel-wide" label="Infrastructure and environments list overview" title="Runtime surfaces">
          <div className="overview-list">
            {infrastructureItems.map((item) => (
              <div key={item.name} className="overview-list-item">
                <strong>{item.name}</strong>
                <span className="meta">{item.value}</span>
                <span className={`chip ${item.tone}`}>tracked</span>
              </div>
            ))}
          </div>
        </CollapsiblePanel>

          </section>
              </>
            )}

            {activeTab === 'workspace' && (
              <>
          <section className="workspace-grid workspace-grid-shell">
            <aside className="workspace-lane workspace-lane-rail">
              <CollapsiblePanel className="workspace-section workspace-sidebar-panel" label="Workspace" title="All intents">
                <div className="intent-toolbar intent-sidebar-actions">
                  <button
                    className={`secondary-btn ${showCreateIntent ? 'is-open' : ''}`}
                    type="button"
                    onClick={() => setShowCreateIntent((current) => !current)}
                  >
                    <span className="collapse-trigger-inline">
                      <ChevronIcon className={`collapse-icon ${showCreateIntent ? 'up' : ''}`} />
                      <span>{showCreateIntent ? 'Hide draft intent' : 'Create draft intent'}</span>
                    </span>
                  </button>
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
                          <input id="create-title" type="text" placeholder="Draft intent title (min 3 chars)" value={createFormData.title} onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })} disabled={createLoading} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="create-focus">Focus</label>
                          <input id="create-focus" type="text" placeholder="Focus domain (optional)" value={createFormData.focus} onChange={(e) => setCreateFormData({ ...createFormData, focus: e.target.value })} disabled={createLoading} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="create-action">Next action</label>
                          <input id="create-action" type="text" placeholder="Next action (optional)" value={createFormData.next_action} onChange={(e) => setCreateFormData({ ...createFormData, next_action: e.target.value })} disabled={createLoading} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="create-summary">Decision summary</label>
                          <textarea id="create-summary" placeholder="Why this intent exists (optional)" rows={3} value={createFormData.decision_summary} onChange={(e) => setCreateFormData({ ...createFormData, decision_summary: e.target.value })} disabled={createLoading} />
                        </div>
                        <div className="intent-action-row">
                          <button type="button" onClick={onCreateIntent} disabled={createLoading || !createFormData.title.trim()} className="submit-btn">{createLoading ? 'Creating...' : 'Create draft'}</button>
                          <button type="button" className="secondary-btn" onClick={() => setShowCreateIntent(false)}>Close</button>
                        </div>
                        {createResult && <div className={`form-result ${createResult.ok ? 'ok' : 'error'}`}><p>{createResult.ok ? `✓ Intent created: ${createResult.result instanceof Object ? (createResult.result as { id?: string }).id || 'unknown' : 'unknown'}` : `✗ Error: ${createResult.error}`}</p></div>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="intent-sidebar-list" role="list" aria-label="All intents">
                  {workspaceIntents.map((intent) => {
                    const intentStep = getLifecycleLaneStep(intent.lifecycle);
                    return (
                      <button
                        key={intent.id}
                        type="button"
                        role="listitem"
                        className={`intent-card ${selectedIntentId === intent.id ? 'on' : ''} ${sessionIntentId === intent.id ? 'session' : ''}`}
                        onClick={() => setSelectedIntentId(intent.id ?? '')}
                      >
                        <div className="intent-card-topline">
                          <span className="intent-card-version">{getIntentVersion(intent.id)}</span>
                          <span className="intent-card-title">{intent.id}</span>
                        </div>
                        <div className="intent-card-meta">
                          <span className={`chip ${getLifecycleTone(intent.lifecycle)}`}>{formatLifecycleLabel(intent.lifecycle)}</span>
                          {sessionIntentId === intent.id && <span className="chip ca">session</span>}
                        </div>
                        <div className="intent-card-dots" aria-hidden="true">
                          {[0, 1, 2, 3].map((dotIndex) => (
                            <span
                              key={`${intent.id}-${dotIndex}`}
                              className={`intent-card-dot ${dotIndex < intentStep ? 'done' : dotIndex === intentStep ? 'current' : 'todo'}`}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CollapsiblePanel>
            </aside>

            <CollapsiblePanel
              className="workspace-section intent-main-panel"
              label="Intent Workspace"
              title={selectedIntent ? (selectedIntentDetail?.title || selectedIntent.id || 'Selected intent') : 'Selected intent'}
              actions={selectedIntent ? <span className={`chip ${getLifecycleTone(selectedIntent.lifecycle)}`}>{formatLifecycleLabel(selectedIntent.lifecycle)}</span> : undefined}
            >
              <div className="intent-main intent-main-modern">
                {!selectedIntent && <p className="muted">Chọn một intent ở cột trái để xem chi tiết và thao tác.</p>}

                {selectedIntent && (
                  <>
                    <section className="intent-hero-card">
                      <div className="intent-hero-head">
                        <div>
                          <div className="intent-hero-meta">
                            <span className={`chip ${getLifecycleTone(selectedIntent.lifecycle)}`}>{formatLifecycleLabel(selectedIntent.lifecycle)}</span>
                            <span className="chip cb">{selectedIntentTaskCount} việc</span>
                            {selectedIntentDetail?.scope && <span className="chip cg">{formatScopeLabel(selectedIntentDetail.scope)}</span>}
                            {selectedIntent.id === sessionIntentId && <span className="chip ca">{currentSessionLabel}</span>}
                          </div>
                          <h3>{selectedIntentDetail?.title || selectedIntent.id}</h3>
                          {selectedIntentDetail?.sourceFile && <p className="muted">Nguồn đang hiển thị: {selectedIntentDetail.sourceFile}</p>}
                        </div>
                        <div className="intent-hero-actions">
                          <button type="button" className="secondary-btn" onClick={() => setIntentDetailTab('edit')}>Edit</button>
                        </div>
                      </div>

                      <div className="loop-bar-ui process-status-lane lifecycle-lane lifecycle-lane-compact lifecycle-lane-full" role="list" aria-label="Tiến độ intent">
                        {lifecycleSteps.map((step, index) => (
                          <div key={`${step.label}-${index}`} className={`loop-step ${step.state}`} role="listitem">
                            <span className="loop-step-num"><step.Icon className="loop-step-icon" />0{index + 1}</span>
                            <span className="loop-step-label">{step.shortLabel}</span>
                            <span className="loop-step-sub">{step.percent}% · {formatLifecycleStepStatus(step)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="intent-action-grid">
                        {lifecycleActionColumns.map((column) => (
                          <div key={column.stage} className="intent-action-column">
                            <p className="panel-label">{column.stage}</p>
                            <div className="intent-action-stack">
                              {column.actions.map((action) => (
                                <button
                                  key={action.label}
                                  type="button"
                                  className={`intent-action-btn ${action.kind === 'apply' ? 'submit-btn' : 'secondary-btn'}`}
                                  onClick={() => {
                                    if (action.kind === 'approve') {
                                      void onApproveIntent();
                                      return;
                                    }
                                    if (action.kind === 'preview') {
                                      void onPreviewApply();
                                      return;
                                    }
                                    if (action.kind === 'apply') {
                                      void onApplyIntent();
                                      return;
                                    }
                                    if (action.kind === 'copy') {
                                      void copyCopilotPrompt(action.prompt, action.label);
                                      return;
                                    }
                                    void updateIntentLifecycle(action.state);
                                  }}
                                  disabled={
                                    !selectedIntentId.trim()
                                    || updateLoading
                                    || (action.kind === 'approve' && approveLoading)
                                    || (action.kind === 'preview' && previewLoading)
                                    || (action.kind === 'apply' && applyLoading)
                                  }
                                >
                                  <span className="intent-action-btn-main">
                                    <action.Icon className="intent-action-icon" />
                                    <span>{action.label}</span>
                                  </span>
                                  {'description' in action && action.description ? <span className="intent-action-btn-sub">{action.description}</span> : null}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <details className="intent-detail-card intent-collapsible overview-collapse" open>
                        <summary className="intent-section-head">
                          <div>
                            <p className="panel-label">Tổng quan</p>
                            <h4>Tóm tắt intent</h4>
                          </div>
                          <span className="collapse-icon-shell" aria-hidden="true">
                            <ChevronIcon className="collapse-icon" />
                          </span>
                        </summary>
                        <div className="intent-overview-grid">
                          <div className="overview-metric">
                            <span>Mục tiêu</span>
                            <strong>{selectedIntentDetail?.goal ? 'đã bám mục tiêu' : 'chưa rõ mục tiêu'}</strong>
                          </div>
                          <div className="overview-metric">
                            <span>Tiến độ</span>
                            <strong>{intentProgress}% hoàn thành</strong>
                          </div>
                          <div className="overview-metric">
                            <span>Công việc</span>
                            <strong>{remainingTasks} còn lại / {totalTasks} tổng</strong>
                          </div>
                          <div className="overview-metric">
                            <span>Priority</span>
                            <strong>{intentPriority}</strong>
                          </div>
                          <div className="overview-metric">
                            <span>Current focus</span>
                            <strong>{selectedIntentDetail?.focusCurrent || 'No current focus recorded.'}</strong>
                          </div>
                          <div className="overview-metric">
                            <span>Close condition</span>
                            <strong>{closeCriteria}</strong>
                          </div>
                          <div className="overview-metric overview-metric-span">
                            <span>Decision summary</span>
                            <strong>{selectedIntentDetail?.decisionSummary || selectedIntentDetail?.summary || 'No summary recorded.'}</strong>
                          </div>
                        </div>
                      </details>

                      <div className="intent-action-feedback">
                        {approveResult && <div className={`form-result ${approveResult.ok ? 'ok' : 'error'}`}><p>{approveResult.ok ? '✓ Intent approved' : `✗ Error: ${approveResult.error}`}</p></div>}
                        {previewResult && (
                          <div className={`form-result ${previewResult.ok ? 'ok' : 'error'}`}>
                            <p>{previewResult.ok ? '✓ Preview ready' : `✗ Error: ${previewResult.error}`}</p>
                            {previewResult.ok && <p className="meta">Files changed: {previewResult.diff?.files_changed ?? 0} · +{previewResult.diff?.insertions ?? 0} / -{previewResult.diff?.deletions ?? 0}</p>}
                          </div>
                        )}
                        {applyResult && <div className={`form-result ${applyResult.ok ? 'ok' : 'error'}`}><p>{applyResult.ok ? '✓ Intent applied' : `✗ Error: ${applyResult.error}`}</p></div>}
                      </div>

                    </section>

                    <div className="workspace-detail-tabs" role="tablist" aria-label="Intent detail tabs">
                      <button type="button" className={`workspace-detail-tab ${intentDetailTab === 'tasks' ? 'on' : ''}`} onClick={() => setIntentDetailTab('tasks')}>Tasks</button>
                      <button type="button" className={`workspace-detail-tab ${intentDetailTab === 'edit' ? 'on' : ''}`} onClick={() => setIntentDetailTab('edit')}>Edit</button>
                    </div>

                    {intentDetailTab === 'tasks' && (
                      <details className="intent-detail-card intent-collapsible task-board-card" open>
                        <summary className="intent-section-head task-board-headline">
                          <div>
                            <p className="panel-label">Công việc</p>
                            <h4>{selectedIntentTaskCount} task</h4>
                          </div>
                          <span className="collapse-icon-shell" aria-hidden="true">
                            <ChevronIcon className="collapse-icon" />
                          </span>
                        </summary>

                        <div className="task-board-controls">
                          <div className="intent-filter-group" role="tablist" aria-label="Task filters">
                            {(['all', 'backlog', 'active', 'close'] as TaskFilterId[]).map((filterId) => (
                              <button
                                key={filterId}
                                type="button"
                                className={`intent-filter-chip ${taskFilter === filterId ? 'on' : ''}`}
                                onClick={() => setTaskFilter(filterId)}
                              >
                                {filterId === 'all' ? 'tất cả' : filterId}
                              </button>
                            ))}
                          </div>
                          <label className="task-sort-label">
                            <span>Sắp xếp</span>
                            <select className="mutation-select task-sort-select" value={taskSort} onChange={(e) => setTaskSort(e.target.value as TaskSortId)}>
                              <option value="runtime">trạng thái</option>
                              <option value="title">tiêu đề</option>
                            </select>
                          </label>
                        </div>

                        <div className="task-board-table">
                          <div className="task-board-header-row">
                            <span />
                            <span>ID</span>
                            <span>Task</span>
                            <span>Trạng thái</span>
                          </div>
                          {sortedTasks.length === 0 && <div className="task-board-empty">Không có task phù hợp với bộ lọc hiện tại, hoặc chưa tìm thấy checklist trong intent.md / plan.md.</div>}
                          {sortedTasks.map((task, index) => {
                            return (
                              <details key={`${task.source}-${task.section ?? 'none'}-${index}`} className={`task-board-row ${task.runtimeState === 'running' ? 'is-running' : ''}`}>
                                <summary className="task-board-summary">
                                  <span className="collapse-icon-shell task-board-expander" aria-hidden="true">
                                    <ChevronIcon className="collapse-icon" />
                                  </span>
                                  <span className="task-board-id">{task.taskId}</span>
                                  <span className="task-board-title">{task.title}</span>
                                  <span className={`intent-task-state ${task.taskState}`}>{formatTaskStateLabel(task.taskState)}</span>
                                </summary>
                                <div className="task-board-detail">
                                  <div className="task-detail-grid">
                                    <div className="task-detail-card task-detail-card-primary">
                                      <span className="task-detail-label">Task meaning</span>
                                      <p className="intent-task-description">{task.detailDescription}</p>
                                      <div className="task-next-step-row">
                                        <span className="chip cb">Ưu tiên: {task.nextStepLabel}</span>
                                        <span className={`chip ${task.taskState === 'close' ? 'cg' : task.taskState === 'active' ? 'cb' : 'ca'}`}>Runtime: {task.runtimeLabel}</span>
                                      </div>
                                    </div>
                                    <div className="task-detail-card subdued">
                                      <span className="task-detail-label">Task lifecycle</span>
                                      <div className="task-lifecycle-strip" role="list" aria-label={`Task lifecycle ${task.taskId}`}>
                                        {getTaskLifecycleSteps(task).map((step) => (
                                          <div key={`${task.taskId}-${step.key}`} className={`task-lifecycle-step ${step.status}`} role="listitem">
                                            <span className="task-lifecycle-dot" />
                                            <span>{step.label}</span>
                                          </div>
                                        ))}
                                      </div>
                                      <p className="intent-task-description">{task.closeCondition}</p>
                                    </div>
                                  </div>
                                  <div className="task-context-panel">
                                    <div className="task-context-group">
                                      <span className="task-detail-label">Context</span>
                                      <div className="intent-chip-row detail-meta-row">
                                        <span className="intent-path-chip">section: {task.sectionLabel}</span>
                                        <span className="intent-path-chip">source: {task.sourceLabel}</span>
                                        {task.dependency && <span className="intent-path-chip">depends on {task.dependency.taskId} · {task.dependency.title}</span>}
                                      </div>
                                    </div>
                                    {task.summaryTags.length > 0 && (
                                      <div className="task-context-group">
                                        <span className="task-detail-label">Signals</span>
                                        <div className="intent-chip-row detail-meta-row">
                                          {task.summaryTags.map((tag) => (
                                            <span key={`${task.title}-${tag}`} className="intent-task-tag">{tag}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="task-action-block">
                                    <span className="task-detail-label">Action prompts</span>
                                    <div className="task-action-strip">
                                      {task.actionItems.map((action) => (
                                        <button
                                          key={`${task.taskId}-${action.label}`}
                                          type="button"
                                          className="secondary-btn task-action-btn"
                                          onClick={() => void copyCopilotPrompt(action.prompt, `${task.taskId} · ${action.label}`)}
                                        >
                                          <span className="intent-action-btn-main">
                                            <action.Icon className="intent-action-icon" />
                                            <span>{action.label}</span>
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
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
                            );
                          })}
                        </div>
                      </details>
                    )}

                    {intentDetailTab === 'edit' && (
                      <details className="intent-detail-card intent-collapsible" open>
                        <summary className="intent-section-head">
                          <div>
                            <p className="panel-label">Edit</p>
                            <h4>Intent metadata</h4>
                          </div>
                          <span className="collapse-icon-shell" aria-hidden="true">
                            <ChevronIcon className="collapse-icon" />
                          </span>
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
                          <div className="intent-action-row intent-detail-span intent-actions-right">
                            <button type="button" onClick={onUpdateIntent} disabled={updateLoading || !selectedIntentId.trim()} className="submit-btn">{updateLoading ? 'Updating...' : 'Save intent changes'}</button>
                          </div>
                          {updateResult && <div className={`form-result ${updateResult.ok ? 'ok' : 'error'} intent-detail-span`}><p>{updateResult.ok ? '✓ Intent updated' : `✗ Error: ${updateResult.error}`}</p></div>}
                        </div>
                      </details>
                    )}
                  </>
                )}
              </div>
            </CollapsiblePanel>
          </section>
              </>
            )}
          </section>
        </div>
      </section>

      <section className={`page ${activeTab === 'documents' ? 'on' : ''}`} role="tabpanel">
        <div className="scroll">
          <section className="grid">
            <CollapsiblePanel
              className="panel-wide workspace-section"
              label="Documents"
              title="Knowledge-base surface"
              actions={(
                <>
                  <span className="chip cb">design-aligned shell</span>
                  <span className="chip cgr">runtime partial</span>
                </>
              )}
            >
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
            </CollapsiblePanel>

            <CollapsiblePanel label="Rules" title="Registered rules">
              <pre>{topRules.map((rule) => `${rule.id} · ${rule.severity} · ${rule.title}`).join('\n') || 'No rules loaded'}</pre>
            </CollapsiblePanel>

            <CollapsiblePanel label="Issues" title="Top document issues">
              <pre>{topIssues.map((issue) => `${issue.severity} · ${issue.message} · ${issue.evidencePath}`).join('\n') || 'No issues loaded'}</pre>
            </CollapsiblePanel>
          </section>
        </div>
      </section>

      <section className={`page ${activeTab === 'search' ? 'on' : ''}`} role="tabpanel">
        <div className="scroll">
          <section className="grid">
            <CollapsiblePanel className="panel-wide workspace-section" label="Search KB" title="Cross-surface search">
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
            </CollapsiblePanel>
          </section>
        </div>
      </section>

      {error && (
        <section className="error-banner">
          <p><strong>Load error:</strong> {error}</p>
        </section>
      )}

      {copyToast && (
        <div className={`copy-toast ${copyToast.kind === 'error' ? 'error' : 'success'}`} role="status" aria-live="polite">
          <span className="copy-toast-dot" aria-hidden="true" />
          <span>{copyToast.message}</span>
        </div>
      )}
    </main>
  );
}