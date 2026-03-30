param(
  [string]$BackendHost = "127.0.0.1",
  [int]$BackendPort = 8080,
  [int]$WebPort = 3000,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$bundleRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $bundleRoot "runtime"
$backendExe = Join-Path $runtimeRoot "backend\\spritecraft.exe"
$assetRoot = Join-Path $runtimeRoot "assets\\lpc-spritesheet-creator"
$nodeExe = Join-Path $runtimeRoot "node\\node.exe"
$webRoot = Join-Path $runtimeRoot "web"
$webEntry = Join-Path $webRoot "server.js"
$url = "http://127.0.0.1:$WebPort"

if (-not (Test-Path $backendExe)) {
  throw "Missing backend executable at $backendExe"
}

if (-not (Test-Path $nodeExe)) {
  throw "Missing bundled node runtime at $nodeExe"
}

if (-not (Test-Path $webEntry)) {
  throw "Missing packaged studio entrypoint at $webEntry"
}

if (-not (Test-Path $assetRoot)) {
  throw "Missing bundled LPC assets at $assetRoot"
}

$backendArgs = @(
  "studio",
  "--host", $BackendHost,
  "--port", "$BackendPort",
  "--no-open"
)

$webArgs = @(
  $webEntry,
  "--hostname", "127.0.0.1",
  "--port", "$WebPort"
)

$backendEnv = @{
  "SPRITECRAFT_LPC_ROOT" = $assetRoot
}

$backend = Start-Process -FilePath $backendExe -ArgumentList $backendArgs -WorkingDirectory $bundleRoot -Environment $backendEnv -PassThru
$web = Start-Process -FilePath $nodeExe -ArgumentList $webArgs -WorkingDirectory $webRoot -PassThru

Write-Host "SpriteCraft backend PID: $($backend.Id)"
Write-Host "SpriteCraft studio PID:  $($web.Id)"
Write-Host "SpriteCraft Studio URL:  $url"

if (-not $NoOpen) {
  Start-Process $url | Out-Null
}

Write-Host ""
Write-Host "Close the SpriteCraft backend and studio processes when you are done."
