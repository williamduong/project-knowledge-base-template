param(
  [string]$VipePixPath = "D:\Source\vipepix\VipePix-Generation",
  [string]$PlatformPath = "D:\Source\saascore\platform-control-plane",
  [string]$AuthcorePath = "D:\Source\saascore\authcore"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logDir = Join-Path $PSScriptRoot "..\notes\orch-reports"
$logDir = [System.IO.Path]::GetFullPath($logDir)
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir "kbx-real-bughunt-$timestamp.log"

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -Path $logFile -Value $line
}

function Invoke-Step {
  param(
    [string]$RepoPath,
    [string]$Label,
    [string]$Command
  )

  Write-Log "[$Label] CMD: $Command"
  Push-Location $RepoPath
  try {
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $output = Invoke-Expression $Command 2>&1
      if ($output) {
        $output | Tee-Object -FilePath $logFile -Append | Out-Host
      }
      if ($LASTEXITCODE -ne 0) {
        Write-Log "[$Label] EXIT_CODE=$LASTEXITCODE"
      } else {
        Write-Log "[$Label] OK"
      }
    } finally {
      $ErrorActionPreference = $oldPreference
    }
  } catch {
    Write-Log "[$Label] EXCEPTION: $($_.Exception.Message)"
    Add-Content -Path $logFile -Value $_
  } finally {
    Pop-Location
  }
}

function Get-LatestBetaVersion {
  $json = npm view @williamduong/kbx dist-tags --json
  $tags = $json | ConvertFrom-Json
  if (-not $tags.beta) {
    throw "Cannot resolve npm beta dist-tag for @williamduong/kbx"
  }
  return [string]$tags.beta
}

function Ensure-GlobalKbxVersion {
  param([string]$TargetVersion)

  $cmd = Get-Command kbx -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Write-Log "Global kbx not found. Installing @williamduong/kbx@$TargetVersion"
    npm install -g "@williamduong/kbx@$TargetVersion" | Tee-Object -FilePath $logFile -Append | Out-Host
  } else {
    $current = (kbx --version).Trim()
    if ($current -ne $TargetVersion) {
      Write-Log "Global kbx version mismatch: current=$current target=$TargetVersion. Updating now."
      npm install -g "@williamduong/kbx@$TargetVersion" | Tee-Object -FilePath $logFile -Append | Out-Host
    } else {
      Write-Log "Global kbx already matches target version: $TargetVersion"
    }
  }

  $final = (kbx --version).Trim()
  if ($final -ne $TargetVersion) {
    throw "Global kbx version check failed after update. current=$final target=$TargetVersion"
  }
  Write-Log "Global kbx ready: $final"
}

function Test-VipePix {
  param([string]$RepoPath)
  Write-Log "==== Scenario: VipePix legacy KB upgrade ===="
  if (-not (Test-Path $RepoPath)) { throw "VipePix path not found: $RepoPath" }

  Invoke-Step -RepoPath $RepoPath -Label "vipepix-status-pre" -Command "kbx status --json"
  Invoke-Step -RepoPath $RepoPath -Label "vipepix-update" -Command "kbx update --accept-baseline --refresh-prompts"
  Invoke-Step -RepoPath $RepoPath -Label "vipepix-rules" -Command "kbx rules lint --json"
  Invoke-Step -RepoPath $RepoPath -Label "vipepix-doctor" -Command "kbx doctor --strict --json"
  Invoke-Step -RepoPath $RepoPath -Label "vipepix-test" -Command "kbx test --all"
}

function Test-PlatformControlPlane {
  param([string]$RepoPath)
  Write-Log "==== Scenario: New project bootstrap (no git/no KB) ===="
  if (-not (Test-Path $RepoPath)) { throw "Platform path not found: $RepoPath" }

  Push-Location $RepoPath
  try {
    if (-not (Test-Path ".git")) {
      Write-Log "Git not initialized. Running git init."
      git init | Tee-Object -FilePath $logFile -Append | Out-Host
    } else {
      Write-Log "Git repository already exists."
    }
  } finally {
    Pop-Location
  }

  Invoke-Step -RepoPath $RepoPath -Label "platform-init" -Command "kbx init --yes --mode tracked --skip-bootstrap"
  Invoke-Step -RepoPath $RepoPath -Label "platform-status" -Command "kbx status --json"
  Invoke-Step -RepoPath $RepoPath -Label "platform-rules" -Command "kbx rules lint --json"
  Invoke-Step -RepoPath $RepoPath -Label "platform-doctor" -Command "kbx doctor --strict --json"
  Invoke-Step -RepoPath $RepoPath -Label "platform-test" -Command "kbx test --all"
}

function Test-Authcore {
  param([string]$RepoPath)
  Write-Log "==== Scenario: Authcore merged mono-repo (multi-surface in one git) ===="
  if (-not (Test-Path $RepoPath)) { throw "Authcore path not found: $RepoPath" }

  $statePath = Join-Path $RepoPath ".git\project-kb\state.json"
  if (-not (Test-Path $statePath)) {
    Write-Log "KB state missing. Running first-time init in existing monorepo."
    Invoke-Step -RepoPath $RepoPath -Label "authcore-init" -Command "kbx init --yes --skip-bootstrap"
  } else {
    Write-Log "KB state detected: $statePath"
  }

  Invoke-Step -RepoPath $RepoPath -Label "authcore-workspace-detect" -Command "kbx workspace detect --json"
  Invoke-Step -RepoPath $RepoPath -Label "authcore-status" -Command "kbx status --json"
  Invoke-Step -RepoPath $RepoPath -Label "authcore-maintain" -Command "kbx maintain --fast"
  Invoke-Step -RepoPath $RepoPath -Label "authcore-rules" -Command "kbx rules lint --json"
  Invoke-Step -RepoPath $RepoPath -Label "authcore-doctor" -Command "kbx doctor --strict --json"
  Invoke-Step -RepoPath $RepoPath -Label "authcore-test" -Command "kbx test --all"
}

Write-Log "kbx real bughunt started."
$targetBeta = Get-LatestBetaVersion
Write-Log "npm beta target resolved: $targetBeta"
Ensure-GlobalKbxVersion -TargetVersion $targetBeta

Test-VipePix -RepoPath $VipePixPath
Test-PlatformControlPlane -RepoPath $PlatformPath
Test-Authcore -RepoPath $AuthcorePath

Write-Log "kbx real bughunt completed. Log file: $logFile"
