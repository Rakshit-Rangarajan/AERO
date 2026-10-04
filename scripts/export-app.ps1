$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$standalone = Join-Path $root ".next\standalone"
$publicDir = Join-Path $root "public"
$staticDir = Join-Path $root ".next\static"
$distDir = Join-Path $root "dist"
$archive = Join-Path $distDir "aero-app.zip"

Push-Location $root
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Next.js standalone build failed with exit code $LASTEXITCODE." }
} finally {
  Pop-Location
}

if (!(Test-Path (Join-Path $standalone "server.js"))) { throw "Standalone server.js was not produced." }
$standaloneData = Join-Path $standalone "data"
if (Test-Path $standaloneData) {
  $resolvedData = (Resolve-Path -LiteralPath $standaloneData).Path
  $resolvedStandalone = (Resolve-Path -LiteralPath $standalone).Path
  if ($resolvedData -ne (Join-Path $resolvedStandalone "data")) { throw "Refusing to remove data outside the generated standalone output." }
  Remove-Item -LiteralPath $resolvedData -Recurse -Force
}
if (Test-Path $publicDir) { Copy-Item -LiteralPath $publicDir -Destination (Join-Path $standalone "public") -Recurse -Force }
if (Test-Path $staticDir) {
  $standaloneStatic = Join-Path $standalone ".next\static"
  New-Item -ItemType Directory -Path $standaloneStatic -Force | Out-Null
  Copy-Item -Path (Join-Path $staticDir "*") -Destination $standaloneStatic -Recurse -Force
}

$launcher = @'
@echo off
set HOSTNAME=127.0.0.1
if not defined PORT set PORT=3000
node server.js
'@
Set-Content -Path (Join-Path $standalone "start-app.cmd") -Value $launcher -Encoding ascii
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
Compress-Archive -Path (Join-Path $standalone "*") -DestinationPath $archive -Force
Write-Output "Exported standalone AERO app: $archive"
