[CmdletBinding()]
param(
    [switch] $SkipInstall,
    [switch] $SkipBuild,
    [string] $WorkspaceRoot
)

$ErrorActionPreference = "Stop"

function Write-Status {
    param([Parameter(Mandatory = $true)][string] $Message)
    [Console]::Error.WriteLine("[originpro-mcp] $Message")
}

function Assert-Command {
    param([Parameter(Mandatory = $true)][string] $Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found on PATH."
    }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot "..")

Set-Location $repoRoot

Write-Status "Starting from repository root."
Assert-Command "node"
Assert-Command "npm"

$nodeVersion = (& node --version).Trim()
$npmVersion = (& npm --version).Trim()
Write-Status "Node $nodeVersion, npm $npmVersion."

if ($WorkspaceRoot) {
    $resolvedWorkspaceRoot = Resolve-Path $WorkspaceRoot
    $env:ORIGIN_MCP_WORKDIR = $resolvedWorkspaceRoot.Path
    Write-Status "Using ORIGIN_MCP_WORKDIR from -WorkspaceRoot."
} elseif ($env:ORIGIN_MCP_WORKDIR) {
    Write-Status "Using existing ORIGIN_MCP_WORKDIR."
} else {
    Write-Status "Using current working directory as the MCP workspace."
}

if (-not $SkipInstall) {
    if (-not (Test-Path (Join-Path $repoRoot "node_modules"))) {
        Write-Status "Installing npm dependencies."
        npm install
    } else {
        Write-Status "Dependencies already installed."
    }
}

if (-not $SkipBuild) {
    Write-Status "Building TypeScript project."
    npm run build
}

Write-Status "Launching OriginPro MCP server on stdio. Keep this window open."
npm start
