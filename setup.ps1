<#
.SYNOPSIS
    ElderAssist AI - one-command setup for Windows (Docker Desktop + WSL2).

.DESCRIPTION
    Checks Docker Desktop and the WSL2 backend, writes your .env, brings up the
    core stack, pulls the local LLM model, and prints where to go next.
    Mirror of setup.sh for Windows PowerShell.

.PARAMETER Voice
    Also enable the voice profile (wake word + speech-to-text + text-to-speech).
.PARAMETER Inventory
    Also enable HomeBox.
.PARAMETER Grocy
    Also enable Grocy.
.PARAMETER WebUI
    Also enable Open WebUI.
.PARAMETER Vision
    Also pull the local vision model ("Read This For Me") and give the kiosk
    Ollama proxy a random key if one isn't set yet.
.PARAMETER All
    Enable every optional profile.
.PARAMETER NoPull
    Skip pulling the LLM model (do it later).

.EXAMPLE
    .\setup.ps1
.EXAMPLE
    .\setup.ps1 -Voice -Inventory
.EXAMPLE
    .\setup.ps1 -All
#>
[CmdletBinding()]
param(
    [switch]$Voice,
    [switch]$Inventory,
    [switch]$Grocy,
    [switch]$WebUI,
    [switch]$Vision,
    [switch]$All,
    [switch]$NoPull
)

$ErrorActionPreference = 'Stop'

# --- Locations -------------------------------------------------------------
$RepoRoot    = $PSScriptRoot
$ComposeFile = Join-Path $RepoRoot 'docker/docker-compose.yml'
$EnvFile     = Join-Path $RepoRoot '.env'
$EnvExample  = Join-Path $RepoRoot '.env.example'

function Info($m) { Write-Host "-> $m" -ForegroundColor Green }
function Warn($m) { Write-Host "!! $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "xx $m" -ForegroundColor Red; exit 1 }

if ($All) { $Voice = $true; $Inventory = $true; $Grocy = $true; $WebUI = $true; $Vision = $true }

Write-Host "ElderAssist AI setup (Windows)" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Write-Host ""

# --- 1. Check Docker -------------------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Warn "Docker is not installed."
    Write-Host "  Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    Write-Host "  During install, keep 'Use WSL 2 based engine' checked, then re-run .\setup.ps1"
    Die "Docker required."
}

# Compose plugin
try { docker compose version *> $null } catch { }
if ($LASTEXITCODE -ne 0) {
    Warn "The Docker Compose plugin was not found."
    Write-Host "  It ships with Docker Desktop - update/reinstall Docker Desktop."
    Die "Docker Compose plugin required."
}

# Daemon reachable
try { docker info *> $null } catch { }
if ($LASTEXITCODE -ne 0) {
    Warn "Docker is installed but not responding."
    Write-Host "  Start Docker Desktop and wait for it to say 'Engine running', then re-run."
    Die "Docker daemon not reachable."
}
Info "Docker is installed and responding."

# --- 2. Check WSL2 backend -------------------------------------------------
$wslOk = $false
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    try {
        $wslStatus = (wsl --status) 2>$null
        # Docker Desktop reports its backend here; any WSL2 default is fine.
        if ($LASTEXITCODE -eq 0) { $wslOk = $true }
    } catch { }
}
if ($wslOk) {
    Info "WSL2 is available (Docker Desktop uses the WSL2 backend)."
} else {
    Warn "Could not confirm the WSL2 backend."
    Write-Host "  Docker Desktop on Windows should use WSL2 (Settings > General >"
    Write-Host "  'Use the WSL 2 based engine'). If WSL is missing, run in an admin"
    Write-Host "  PowerShell:  wsl --install   then reboot."
}

# --- 3. Create .env if missing --------------------------------------------
if (-not (Test-Path $EnvFile)) {
    if (-not (Test-Path $EnvExample)) { Die "Missing $EnvExample" }
    Copy-Item $EnvExample $EnvFile
    Info "Created .env from .env.example"
} else {
    Info ".env already exists - keeping it"
}

