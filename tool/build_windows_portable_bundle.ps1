param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputDir = "",
  [string]$Version = "",
  [string]$PackageManager = "pnpm",
  [string]$NodeRuntimeDir,
  [int]$BackendPort = 8080,
  [int]$WebPort = 3000
)

$ErrorActionPreference = "Stop"

function Require-Path([string]$PathValue, [string]$Label) {
  if (-not (Test-Path $PathValue)) {
    throw "Missing $Label at $PathValue"
  }
}

function Copy-IfPresent([string]$Source, [string]$Destination) {
  if (Test-Path $Source) {
    Copy-Item -Path $Source -Destination $Destination -Recurse -Force
  }
}

function Get-BuildCommand([string]$Manager) {
  switch ($Manager.ToLowerInvariant()) {
    "pnpm" { return @{ FilePath = "pnpm"; Arguments = @("build") } }
    "npm" { return @{ FilePath = "npm"; Arguments = @("run", "build") } }
    "yarn" { return @{ FilePath = "yarn"; Arguments = @("build") } }
    "bun" { return @{ FilePath = "bun"; Arguments = @("run", "build") } }
    default { throw "Unsupported package manager '$Manager'. Use pnpm, npm, yarn, or bun." }
  }
}

function Get-SpriteCraftVersion([string]$PubspecPath) {
  $versionLine = Select-String -Path $PubspecPath -Pattern "^version:\s*(.+)$" | Select-Object -First 1
  if (-not $versionLine) {
    throw "Could not read SpriteCraft version from $PubspecPath"
  }

  return $versionLine.Matches[0].Groups[1].Value.Trim()
}

$resolvedRoot = (Resolve-Path $ProjectRoot).Path
$pubspecPath = Join-Path $resolvedRoot "pubspec.yaml"
$studioRoot = Join-Path $resolvedRoot "studio"
$lpcRoot = Join-Path $resolvedRoot "lpc-spritesheet-creator"
$nodeExe = Join-Path $NodeRuntimeDir "node.exe"
$effectiveVersion = if ($Version) { $Version } else { Get-SpriteCraftVersion $pubspecPath }

Require-Path $pubspecPath "pubspec.yaml"
Require-Path $studioRoot "studio app"
Require-Path $lpcRoot "LPC submodule"

if ([string]::IsNullOrWhiteSpace($NodeRuntimeDir)) {
  throw "Provide -NodeRuntimeDir pointing to a folder that contains node.exe."
}

Require-Path $nodeExe "Node runtime"

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $resolvedRoot "build\release\windows\SpriteCraft-win-x64-$effectiveVersion"
}

$backendOutputDir = Join-Path $OutputDir "runtime\backend"
$assetOutputDir = Join-Path $OutputDir "runtime\assets\lpc-spritesheet-creator"
$nodeOutputDir = Join-Path $OutputDir "runtime\node"
$webOutputDir = Join-Path $OutputDir "runtime\web"
$standaloneDir = Join-Path $studioRoot ".next\standalone"
$staticDir = Join-Path $studioRoot ".next\static"
$publicDir = Join-Path $studioRoot "public"
$definitionsDir = Join-Path $lpcRoot "sheet_definitions"
$spritesheetsDir = Join-Path $lpcRoot "spritesheets"
$creditsFile = Join-Path $lpcRoot "CREDITS.csv"

if (Test-Path $OutputDir) {
  Remove-Item -LiteralPath $OutputDir -Recurse -Force
}

New-Item -ItemType Directory -Path $backendOutputDir -Force | Out-Null
New-Item -ItemType Directory -Path $assetOutputDir -Force | Out-Null
New-Item -ItemType Directory -Path $nodeOutputDir -Force | Out-Null
New-Item -ItemType Directory -Path $webOutputDir -Force | Out-Null

Write-Host "Building SpriteCraft backend executable..."
& dart compile exe (Join-Path $resolvedRoot "bin\spritecraft.dart") -o (Join-Path $backendOutputDir "spritecraft.exe")
if ($LASTEXITCODE -ne 0) {
  throw "dart compile exe failed."
}

Write-Host "Building Studio standalone output..."
$previousLocation = Get-Location
$buildCommand = Get-BuildCommand $PackageManager
try {
  Set-Location $studioRoot
  $env:SKIP_ENV_VALIDATION = "1"
  & $buildCommand.FilePath @($buildCommand.Arguments)
  if ($LASTEXITCODE -ne 0) {
    throw "Studio build failed."
  }
} finally {
  Remove-Item Env:SKIP_ENV_VALIDATION -ErrorAction SilentlyContinue
  Set-Location $previousLocation
}

Require-Path $standaloneDir "Next standalone output"

Write-Host "Copying packaged runtime..."
Copy-Item -Path $nodeExe -Destination (Join-Path $nodeOutputDir "node.exe") -Force
Copy-Item -Path (Join-Path $standaloneDir "*") -Destination $webOutputDir -Recurse -Force

$packagedStaticRoot = Join-Path $webOutputDir ".next"
New-Item -ItemType Directory -Path $packagedStaticRoot -Force | Out-Null
Copy-IfPresent $staticDir (Join-Path $packagedStaticRoot "static")
Copy-IfPresent $publicDir (Join-Path $webOutputDir "public")

Write-Host "Copying support files..."
Copy-Item -Path $definitionsDir -Destination (Join-Path $assetOutputDir "sheet_definitions") -Recurse -Force
Copy-Item -Path $spritesheetsDir -Destination (Join-Path $assetOutputDir "spritesheets") -Recurse -Force
Copy-Item -Path $creditsFile -Destination (Join-Path $assetOutputDir "CREDITS.csv") -Force
Copy-Item -Path (Join-Path $resolvedRoot ".env.example") -Destination (Join-Path $OutputDir ".env.example") -Force
Copy-Item -Path (Join-Path $resolvedRoot "README.md") -Destination (Join-Path $OutputDir "README.md") -Force
Copy-Item -Path (Join-Path $resolvedRoot "docs") -Destination (Join-Path $OutputDir "docs") -Recurse -Force
Copy-Item -Path (Join-Path $resolvedRoot "packaging\windows\launch-spritecraft.ps1") -Destination (Join-Path $OutputDir "SpriteCraft Studio.ps1") -Force
Copy-Item -Path (Join-Path $resolvedRoot "packaging\windows\launch-spritecraft.cmd") -Destination (Join-Path $OutputDir "SpriteCraft Studio.cmd") -Force

$releaseNotesPath = Join-Path $resolvedRoot "docs\releases\$effectiveVersion.md"
if (Test-Path $releaseNotesPath) {
  Copy-Item -Path $releaseNotesPath -Destination (Join-Path $OutputDir "$effectiveVersion-release-notes.md") -Force
}

$manifest = [ordered]@{
  product = "SpriteCraft"
  version = $effectiveVersion
  platform = "windows-x64"
  shape = "portable-local-app"
  backendExecutable = "runtime/backend/spritecraft.exe"
  bundledLpcRoot = "runtime/assets/lpc-spritesheet-creator"
  webEntry = "runtime/web/server.js"
  bundledNode = "runtime/node/node.exe"
  backendPort = $BackendPort
  webPort = $WebPort
  builtAt = (Get-Date).ToString("o")
}

$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $OutputDir "spritecraft-release.json")

Write-Host ""
Write-Host "Portable SpriteCraft bundle created at:"
Write-Host "  $OutputDir"
