import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../shared/api/client'

type UnknownRecord = Record<string, unknown>

type BridgePayload = {
  ok?: boolean
  exitCode?: number
  parsed?: unknown
  stdout?: string
  stderr?: string
}

export type ShellHealthTone = 'good' | 'warn' | 'offline' | 'live' | 'neutral'

export type ShellStatusItem = {
  key: string
  label: string
  value: string
  tone: ShellHealthTone
  source: 'live' | 'pending' | 'unavailable'
  category: 'focus' | 'signal' | 'surface'
  title?: string
}

export type ShellStatusSnapshot = {
  items: ShellStatusItem[]
  fingerprint: string
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readNumericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function unwrapBridgePayload(value: unknown): BridgePayload | undefined {
  return isRecord(value) ? (value as BridgePayload) : undefined
}

function unwrapParsed(value: unknown) {
  const payload = unwrapBridgePayload(value)
  return payload?.parsed
}

function findFirstString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === 'string' && String(record[key]).trim()) {
      return String(record[key])
    }
  }

  return undefined
}

function findNestedRecord(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (isRecord(record[key])) {
      return record[key] as UnknownRecord
    }
  }

  return undefined
}

function toneFromStatus(value: string | undefined): ShellHealthTone {
  if (!value) {
    return 'neutral'
  }

  const normalized = value.toLowerCase()

  if (['live', 'connected', 'ok', 'healthy', 'stable', 'ready'].includes(normalized)) {
    return 'good'
  }

  if (['pending', 'degraded', 'warning', 'warn', 'attention'].includes(normalized)) {
    return 'warn'
  }

  if (['offline', 'error', 'failed', 'down', 'unavailable'].includes(normalized)) {
    return 'offline'
  }

  return 'neutral'
}

function buildItem(
  key: string,
  label: string,
  liveValue: string | undefined,
  source: 'live' | 'pending' | 'unavailable',
  tone?: ShellHealthTone,
  category: 'focus' | 'signal' | 'surface' = 'signal',
  title?: string
): ShellStatusItem {
  return {
    key,
    label,
    value: liveValue ?? (source === 'pending' ? 'pending' : 'unavailable'),
    tone: tone ?? toneFromStatus(liveValue),
    source,
    category,
    title,
  }
}

function readCurrentTaskTitle(sessionContext: unknown) {
  if (!isRecord(sessionContext)) {
    return undefined
  }

  const sessionSummary = findNestedRecord(sessionContext, ['summary', 'session', 'context'])
  const currentTask = sessionSummary && isRecord(sessionSummary.currentTask) ? sessionSummary.currentTask : undefined
  return currentTask ? readString(findFirstString(currentTask, ['title'])) : undefined
}

function parseFocusIntent(workspace: unknown, sessionContext: unknown) {
  if (!isRecord(workspace)) {
    if (!isRecord(sessionContext)) {
      return buildItem('focus-intent', 'Focus Intent', undefined, 'pending', 'neutral', 'focus')
    }
  }

  const sessionSummary = isRecord(sessionContext)
    ? findNestedRecord(sessionContext, ['summary', 'session', 'context'])
    : undefined
  const sessionIntent = sessionSummary && isRecord(sessionSummary.intent) ? sessionSummary.intent : undefined

  const sessionIntentId = sessionSummary
    ? readString(findFirstString(sessionIntent ?? sessionSummary, ['id', 'sessionIntentId', 'intentId', 'activeIntentId']))
    : undefined

  const sessionIntentState = sessionSummary
    ? readString(findFirstString(sessionIntent ?? sessionSummary, ['lifecycle', 'sessionIntentState', 'intentState', 'state', 'status']))
    : undefined
  const currentTaskTitle = readCurrentTaskTitle(sessionContext)

  if (!isRecord(workspace)) {
    return buildItem(
      'focus-intent',
      'Focus Intent',
      sessionIntentId && sessionIntentState
        ? `${sessionIntentId} · ${sessionIntentState}`
        : sessionIntentId ?? sessionIntentState,
      sessionIntentId || sessionIntentState ? 'live' : 'pending',
      'neutral',
      'focus',
      currentTaskTitle ? `Current task: ${currentTaskTitle}` : undefined
    )
  }

  const currentFocus = isRecord(workspace.currentFocus)
    ? workspace.currentFocus
    : isRecord(workspace.focus)
      ? workspace.focus
      : isRecord(workspace.activeFocus)
        ? workspace.activeFocus
        : undefined

  if (!currentFocus) {
    return buildItem(
      'focus-intent',
      'Focus Intent',
      sessionIntentId && sessionIntentState
        ? `${sessionIntentId} · ${sessionIntentState}`
        : sessionIntentId ?? sessionIntentState,
      sessionIntentId || sessionIntentState ? 'live' : 'unavailable',
      'neutral',
      'focus',
      currentTaskTitle ? `Current task: ${currentTaskTitle}` : undefined
    )
  }

  const intentId = readString(findFirstString(currentFocus, ['intentId', 'intent_id', 'id', 'activeIntentId']))
  const intentState = readString(findFirstString(currentFocus, ['lifecycle', 'intentState', 'state', 'status']))

  return buildItem(
    'focus-intent',
    'Focus Intent',
    intentId && intentState ? `${intentId} · ${intentState}` : intentId ?? intentState,
    intentId || intentState ? 'live' : 'unavailable',
    'neutral',
    'focus',
    currentTaskTitle ? `Current task: ${currentTaskTitle}` : undefined
  )
}