# Helper: replace or append a KEY=value line in .env
function Set-EnvValue($key, $value) {
    $lines = Get-Content $EnvFile
    $found = $false
    $out = foreach ($line in $lines) {
        if ($line -match "^$key=") { $found = $true; "$key=$value" } else { $line }
    }
    if (-not $found) { $out += "$key=$value" }
    Set-Content -Path $EnvFile -Value $out -Encoding utf8
}

function Get-EnvValue($key, $default) {
    $line = (Get-Content $EnvFile | Where-Object { $_ -match "^$key=" } | Select-Object -Last 1)
    if ($line) { return ($line -replace "^$key=", '') }
    return $default
}

# --- 4. Timezone -----------------------------------------------------------
$currentTz = Get-EnvValue 'TZ' 'America/New_York'
$detectedTz = ''
try {
    # Windows uses its own tz ids; offer the .env value as the safe default and
    # let the user type an IANA name (e.g. America/New_York).
    $detectedTz = (Get-TimeZone).Id
} catch { }
$defaultTz = if ($currentTz) { $currentTz } else { 'America/New_York' }
$prompt = "Timezone (IANA name, e.g. America/New_York) [$defaultTz]"
if ($detectedTz) { Write-Host "  (Windows thinks you are in: $detectedTz - enter the matching IANA name)" }
$tzInput = Read-Host $prompt
$tzValue = if ([string]::IsNullOrWhiteSpace($tzInput)) { $defaultTz } else { $tzInput }
Set-EnvValue 'TZ' $tzValue
Info "Timezone: $tzValue"

# --- 5. Persist chosen profiles -------------------------------------------
$profiles = @()
if ($Voice)     { $profiles += 'voice' }
if ($Inventory) { $profiles += 'inventory' }
if ($Grocy)     { $profiles += 'grocy' }
if ($WebUI)     { $profiles += 'webui' }

if ($profiles.Count -gt 0) {
    $joined = ($profiles -join ',')
    Set-EnvValue 'COMPOSE_PROFILES' $joined
    Info "Profiles enabled: $joined"
} else {
    $existing = Get-EnvValue 'COMPOSE_PROFILES' ''
    if ($existing) { Info "Profiles enabled (from .env): $existing" }
    else { Info "Core stack only (no optional profiles)" }
}

# --- 6. Windows networking note -------------------------------------------
Warn "Windows note: Home Assistant host networking does not work on Docker Desktop."
Write-Host "   Edit docker/docker-compose.yml: comment 'network_mode: host' and"
Write-Host "   uncomment the 'ports:' and 'networks:' blocks in the homeassistant"
Write-Host "   service before HA will be reachable. See docs/INSTALL.md (Windows)."

# --- 7. Bring up the core stack -------------------------------------------
Write-Host ""
Info "Starting the stack (docker compose up -d)..."
docker compose --env-file $EnvFile -f $ComposeFile up -d
if ($LASTEXITCODE -ne 0) { Die "docker compose up failed. Check the output above." }

# --- 8. Wait for Ollama, then pull the model ------------------------------
$model = Get-EnvValue 'OLLAMA_MODEL' 'qwen3:8b'
Write-Host ""
Info "Waiting for Ollama to be ready..."
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    docker compose --env-file $EnvFile -f $ComposeFile exec -T ollama ollama list *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Warn "Ollama did not report ready in time. Check: docker compose logs ollama"
} elseif (-not $NoPull) {
    Info "Pulling LLM model '$model' (first run downloads several GB)..."
    docker compose --env-file $EnvFile -f $ComposeFile exec -T ollama ollama pull $model
    if ($LASTEXITCODE -ne 0) {
        Warn "Model pull failed. Retry later: docker compose exec ollama ollama pull $model"
    } else {
        Info "Model '$model' ready."
    }
} else {
    Info "Skipping model pull (-NoPull). Later: docker compose exec ollama ollama pull $model"
}

