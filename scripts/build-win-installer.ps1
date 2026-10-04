$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$nodeVersion = "22.23.3"
$nodeFolder = "node-v$nodeVersion-win-x64"
$cacheDir = Join-Path $root "dist\cache"
$runtimeRoot = Join-Path $root "dist\runtime"
$runtimeDir = Join-Path $runtimeRoot $nodeFolder
$nodeZip = Join-Path $cacheDir "$nodeFolder.zip"
$standalone = Join-Path $root ".next\standalone"
$stage = Join-Path $root "dist\win-app"

New-Item -ItemType Directory -Path $cacheDir,$runtimeRoot -Force | Out-Null
if (!(Test-Path (Join-Path $runtimeDir "node.exe"))) {
  $checksumsUrl = "https://nodejs.org/dist/v$nodeVersion/SHASUMS256.txt"
  $checksums = (Invoke-WebRequest -Uri $checksumsUrl -UseBasicParsing).Content
  $checksumLine = $checksums -split "`n" | Where-Object { $_ -match "\s$([regex]::Escape($nodeFolder)).zip\s*$" } | Select-Object -First 1
  if (!$checksumLine) { throw "Node.js $nodeVersion x64 ZIP checksum was not found on nodejs.org." }
  $expectedHash = ($checksumLine.Trim() -split "\s+")[0].ToLowerInvariant()
  if (!(Test-Path $nodeZip)) {
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v$nodeVersion/$nodeFolder.zip" -OutFile $nodeZip
  }
  $actualHash = (Get-FileHash -LiteralPath $nodeZip -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $expectedHash) { Remove-Item -LiteralPath $nodeZip -Force; throw "Bundled Node.js ZIP checksum mismatch." }
  Expand-Archive -LiteralPath $nodeZip -DestinationPath $runtimeRoot -Force
}

Push-Location $root
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Next.js standalone build failed with exit code $LASTEXITCODE." }
} finally { Pop-Location }

if (!(Test-Path (Join-Path $standalone "server.js"))) { throw "Next.js standalone server was not produced." }
$staticSource = Join-Path $root ".next\static"
if (Test-Path $staticSource) {
  $staticDestination = Join-Path $standalone ".next\static"
  New-Item -ItemType Directory -Path $staticDestination -Force | Out-Null
  Copy-Item -Path (Join-Path $staticSource "*") -Destination $staticDestination -Recurse -Force
}
$publicSource = Join-Path $root "public"
if (Test-Path $publicSource) { Copy-Item -LiteralPath $publicSource -Destination (Join-Path $standalone "public") -Recurse -Force }

if (Test-Path $stage) {
  $resolvedStage = (Resolve-Path -LiteralPath $stage).Path
  $resolvedDist = (Resolve-Path -LiteralPath (Join-Path $root "dist")).Path
  if (!$resolvedStage.StartsWith($resolvedDist, [StringComparison]::OrdinalIgnoreCase)) { throw "Refusing to remove staging output outside dist." }
  Remove-Item -LiteralPath $resolvedStage -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $stage "electron") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root "electron\main.cjs") -Destination (Join-Path $stage "electron\main.cjs")
$appManifest = @{ name="aero-desktop"; version="0.1.0"; description="AERO engineering operations workspace"; author="AERO"; private=$true; main="electron/main.cjs" } | ConvertTo-Json
# electron-builder parses this file as JSON, so it must be written without a byte-order mark.
[System.IO.File]::WriteAllText((Join-Path $stage "package.json"), $appManifest, (New-Object System.Text.UTF8Encoding($false)))

Push-Location $root
try {
  npx electron-builder --win nsis --x64 --config electron-builder.yml
  if ($LASTEXITCODE -ne 0) { throw "Windows installer build failed with exit code $LASTEXITCODE." }
} finally { Pop-Location }

$installer = Join-Path $root "dist\installer\AERO-Setup-0.1.0-x64.exe"
if (!(Test-Path $installer)) { throw "The Windows installer was not created at $installer." }
Write-Output "Created self-contained Windows installer: $installer"
