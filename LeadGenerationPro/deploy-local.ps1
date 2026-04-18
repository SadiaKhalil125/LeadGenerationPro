# Local Deployment Script for Lead Generation System
# This script clones or pulls the required project, installs dependencies, and starts every required service.

Set-StrictMode -Version 3
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# --- Function Definitions ---
function Get-NpmCommand {
    if (-not $script:npmCommand) {
        foreach ($name in @("npm.cmd","npm")) {
            $cmd = Get-Command $name -ErrorAction SilentlyContinue
            if ($cmd) {
                $script:npmCommand = $cmd.Source
                break
            }
        }
        if (-not $script:npmCommand) {
            $script:npmCommand = "npm"
        }
    }
    return $script:npmCommand
}

function Test-Command {
    param([Parameter(Mandatory)][string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Ensure-VirtualEnv {
    $needsCreate = -not (Test-Path $venvPython)

    if (-not $needsCreate) {
        try {
            & $venvPython --version > $null 2>&1
        } catch {
            Write-Host "Virtual environment is invalid. Recreating..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force $venvDir -ErrorAction SilentlyContinue
            $needsCreate = $true
        }
    }

    if ($needsCreate) {
        Write-Host "Creating Python virtual environment (venv)..." -ForegroundColor Yellow
        & python -m venv $venvDir
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to create virtual environment. Ensure Python is installed." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Virtual environment found." -ForegroundColor Green
    }
}

function Ensure-BackendDependencies {
    if (-not (Test-Path $backendRequirements)) {
        Write-Host "ERROR: Cannot find requirements.txt at $backendRequirements" -ForegroundColor Red
        exit 1
    }

    Ensure-VirtualEnv
    Write-Host "Installing backend Python dependencies (pip install -r requirements.txt)..." -ForegroundColor Yellow
    & $venvPython -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to upgrade pip inside the virtual environment." -ForegroundColor Red
        exit 1
    }

    & $venvPython -m pip install -r $backendRequirements
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install backend dependencies." -ForegroundColor Red
        exit 1
    }

    Write-Host "Backend dependencies installed." -ForegroundColor Green
}

function Ensure-FrontendDependencies {
    Push-Location $frontendDir
    $npmExe = Get-NpmCommand
    if (Test-Path $frontendNodeModules) {
        Write-Host "Frontend dependencies already installed (node_modules exists)." -ForegroundColor Green
    } else {
        Write-Host "Installing frontend dependencies (npm install)..." -ForegroundColor Yellow
        & $npmExe install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: npm install failed." -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Write-Host "Frontend dependencies installed." -ForegroundColor Green
    }
    Pop-Location
}

function Wait-ForKafka {
    Write-Host "Waiting for Kafka to be ready..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Test-NetConnection -ComputerName localhost -Port 9092 -WarningAction SilentlyContinue
            if ($response.TcpTestSucceeded) {
                Write-Host "Kafka is ready!" -ForegroundColor Green
                Start-Sleep -Seconds 2
                return $true
            }
        } catch { }
        $attempt++
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Warning: Kafka may not be fully ready, but continuing..." -ForegroundColor Yellow
    return $false
}

function Wait-ForAPIServer {
    Write-Host "Waiting for API server to be ready on port 8000..." -ForegroundColor Yellow
    $maxAttempts = 45
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Test-NetConnection -ComputerName localhost -Port 8000 -WarningAction SilentlyContinue
            if ($response.TcpTestSucceeded) {
                foreach ($path in @("/docs","/")) {
                    try {
                        $null = Invoke-WebRequest -Uri "$apiBaseUrl$path" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
                        Write-Host "API server is ready!" -ForegroundColor Green
                        return $true
                    } catch { }
                }
            }
        } catch { }
        $attempt++
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Warning: API server may not be fully ready, but continuing..." -ForegroundColor Yellow
    return $false
}

function Wait-ForFrontend {
    Write-Host "Waiting for frontend dev server on port $frontendPort..." -ForegroundColor Yellow
    $maxAttempts = 45
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        try {
            $response = Test-NetConnection -ComputerName localhost -Port $frontendPort -WarningAction SilentlyContinue
            if ($response.TcpTestSucceeded) {
                try {
                    $null = Invoke-WebRequest -Uri "http://localhost:$frontendPort" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
                    Write-Host "Frontend server is ready!" -ForegroundColor Green
                    return $true
                } catch { }
            }
        } catch { }
        $attempt++
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Warning: Frontend may not be fully ready, but continuing..." -ForegroundColor Yellow
    return $false
}

$script:apiProcess = $null
$script:workerProcess = $null
$script:statusProcess = $null
$script:frontendProcess = $null