function readChaosEstimate(sessionContext: unknown) {
  if (!isRecord(sessionContext)) {
    return undefined
  }

  const sessionSummary = findNestedRecord(sessionContext, ['summary', 'session', 'context'])
  const intent = sessionSummary && isRecord(sessionSummary.intent) ? sessionSummary.intent : undefined
  return intent && isRecord(intent.chaosEstimate)
    ? intent.chaosEstimate
    : sessionSummary && isRecord(sessionSummary.chaosEstimate)
      ? sessionSummary.chaosEstimate
      : undefined
}

function parseChaos(status: unknown, sessionContext: unknown) {
  if (!isRecord(status)) {
    return buildItem('chaos', 'Chaos', undefined, 'pending', undefined, 'signal')
  }

  const observation = isRecord(status.observation) ? status.observation : undefined
  const chaos = observation && isRecord(observation.chaosResult)
    ? observation.chaosResult
    : isRecord(status.chaos)
      ? status.chaos
      : status
  const score = readNumber(chaos.score ?? status.chaosScore)
  const level = readString(chaos.level ?? status.chaosLevel)
  const chaosEstimate = readChaosEstimate(sessionContext)
  const estimatedDelta = chaosEstimate ? readNumericValue(chaosEstimate.estimatedDelta) : undefined
  const projectedScore = chaosEstimate ? readNumericValue(chaosEstimate.projectedScore) : undefined
  const projectedLevel = chaosEstimate ? readString(findFirstString(chaosEstimate, ['projectedLevel', 'projected_level'])) : undefined

  const scoreLabel = score !== undefined ? String(score) : undefined
  const deltaLabel = estimatedDelta === undefined ? undefined : `${estimatedDelta >= 0 ? '+' : ''}${estimatedDelta}`
  const effectiveLevel = projectedLevel ?? level
  const value = scoreLabel && deltaLabel && effectiveLevel
    ? `${scoreLabel} ${deltaLabel} ${effectiveLevel}`
    : scoreLabel && effectiveLevel
      ? `${scoreLabel} ${effectiveLevel}`
      : scoreLabel ?? effectiveLevel

  const title = [
    score !== undefined && level ? `Current: ${score} ${level}` : undefined,
    projectedScore !== undefined && projectedLevel ? `Projected: ${projectedScore} ${projectedLevel}` : undefined,
  ].filter(Boolean).join(' | ') || undefined

  const tone: ShellHealthTone = estimatedDelta === undefined
    ? (level ? toneFromStatus(level) : 'neutral')
    : estimatedDelta < 0
      ? 'good'
      : estimatedDelta > 0
        ? 'warn'
        : level ? toneFromStatus(level) : 'neutral'

  return buildItem(
    'chaos',
    'Chaos',
    value,
    value ? 'live' : 'unavailable',
    tone,
    'signal',
    title
  )
}

