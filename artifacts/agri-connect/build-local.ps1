# ============================================================
#  Phytoclinic - Local Android Build (Windows PowerShell)
#  Run from: artifacts\agri-connect\
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================" -ForegroundColor Green
Write-Host "  Phytoclinic - Local Build" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""

# Set EXPO_TOKEN
$env:EXPO_TOKEN = Read-Host "Collez votre EXPO_TOKEN (compte phytoclinic-build)"

# Check Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERREUR: Node.js non installe. Telechargez sur https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "OK Node.js: $(node --version)" -ForegroundColor Green

# Check Java
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "ERREUR: Java non installe. Telechargez JDK 17 sur https://adoptium.net" -ForegroundColor Red
    exit 1
}
Write-Host "OK Java: $(java -version 2>&1 | Select-String 'version')" -ForegroundColor Green

# Check ANDROID_HOME
if (-not $env:ANDROID_HOME) {
    $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $sdkPath) {
        $env:ANDROID_HOME = $sdkPath
        Write-Host "OK Android SDK: $sdkPath" -ForegroundColor Green
    } else {
        Write-Host "ERREUR: Android SDK non trouve. Installez Android Studio." -ForegroundColor Red
        Write-Host "Puis relancez ce script." -ForegroundColor Yellow
        exit 1
    }
}

# Install pnpm + eas-cli if needed
Write-Host ""
Write-Host "--> Installation des outils..." -ForegroundColor Cyan
npm install -g pnpm eas-cli 2>$null
Write-Host "OK pnpm et eas-cli installes" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "--> Installation des dependances (pnpm install)..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\.."
pnpm install
Pop-Location

# Create output folder
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\build-output" | Out-Null

# Build AAB (Play Store)
Write-Host ""
Write-Host "--> Build AAB pour Google Play Store..." -ForegroundColor Cyan
Push-Location $PSScriptRoot
eas build --platform android --profile production --local --non-interactive --output ".\build-output\phytoclinic-production.aab"
Pop-Location
Write-Host "OK AAB genere: artifacts\agri-connect\build-output\phytoclinic-production.aab" -ForegroundColor Green

# Build APK
Write-Host ""
Write-Host "--> Build APK (installation directe)..." -ForegroundColor Cyan
Push-Location $PSScriptRoot
eas build --platform android --profile preview --local --non-interactive --output ".\build-output\phytoclinic-preview.apk"
Pop-Location
Write-Host "OK APK genere: artifacts\agri-connect\build-output\phytoclinic-preview.apk" -ForegroundColor Green

Write-Host ""
Write-Host "==============================" -ForegroundColor Green
Write-Host "  Build termine!" -ForegroundColor Green
Write-Host "  Fichiers dans: artifacts\agri-connect\build-output\" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Open output folder
explorer "$(Resolve-Path "$PSScriptRoot\build-output")"