function Cleanup {
    Write-Host ""
    Write-Host "Cleaning up processes..." -ForegroundColor Yellow
    
    if ($script:apiProcess -and !$script:apiProcess.HasExited) { Stop-Process -Id $script:apiProcess.Id -Force -ErrorAction SilentlyContinue; Write-Host "Stopped API server" -ForegroundColor Gray }
    if ($script:statusProcess -and !$script:statusProcess.HasExited) { Stop-Process -Id $script:statusProcess.Id -Force -ErrorAction SilentlyContinue; Write-Host "Stopped status updater" -ForegroundColor Gray }
    if ($script:frontendProcess -and !$script:frontendProcess.HasExited) { Stop-Process -Id $script:frontendProcess.Id -Force -ErrorAction SilentlyContinue; Write-Host "Stopped frontend" -ForegroundColor Gray }

    Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*startup*" -or $_.MainWindowTitle -like "*worker*" -or $_.MainWindowTitle -like "*status*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "Cleanup complete." -ForegroundColor Green
}

Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null


# --- Main Execution ---

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Lead Generation System - Full Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 0: Prerequisite Check & Project Cloning/Pulling ---
$repoUrl = "https://github.com/SadiaKhalil125/LeadGenerationPro.git"
$projectDirName = "LeadGenerationPro"
$clonedRepoPath = Join-Path (Get-Location) $projectDirName

Write-Host "Checking for prerequisites..." -ForegroundColor Cyan
$missing = @()
foreach ($cmd in @("git", "docker","python","npm","kubectl")) {
    if (-not (Test-Command $cmd)) {
        $missing += $cmd
    }
}
if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing prerequisites -> $($missing -join ', ')." -ForegroundColor Red; exit 1
}
Write-Host "All prerequisites found!" -ForegroundColor Green
Write-Host ""

# === Pull latest code if repo exists, otherwise clone it ===
if (Test-Path $clonedRepoPath) {
    Write-Host "Project directory '$projectDirName' already exists." -ForegroundColor Green
    Push-Location $clonedRepoPath
    Write-Host "Pulling latest changes from the repository..." -ForegroundColor Yellow
    git pull
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: 'git pull' failed. Continuing with existing code." -ForegroundColor Yellow
    } else {
        Write-Host "Repository updated successfully." -ForegroundColor Green
    }
    Pop-Location
} else {
    Write-Host "Cloning project from $repoUrl..." -ForegroundColor Yellow
    git clone $repoUrl $projectDirName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to clone the git repository." -ForegroundColor Red; exit 1
    }
    Write-Host "Project cloned successfully." -ForegroundColor Green
}
Write-Host ""

Set-Location $clonedRepoPath
$script:projectRoot = $clonedRepoPath
$nestedProjectDir = Join-Path $script:projectRoot $projectDirName
if (Test-Path $nestedProjectDir) {
    Write-Host "Detected nested project directory. Adjusting root path..." -ForegroundColor Yellow
    $script:projectRoot = $nestedProjectDir
    Set-Location $script:projectRoot
    Write-Host "New project root: $script:projectRoot" -ForegroundColor Green
    Write-Host ""
}

# --- Variable Definitions ---
$backendDir = Join-Path $script:projectRoot "lead_generation_backend"
$frontendDir = Join-Path $script:projectRoot "lead_generation_frontend"
$venvDir = Join-Path $script:projectRoot "venv"
$venvScriptsDir = Join-Path $venvDir "Scripts"
$venvPython = Join-Path $venvScriptsDir "python.exe"
$backendRequirements = Join-Path $backendDir "requirements.txt"
$frontendNodeModules = Join-Path $frontendDir "node_modules"
$apiBaseUrl = "http://127.0.0.1:8000"
$frontendPort = 5173
$frontendUrl = "http://localhost:$frontendPort"
$script:npmCommand = $null

# --- Dependency Installation ---
Write-Host "Setting up backend environment..." -ForegroundColor Cyan
Ensure-BackendDependencies
Write-Host ""

Write-Host "Setting up frontend environment..." -ForegroundColor Cyan
Ensure-FrontendDependencies
Write-Host ""

# --- Service Deployment ---
Write-Host "Step 1: Starting Kafka service..." -ForegroundColor Cyan
Write-Host "Pulling Kafka image: apache/kafka:latest..." -ForegroundColor Yellow
docker pull apache/kafka:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to pull apache/kafka:latest image." -ForegroundColor Red
    exit 1
}
Write-Host "Kafka image pulled successfully." -ForegroundColor Green

