# Rebuild branch `stable` from first commit (67e6fb6) by replaying the v0.1 line
# (commits 741df50 then 5da7c44). Tags: v0.1.0, v0.2.0 (semver v0.0.0 style).
#
# Conflict policy (cherry-pick): prefer "theirs" (incoming commit), except .gitignore uses "ours".
#
# Requires Git for Windows. Run from repo root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stable-rebuild.ps1
#
# Note: PowerShell parameter must not be named $Args (reserved); see Invoke-Git.
param(
  [string]$GitExe = "C:\Program Files\Git\bin\git.exe",
  [string]$Repo = (Resolve-Path "$PSScriptRoot\..").Path
)

function Invoke-Git {
  param([string[]]$GitArguments)
  & $GitExe -C $Repo @GitArguments
  if ($LASTEXITCODE -ne 0) { throw "git $($GitArguments -join ' ') failed ($LASTEXITCODE)" }
}

function Get-CommitFileSummary {
  param([string]$Sha)
  $names = Invoke-Git @("diff-tree", "--no-commit-id", "--name-only", "-r", $Sha)
  $lines = @($names | Where-Object { $_ -and $_.Trim() })
  if ($lines.Count -eq 0) { return "(sem arquivos)" }
  $dirs = @{}
  foreach ($f in $lines) {
    $p = Split-Path $f -Parent
    if (-not $p) { $p = "." }
    $key = ($p -split '[\\/]')[0]
    if (-not $dirs.ContainsKey($key)) { $dirs[$key] = 0 }
    $dirs[$key]++
  }
  $parts = foreach ($k in ($dirs.Keys | Sort-Object)) { "$k ($($dirs[$k]) arq.)" }
  return ($parts -join "; ")
}

function Resolve-CherryPickConflicts-TheirsExceptGitignore {
  $conflicted = Invoke-Git @("diff", "--name-only", "--diff-filter=U")
  foreach ($path in $conflicted) {
    if (-not $path) { continue }
    if ($path -eq ".gitignore") {
      Invoke-Git @("checkout", "--ours", "--", $path)
    } else {
      Invoke-Git @("checkout", "--theirs", "--", $path)
    }
  }
  Invoke-Git @("add", "-A")
}

function CherryPickWithMessage {
  param([string]$Sha, [string]$Title)
  $summary = Get-CommitFileSummary $Sha
  & $GitExe -C $Repo cherry-pick -n $Sha
  if ($LASTEXITCODE -ne 0) {
    $conflicted = @(& $GitExe -C $Repo diff --name-only --diff-filter=U)
    if ($conflicted.Count -gt 0) {
      Resolve-CherryPickConflicts-TheirsExceptGitignore
    } else {
      throw "cherry-pick -n $Sha failed (exit $LASTEXITCODE) sem conflitos listáveis."
    }
  }
  $body = "Resumo (arquivos): $summary`nOrigem: $Sha"
  Invoke-Git @("commit", "-m", $Title, "-m", $body)
}

Set-Location $Repo
# Só bloqueia mudanças em arquivos rastreados; pastas novas (ex.: scripts/) não impedem o rebuild.
$dirty = Invoke-Git @("status", "--porcelain", "--untracked-files=no")
if ($dirty) { throw "Há alterações em arquivos rastreados. Faça commit ou stash antes." }

$null = & $GitExe -C $Repo rev-parse --verify refs/heads/stable 2>$null
if ($LASTEXITCODE -eq 0) {
  throw "Branch stable already exists. Delete or rename it first if you want to rebuild."
}

Invoke-Git @("checkout", "-b", "stable", "67e6fb6")

# v0.1 line: v1.0.1 then MongoDB / tooling (tip of v0.1)
CherryPickWithMessage "741df50" "v0.1.0 - baseline v1.0.1: API, admin, testes, docs"
Invoke-Git @("tag", "-a", "v0.1.0", "-m", "Release v0.1.0 - baseline v1.0.1")

CherryPickWithMessage "5da7c44" "v0.2.0 - MongoDB, Husky, commitlint, build e servidor"
Invoke-Git @("tag", "-a", "v0.2.0", "-m", "Release v0.2.0 - stack v0.1 MongoDB e tooling")

Write-Host "Done. Branch stable at:" (Invoke-Git @("rev-parse", "HEAD"))
Invoke-Git @("log", "--oneline", "-5")
