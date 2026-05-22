param(
    [switch]$Headed,
    [switch]$DemoOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$frontendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$verifier = Join-Path $frontendRoot "verification\selenium-verifier"
$envFile = Join-Path $verifier ".env"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "python is required to run Selenium verifier."
}

if (-not (Test-Path $envFile)) {
    throw "Missing $envFile. Copy .env.example to .env and fill local/deployed service URLs first."
}

Push-Location $verifier
try {
    if ($Headed) {
        $env:HEADLESS = "false"
    }
    if ($env:SELENIUM_DEMO_SLOW -match '^(1|true|yes|on)$') {
        if (-not $env:SLOW_MO_MS) {
            $env:SLOW_MO_MS = "800"
        }
        if (-not $env:HEADLESS) {
            $env:HEADLESS = "false"
        }
    }

    $pytestArgs = @("tests/test_live_verification.py", "-m", "live", "-s")
    if ($DemoOnly) {
        $pytestArgs += @("-k", "health_and_environment_sanity or login_catalog_with_configured_buyer or checkout_wallet_history_and_order_views")
    }

    python -m pytest @pytestArgs
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
