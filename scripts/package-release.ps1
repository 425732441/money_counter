param(
  [switch]$SkipTauriBuild,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name. Install it or add it to PATH."
  }
}

function Invoke-External {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  Write-Host ""
  Write-Host ("> " + $Command + " " + ($Arguments -join " "))

  if ($DryRun) {
    return
  }

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command"
  }
}

function Assert-PathInsideProject {
  param(
    [string]$ProjectRoot,
    [string]$TargetPath
  )

  $projectFullPath = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
  $targetFullPath = [System.IO.Path]::GetFullPath($TargetPath)
  $expectedPrefix = $projectFullPath + [System.IO.Path]::DirectorySeparatorChar

  if (-not $targetFullPath.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe target path outside project: $targetFullPath"
  }
}

if (-not $SkipTauriBuild) {
  Assert-Command "npm"
}

$ProjectRoot = (Get-Location).Path
$Package = Get-Content (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
$Version = $Package.version

$ReleaseRoot = Join-Path $ProjectRoot "release"
$InstallerReleaseDir = Join-Path $ReleaseRoot "installer"
$PortableReleaseDir = Join-Path $ReleaseRoot "portable"

Assert-PathInsideProject $ProjectRoot $ReleaseRoot

if (-not $SkipTauriBuild) {
  Invoke-External "npm" @("run", "tauri", "--", "build")
}

$SourceInstaller = Join-Path $ProjectRoot "src-tauri/target/release/bundle/nsis/Money Counter Spike_${Version}_x64-setup.exe"
$SourcePortable = Join-Path $ProjectRoot "src-tauri/target/release/money-counter-spike.exe"
$InstallerName = "MoneyCounter-$Version-setup.exe"
$PortableName = "MoneyCounter-$Version-portable.exe"

if (-not (Test-Path -LiteralPath $SourceInstaller -PathType Leaf)) {
  throw "Installer not found: $SourceInstaller"
}

if (-not (Test-Path -LiteralPath $SourcePortable -PathType Leaf)) {
  throw "Portable executable not found: $SourcePortable"
}

if ($DryRun) {
  Write-Host "Would reset release directory: $ReleaseRoot"
  Write-Host "Would copy installer: $InstallerName"
  Write-Host "Would copy portable executable: $PortableName"
  return
}

if (Test-Path -LiteralPath $ReleaseRoot) {
  Remove-Item -LiteralPath $ReleaseRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $InstallerReleaseDir, $PortableReleaseDir | Out-Null
Copy-Item -LiteralPath $SourceInstaller -Destination (Join-Path $InstallerReleaseDir $InstallerName) -Force
Copy-Item -LiteralPath $SourcePortable -Destination (Join-Path $PortableReleaseDir $PortableName) -Force

Write-Host ""
Write-Host "Release package created:"
Write-Host "  installer/$InstallerName"
Write-Host "  portable/$PortableName"