$kafkaContainer = docker ps -a --filter "name=broker" --format "{{.Names}}"
if ($kafkaContainer -eq "broker") {
    $running = docker ps --filter "name=broker" --format "{{.Names}}"
    if ($running -ne "broker") {
        Write-Host "Starting existing Kafka container..." -ForegroundColor Yellow; docker start broker | Out-Null
    } else { Write-Host "Kafka container is already running." -ForegroundColor Green }
} else {
    Write-Host "Creating and running Kafka container..." -ForegroundColor Yellow
    # --- UPDATED KAFKA COMMAND AS REQUESTED ---
    docker run -d --name broker -p 9092:9092 -p 9093:9093 `
        -e KAFKA_NODE_ID=1 `
        -e KAFKA_PROCESS_ROLES=broker,controller `
        -e KAFKA_LISTENERS=PLAINTEXT_LOCAL://0.0.0.0:9092,PLAINTEXT_DOCKER://0.0.0.0:9093,CONTROLLER://:9094 `
        -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT_LOCAL://localhost:9092,PLAINTEXT_DOCKER://host.docker.internal:9093 `
        -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER `
        -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT_LOCAL:PLAINTEXT,PLAINTEXT_DOCKER:PLAINTEXT `
        -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT_LOCAL `
        -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9094 `
        -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 `
        -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 `
        -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 `
        -e KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0 `
        -e KAFKA_NUM_PARTITIONS=2 `
        apache/kafka:latest | Out-Null
}
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Unable to start Kafka container." -ForegroundColor Red; exit 1 }
Wait-ForKafka
Write-Host ""

Write-Host "Step 2: Setting up Kubernetes worker deployment..." -ForegroundColor Cyan

$k8sContext = "docker-desktop"
Write-Host "Verifying Kubernetes context '$k8sContext'..." -ForegroundColor Yellow
$allContexts = kubectl config get-contexts -o name
if ($allContexts -contains $k8sContext) {
    kubectl config use-context $k8sContext
    Write-Host "Kubernetes context set to '$k8sContext'." -ForegroundColor Green
} else {
    Write-Host "ERROR: Kubernetes context '$k8sContext' not found." -ForegroundColor Red
    Write-Host "Please ensure your kubeconfig is set up correctly with the '$k8sContext' context." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

Push-Location $backendDir
Write-Host "Building Docker image: sadia2004/scraping-worker:latest..." -ForegroundColor Yellow
docker build -t sadia2004/scraping-worker:latest -f Dockerfile.worker .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build Docker image." -ForegroundColor Red
    Pop-Location
    exit 1
} else {
    Write-Host "Docker image built successfully." -ForegroundColor Green
}
Pop-Location
Write-Host ""

$k8sDir = Join-Path $backendDir "k8s"
$namespaceYaml = Join-Path $k8sDir "namespace.yaml"
$workerServiceYaml = Join-Path $k8sDir "worker-service.yaml"

kubectl apply -f $namespaceYaml
Write-Host "Namespace created/updated." -ForegroundColor Green
Write-Host ""

Write-Host "Creating RDS credentials secret..." -ForegroundColor Yellow
$dbPassword = $env:DB_PASSWORD
if (-not $dbPassword) { $dbPassword = "9042c98a" }
kubectl delete secret rds-credentials -n scraping-system --ignore-not-found=$true | Out-Null
kubectl create secret generic rds-credentials --from-literal=password="$dbPassword" -n scraping-system
Write-Host "Secret created successfully." -ForegroundColor Green
Write-Host ""

kubectl apply -f $workerServiceYaml
Write-Host "Worker service deployed successfully." -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Starting backend services..." -ForegroundColor Cyan
Push-Location $backendDir
Write-Host "Starting API server (startup.py)..." -ForegroundColor Yellow

# --- UPDATED STARTUP: Using cmd /k to keep window open on error ---
$script:apiProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$venvPython`" startup.py" -WorkingDirectory $backendDir -WindowStyle Normal -PassThru

Write-Host "API server (PID: $($script:apiProcess.Id))" -ForegroundColor Gray
if (-not (Wait-ForAPIServer)) { 
    Write-Host "ERROR: API server did not become ready." -ForegroundColor Red
    Write-Host "PLEASE CHECK THE OPEN 'cmd' WINDOW FOR PYTHON ERRORS." -ForegroundColor Red
    Cleanup
    exit 1 
}
Write-Host ""

Write-Host "Skipping local worker (worker.py) as requested." -ForegroundColor Yellow

Write-Host "Starting status updater (status_updater.py)..." -ForegroundColor Yellow
$script:statusProcess = Start-Process -FilePath $venvPython -ArgumentList "status_updater.py" -WorkingDirectory $backendDir -WindowStyle Normal -PassThru
Write-Host "Status updater (PID: $($script:statusProcess.Id))" -ForegroundColor Gray
Pop-Location
Write-Host "Backend services started!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Starting frontend..." -ForegroundColor Cyan
Push-Location $frontendDir
$npmExe = Get-NpmCommand
$script:frontendProcess = Start-Process -FilePath $npmExe -ArgumentList @("run","dev","--","--port",$frontendPort,"--strictPort") -WorkingDirectory $frontendDir -WindowStyle Normal -PassThru
Write-Host "Frontend (PID: $($script:frontendProcess.Id))" -ForegroundColor Gray
Pop-Location
Write-Host "Giving Vite time to compile..." -ForegroundColor Gray; Start-Sleep -Seconds 5
if (-not (Wait-ForFrontend)) { Write-Host "ERROR: Frontend dev server did not become ready." -ForegroundColor Red; Cleanup; exit 1 }
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  - Kafka:    localhost:9092"
Write-Host "  - API:      $apiBaseUrl"
Write-Host "  - Frontend: $frontendUrl"
Write-Host "Opening browser tabs..." -ForegroundColor Cyan
Start-Process "$apiBaseUrl/docs" -ErrorAction SilentlyContinue
Start-Process $frontendUrl -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Press Ctrl+C in this window to stop all services." -ForegroundColor Yellow
Write-Host ""

try { while ($true) { Start-Sleep -Seconds 1 } } catch { Write-Host "Shutting down..." -ForegroundColor Yellow; Cleanup }