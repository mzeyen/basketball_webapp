param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dev", "build", "start")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$nextBin = Join-Path $projectRoot "node_modules\.bin\next.cmd"
$nextDir = Join-Path $projectRoot ".next"

function Test-IsProjectPath {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return $false
  }

  try {
    $resolvedPath = (Resolve-Path $Path -ErrorAction Stop).Path
    return $resolvedPath.StartsWith($projectRoot, [StringComparison]::OrdinalIgnoreCase)
  } catch {
    return $false
  }
}

function Stop-ProjectNextProcesses {
  $processes = Get-CimInstance Win32_Process -Filter "name = 'node.exe' OR name = 'cmd.exe'" |
    Where-Object {
      $_.ProcessId -ne $PID -and
      $_.CommandLine -and
      $_.CommandLine.Contains($projectRoot) -and
      (
        $_.CommandLine.Contains("\next\") -or
        $_.CommandLine.Contains("/next/") -or
        $_.CommandLine.Contains(" next ") -or
        $_.CommandLine.Contains("npm.cmd")
      )
    }

  foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }

  Start-Sleep -Milliseconds 500
}

if (!(Test-Path $nextBin)) {
  throw "Next.js binary not found. Run npm.cmd install first."
}

Stop-ProjectNextProcesses

if ($Mode -eq "build") {
  if ((Test-Path $nextDir) -and (Test-IsProjectPath $nextDir)) {
    Remove-Item -LiteralPath $nextDir -Recurse -Force
  }

  & $nextBin build
  exit $LASTEXITCODE
}

if ($Mode -eq "start") {
  & $nextBin start --hostname 127.0.0.1 --port 3000
  exit $LASTEXITCODE
}

& $nextBin dev --hostname 127.0.0.1 --port 3000
exit $LASTEXITCODE
