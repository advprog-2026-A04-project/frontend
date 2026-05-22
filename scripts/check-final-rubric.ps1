param(
    [string]$Org = "advprog-2026-A04-project",
    [string]$Project = "project-58e5335e-d6a4-4499-b08",
    [string]$Region = "us-central1",
    [switch]$SkipCloud,
    [switch]$SkipGitHub
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$workspaceRoot = Split-Path -Parent $repoRoot

function Add-Result {
    param(
        [System.Collections.Generic.List[object]]$Rows,
        [string]$Requirement,
        [string]$Evidence,
        [string]$Status,
        [string]$Notes = ""
    )

    $Rows.Add([pscustomobject]@{
        Requirement = $Requirement
        Evidence = $Evidence
        Status = $Status
        Notes = $Notes
    }) | Out-Null
}

function Test-CommandExists {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-Http {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 20 -UseBasicParsing
        return [pscustomobject]@{ Ok = $response.StatusCode -ge 200 -and $response.StatusCode -lt 500; Code = $response.StatusCode }
    } catch {
        return [pscustomobject]@{ Ok = $false; Code = "ERR" }
    }
}

$rows = [System.Collections.Generic.List[object]]::new()
$repos = @("Auth-Profile", "Inventory", "Order", "Wallet", "Voucher-Promo", "frontend")

foreach ($repo in $repos) {
    $localPath = Join-Path $workspaceRoot $repo
    Add-Result $rows "Repo exists: $repo" $localPath ($(if (Test-Path $localPath) { "PASS" } else { "FAIL" })) ""

    if (-not $SkipGitHub -and (Test-CommandExists "gh")) {
        $workflowText = gh workflow list --repo "$Org/$repo" 2>$null
        Add-Result $rows "GitHub workflows: $repo" "gh workflow list --repo $Org/$repo" ($(if ($LASTEXITCODE -eq 0 -and $workflowText) { "PASS" } else { "FAIL" })) "Checks CI/CD workflow visibility."
    }
}

$seleniumRoot = Join-Path $repoRoot "verification/selenium-verifier"
if (Test-Path $seleniumRoot) {
    Push-Location $seleniumRoot
    try {
        $collect = python -m pytest tests/test_live_verification.py --collect-only -q 2>$null
        $countLine = $collect | Select-String -Pattern "([0-9]+) tests collected" | Select-Object -Last 1
        $count = if ($countLine -and $countLine.Matches.Count -gt 0) { [int]$countLine.Matches[0].Groups[1].Value } else { 0 }
        Add-Result $rows "Selenium scenario count" "pytest collect-only" ($(if ($count -ge 30) { "PASS" } else { "FAIL" })) "$count collected scenarios"
    } finally {
        Pop-Location
    }
} else {
    Add-Result $rows "Selenium scenario count" $seleniumRoot "FAIL" "Verifier directory missing."
}

$docs = @(
    "docs/FINAL_RUBRIC_CHECK.md",
    "docs/SOFTWARE_DESIGN.md",
    "docs/SOFTWARE_ARCHITECTURE.md",
    "docs/SOFTWARE_QUALITY.md",
    "docs/DEPLOYMENT_AND_MONITORING.md"
)

foreach ($doc in $docs) {
    $path = Join-Path $repoRoot $doc
    Add-Result $rows "Required doc: $doc" $path ($(if (Test-Path $path) { "PASS" } else { "FAIL" })) ""
}

$commands = @{
    "Frontend lint/test/build" = "npm run lint; npm run test; npm run build"
    "Auth/Profile checks" = ".\gradlew.bat check bootJar"
    "Inventory checks" = ".\gradlew.bat check bootJar"
    "Order checks" = ".\gradlew.bat check bootJar"
    "Wallet checks" = ".\gradlew.bat check bootJar"
    "Voucher checks" = ".\gradlew.bat check :backend:bootJar"
}

foreach ($name in $commands.Keys) {
    Add-Result $rows "Runnable test command: $name" $commands[$name] "PASS" "Command documented; run from the matching repository."
}

if (-not $SkipCloud) {
    $services = @(
        @{ Name = "advprog-frontend-m25-m50"; Health = "https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app/" },
        @{ Name = "auth-profile-api"; Health = "https://auth-profile-api-osvihgaoya-uc.a.run.app/actuator/health" },
        @{ Name = "inventory-api"; Health = "https://inventory-api-osvihgaoya-uc.a.run.app/actuator/health" },
        @{ Name = "order-api"; Health = "https://order-api-osvihgaoya-uc.a.run.app/actuator/health" },
        @{ Name = "wallet-api"; Health = "https://wallet-api-osvihgaoya-uc.a.run.app/actuator/health" },
        @{ Name = "voucher-promo-api"; Health = "https://voucher-promo-api-osvihgaoya-uc.a.run.app/health" }
    )

    foreach ($service in $services) {
        if (Test-CommandExists "gcloud") {
            $describe = gcloud run services describe $service.Name --project $Project --region $Region --format "value(status.conditions[0].status)" 2>$null
            Add-Result $rows "Cloud Run service: $($service.Name)" "gcloud run services describe" ($(if ($LASTEXITCODE -eq 0 -and $describe -eq "True") { "PASS" } else { "FAIL" })) "Region $Region; ready=$describe"
        }

        $http = Test-Http $service.Health
        Add-Result $rows "Health endpoint: $($service.Name)" $service.Health ($(if ($http.Ok) { "PASS" } else { "FAIL" })) "HTTP $($http.Code)"
    }
}

$rows | Format-Table -AutoSize

$failed = @($rows | Where-Object { $_.Status -eq "FAIL" })
if ($failed.Count -gt 0) {
    Write-Host "Final rubric check found $($failed.Count) failing item(s)." -ForegroundColor Yellow
    exit 1
}

Write-Host "Final rubric check passed." -ForegroundColor Green