# --- 8b. Vision model + kiosk proxy key (-Vision) --------------------------
# Pull the local vision-language model for "Read This For Me", and make sure the
# kiosk's Ollama proxy has a key (generate a random one if it's blank), then
# recreate the kiosk container so the nginx template picks the key up.
if ($Vision) {
    Write-Host ""
    $currentKey = Get-EnvValue 'KIOSK_OLLAMA_KEY' ''
    if ([string]::IsNullOrEmpty($currentKey)) {
        $bytes = New-Object byte[] 16
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $newKey = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
        $envLines = Get-Content $EnvFile
        $envLines = $envLines | ForEach-Object {
            if ($_ -match '^KIOSK_OLLAMA_KEY=') { "KIOSK_OLLAMA_KEY=$newKey" } else { $_ }
        }
        Set-Content -Path $EnvFile -Value $envLines
        Info "Generated a random KIOSK_OLLAMA_KEY for the vision proxy."
        Write-Host "   Put this SAME value in pwa/config.js as vision.kioskKey to enable the camera button."
        docker compose --env-file $EnvFile -f $ComposeFile up -d kiosk *> $null
    } else {
        Info "KIOSK_OLLAMA_KEY already set - keeping it."
    }

    $visionModel = Get-EnvValue 'OLLAMA_VISION_MODEL' 'qwen2.5vl:7b'
    if (-not $ready) {
        Warn "Ollama isn't ready - skipping the vision model pull. Retry later:"
        Write-Host "   docker compose exec ollama ollama pull $visionModel"
    } elseif (-not $NoPull) {
        Info "Pulling vision model '$visionModel' (first run downloads several GB)..."
        docker compose --env-file $EnvFile -f $ComposeFile exec -T ollama ollama pull $visionModel
        if ($LASTEXITCODE -ne 0) {
            Warn "Vision model pull failed. Retry later: docker compose exec ollama ollama pull $visionModel"
        } else {
            Info "Vision model '$visionModel' ready."
        }
    } else {
        Info "Skipping vision model pull (-NoPull). Later: docker compose exec ollama ollama pull $visionModel"
    }
}

# --- 9. Next steps ---------------------------------------------------------
$haPort      = Get-EnvValue 'HA_PORT' '8123'
$kioskPort   = Get-EnvValue 'KIOSK_PORT' '8880'
$homeboxPort = Get-EnvValue 'HOMEBOX_PORT' '7745'
$grocyPort   = Get-EnvValue 'GROCY_PORT' '9283'
$webuiPort   = Get-EnvValue 'OPENWEBUI_PORT' '3000'

Write-Host ""
Write-Host "ElderAssist core is up." -ForegroundColor Green
Write-Host ""
Write-Host "Open these in a browser (use the hub's LAN IP from another device):"
Write-Host "  Home Assistant  http://localhost:$haPort   <- create the CAREGIVER admin account here first"
Write-Host "  Kiosk PWA       http://localhost:$kioskPort   <- the elder's six-button app"
if ($Inventory) { Write-Host "  HomeBox         http://localhost:$homeboxPort" }
if ($Grocy)     { Write-Host "  Grocy           http://localhost:$grocyPort" }
if ($WebUI)     { Write-Host "  Open WebUI      http://localhost:$webuiPort" }
Write-Host ""
Write-Host "Next, follow the guided setup: docs/INSTALL.md"
Write-Host "  1. Create the caregiver admin + restricted elder user in Home Assistant."
if ($Voice) { Write-Host "  2. Add the Wyoming voice integrations (whisper/piper/openwakeword) - see INSTALL.md." }
Write-Host "  . Set Ollama as HA's conversation agent, then bring in the agent layer (hermes/README.md)."
Write-Host ""
Write-Host "Useful commands: docker compose ps | docker compose logs -f | docker compose down"
