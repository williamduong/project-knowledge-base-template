$rawInput = [Console]::In.ReadToEnd()

if ([string]::IsNullOrWhiteSpace($rawInput)) {
    exit 0
}

try {
    $payload = $rawInput | ConvertFrom-Json
} catch {
    '{"continue":true,"systemMessage":"Revision state guard could not parse hook input; allowing execution."}'
    exit 0
}

function Write-SessionMessage {
    param(
        [string]$Message
    )

    @{
        hookSpecificOutput = @{
            hookEventName = 'SessionStart'
            additionalContext = $Message
        }
    } | ConvertTo-Json -Depth 10 -Compress
}

function Write-ToolDecision {
    param(
        [ValidateSet('allow', 'deny', 'ask')]
        [string]$Decision,
        [string]$Reason,
        [string]$AdditionalContext = ''
    )

    $output = @{
        hookSpecificOutput = @{
            hookEventName = 'PreToolUse'
            permissionDecision = $Decision
            permissionDecisionReason = $Reason
        }
    }

    if ($AdditionalContext) {
        $output.hookSpecificOutput.additionalContext = $AdditionalContext
    }

    $output | ConvertTo-Json -Depth 10 -Compress
}

function Get-StateField {
    param(
        [string]$StateText,
        [string]$FieldName
    )

    foreach ($line in ($StateText -split "`r?`n")) {
        if ($line -match '^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$') {
            if ($matches[1].Trim() -eq $FieldName) {
                return $matches[2].Trim()
            }
        }
    }

    return $null
}

function Test-BroadTask {
    param(
        [string]$TranscriptText
    )

    if ([string]::IsNullOrWhiteSpace($TranscriptText)) {
        return $false
    }

    $pattern = '(?is)\b(upgrade|migration|migrate|maintain|maintenance|sweep|audit|refresh|sync|drift|reconcile|version\s+patch|patch\s+revision|kb\s+patch|repo-wide|repository-wide|knowledge\s+base|broad\s+edit|nang\s+cap|bao\s+tri|dong\s+bo|ra\s+soat|quet)\b'
    return [regex]::IsMatch($TranscriptText, $pattern)
}

function Test-ReadOnlyTool {
    param(
        [string]$ToolName
    )

    if ([string]::IsNullOrWhiteSpace($ToolName)) {
        return $true
    }

    return $ToolName -match '^(read_|file_search|grep_search|list_dir|fetch_webpage|get_|view_|open_browser_page|read_page|terminal_|semantic_search|memory|resolve_memory_file_uri|copilot_getNotebookSummary|read_notebook_cell_output)$'
}

function Test-GuardBypassTarget {
    param(
        [string]$ToolInputJson
    )

    if ([string]::IsNullOrWhiteSpace($ToolInputJson)) {
        return $false
    }

    return $ToolInputJson -match 'repository-revision-state\.md|finalization-plan\.md|\.github[\\/]hooks|revision-state-guard\.ps1'
}

function Test-GitHistoryReviewed {
    param(
        [string]$TranscriptText
    )

    if ([string]::IsNullOrWhiteSpace($TranscriptText)) {
        return $false
    }

    $hasLog = $TranscriptText -match 'git\s+log'
    $hasDiff = $TranscriptText -match 'git\s+diff'
    return $hasLog -and $hasDiff
}

$cwd = if ($payload.cwd) { [string]$payload.cwd } else { (Get-Location).Path }
$hookEventName = [string]$payload.hookEventName
$toolName = [string]$payload.tool_name
$transcriptPath = [string]$payload.transcript_path
$toolInputJson = ''

if ($payload.PSObject.Properties.Name -contains 'tool_input') {
    $toolInputJson = $payload.tool_input | ConvertTo-Json -Depth 20 -Compress
}

$stateRelativePath = '00-start-here/repository-revision-state.md'
$statePath = Join-Path $cwd $stateRelativePath
$transcriptText = ''

if ($transcriptPath -and (Test-Path $transcriptPath)) {
    $transcriptText = Get-Content -Path $transcriptPath -Raw -ErrorAction SilentlyContinue
}