function parseEnvironmentStatus(status: unknown, system: unknown, version: unknown) {
  const statusRecord = isRecord(status) ? status : {}
  const systemRecord = isRecord(system) ? system : {}
  const bridgeValue = readString(findFirstString(statusRecord, ['bridgeStatus', 'apiStatus', 'status', 'presence']))
  const runtimeServices = isRecord(statusRecord.runtimeServices) ? statusRecord.runtimeServices : undefined
  const runtimeServiceSummary = runtimeServices
    ? readString(findFirstString(runtimeServices, ['summaryLabel']))
    : undefined
  const driftValue = isRecord(statusRecord.state)
    ? readString(findFirstString(statusRecord.state as UnknownRecord, ['driftStatus']))
    : undefined
  const runtimeValue = readString(findFirstString(systemRecord, ['runtimeStatus', 'status', 'nodeStatus']))
  const versionRecord = isRecord(version) ? version : {}
  const appVersion = readString(findFirstString(versionRecord, ['version', 'appVersion', 'buildVersion', 'stdout']))

  return [
    buildItem('ui-local', 'UI', 'live', 'live', 'live', 'surface'),
    buildItem(
      'bridge-api',
      'API',
      bridgeValue && runtimeServiceSummary
        ? `${bridgeValue} · ${runtimeServiceSummary}`
        : bridgeValue && driftValue
          ? `${bridgeValue} · ${driftValue}`
          : bridgeValue ?? runtimeServiceSummary ?? driftValue,
      isRecord(status) ? (bridgeValue || driftValue || runtimeServiceSummary ? 'live' : 'unavailable') : 'pending',
      driftValue ? toneFromStatus(driftValue) : bridgeValue ? toneFromStatus(bridgeValue) : undefined,
      'surface'
    ),
    buildItem(
      'workspace-runtime',
      'Runtime',
      runtimeValue && appVersion ? `${runtimeValue} · ${appVersion}` : runtimeValue ?? appVersion,
      isRecord(system) || isRecord(version)
        ? runtimeValue || appVersion
          ? 'live'
          : 'unavailable'
        : 'pending',
      undefined,
      'surface'
    ),
  ]
}

function buildFingerprint(items: ShellStatusItem[]) {
  return JSON.stringify(items.map((item) => [item.key, item.value, item.source]))
}

export function useShellStatus() {
  return useQuery({
    queryKey: ['shell-status'],
    queryFn: async () => {
      const [status, workspace, system, sessionContext, version] = await Promise.allSettled([
        apiGet<unknown>('/api/status'),
        apiGet<unknown>('/api/workspace'),
        apiGet<unknown>('/api/system'),
        apiGet<unknown>('/api/session-context'),
        apiGet<unknown>('/api/version'),
      ])

      const statusValue = status.status === 'fulfilled' ? status.value : undefined
      const workspaceValue = workspace.status === 'fulfilled' ? workspace.value : undefined
      const systemValue = system.status === 'fulfilled' ? system.value : undefined
      const sessionContextValue = sessionContext.status === 'fulfilled' ? sessionContext.value : undefined
      const versionValue = version.status === 'fulfilled' ? version.value : undefined
      const parsedStatus = unwrapParsed(statusValue)
      const parsedWorkspace = unwrapParsed(workspaceValue)
      const parsedSystem = unwrapParsed(systemValue)
      const parsedSession = unwrapParsed(sessionContextValue)
      const parsedVersion = unwrapParsed(versionValue)
      const workspaceContext = parsedWorkspace ?? workspaceValue
      const sessionContextSnapshot = parsedSession ?? sessionContextValue
      const statusPayload = unwrapBridgePayload(statusValue)
      const items = [
        buildItem(
          'bridge',
          'Bridge',
          status.status === 'fulfilled' ||
            workspace.status === 'fulfilled' ||
            system.status === 'fulfilled' ||
            sessionContext.status === 'fulfilled' ||
            version.status === 'fulfilled'
            ? 'connected'
            : undefined,
          status.status === 'rejected' &&
          workspace.status === 'rejected' &&
          system.status === 'rejected' &&
          sessionContext.status === 'rejected' &&
          version.status === 'rejected'
            ? 'unavailable'
            : status.status === 'fulfilled' ||
                workspace.status === 'fulfilled' ||
                system.status === 'fulfilled' ||
                sessionContext.status === 'fulfilled' ||
                version.status === 'fulfilled'
              ? 'live'
              : 'pending',
          statusPayload?.ok === false ? 'warn' : status.status === 'fulfilled' ? 'live' : 'offline',
          'surface'
        ),
        parseChaos(parsedStatus ?? statusValue, sessionContextSnapshot),
        parseFocusIntent(workspaceContext, sessionContextSnapshot),
        ...parseEnvironmentStatus(parsedStatus ?? statusValue, parsedSystem ?? systemValue, parsedVersion ?? versionValue),
      ]

      return {
        items,
        fingerprint: buildFingerprint(items),
      }
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}