if ($hookEventName -eq 'SessionStart') {
    if (Test-Path $statePath) {
        $stateText = Get-Content -Path $statePath -Raw -ErrorAction SilentlyContinue
        $templateVersion = Get-StateField -StateText $stateText -FieldName 'KB Template Version'
        $patchRevision = Get-StateField -StateText $stateText -FieldName 'KB Patch Revision'
        $baseline = Get-StateField -StateText $stateText -FieldName 'Source Repository Git Baseline'
        $brandScope = Get-StateField -StateText $stateText -FieldName 'Brand Scope'
        $message = "Revision guard active. Read $stateRelativePath before broad maintenance, migration, or upgrade work. Current template=$templateVersion, patch=$patchRevision, brand=$brandScope, baseline=$baseline."
        Write-SessionMessage -Message $message
        exit 0
    }

    Write-SessionMessage -Message "Revision guard active. Create or restore $stateRelativePath before broad maintenance, migration, or upgrade work."
    exit 0
}

if ($hookEventName -ne 'PreToolUse') {
    exit 0
}

if (Test-ReadOnlyTool -ToolName $toolName) {
    Write-ToolDecision -Decision 'allow' -Reason 'Read-only tool allowed.'
    exit 0
}

$isBroadTask = Test-BroadTask -TranscriptText $transcriptText
$touchesGuardFiles = Test-GuardBypassTarget -ToolInputJson $toolInputJson

if (-not $isBroadTask -or $touchesGuardFiles) {
    Write-ToolDecision -Decision 'allow' -Reason 'Guard skipped for non-broad task or guard file update.'
    exit 0
}

if (-not (Test-Path $statePath)) {
    Write-ToolDecision -Decision 'deny' -Reason "Read or restore $stateRelativePath before broad mutating work."
    exit 0
}

$stateText = Get-Content -Path $statePath -Raw -ErrorAction SilentlyContinue
$stateWasRead = $transcriptText -match 'repository-revision-state\.md|Repository Revision State'

if (-not $stateWasRead) {
    Write-ToolDecision -Decision 'deny' -Reason "Read $stateRelativePath before broad mutating work." -AdditionalContext 'The repository requires revision-state review before maintenance, migration, upgrade, or repo-wide edits.'
    exit 0
}

$gitDirectory = Join-Path $cwd '.git'
if (-not (Test-Path $gitDirectory)) {
    Write-ToolDecision -Decision 'allow' -Reason 'No git repository detected; placeholders may remain explicit.'
    exit 0
}

$currentHead = ''
try {
    $currentHead = (git -C $cwd rev-parse HEAD 2>$null).Trim()
} catch {
    $currentHead = ''
}

if ([string]::IsNullOrWhiteSpace($currentHead)) {
    Write-ToolDecision -Decision 'ask' -Reason 'Could not resolve current HEAD; confirm revision state manually before broad mutating work.'
    exit 0
}

$baseline = Get-StateField -StateText $stateText -FieldName 'Source Repository Git Baseline'

if ([string]::IsNullOrWhiteSpace($baseline) -or $baseline -eq 'NOT_AVAILABLE') {
    Write-ToolDecision -Decision 'deny' -Reason "Initialize Source Repository Git Baseline in $stateRelativePath before broad mutating work." -AdditionalContext "Current HEAD is $currentHead."
    exit 0
}

if ($baseline -ne $currentHead) {
    $gitHistoryReviewed = Test-GitHistoryReviewed -TranscriptText $transcriptText
    if (-not $gitHistoryReviewed) {
        $reason = "Source drift detected: baseline $baseline differs from HEAD $currentHead. Review git log and git diff, update queue, then continue."
        Write-ToolDecision -Decision 'deny' -Reason $reason -AdditionalContext 'Run the drift reconciliation flow from repository-revision-state.md before broad edits.'
        exit 0
    }

    $reason = 'Git drift evidence was reviewed in this session; broad mutating work may continue.'
    Write-ToolDecision -Decision 'allow' -Reason $reason -AdditionalContext "Remember to update $stateRelativePath and KB Patch Revision after reconciliation."
    exit 0
}

Write-ToolDecision -Decision 'allow' -Reason 'Revision baseline is aligned with HEAD.'