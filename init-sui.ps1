# Initialize Sui Client properly
$ErrorActionPreference = "Stop"

Write-Host "Initializing Sui client..."
Write-Host ""

# Create the config directory
$configDir = "$env:USERPROFILE\.sui\sui_config"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

# Create an empty keystore file (JSON array)
$keystorePath = Join-Path $configDir "sui.keystore"
"[]" | Set-Content -Path $keystorePath -Encoding UTF8 -NoNewline

# Create a minimal config file
$configPath = Join-Path $configDir "client.yaml"
$keystorePathEscaped = $keystorePath -replace '\\', '\\'
$configContent = @"
keystore: "$keystorePathEscaped"
active_address: ""
active_env: testnet
envs:
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io:443"
    ws: ~
"@

$configContent | Set-Content -Path $configPath -Encoding UTF8

Write-Host "Config files created. Testing..."
sui client envs

Write-Host ""
Write-Host "Now creating a new address..."
sui client new-address ed25519

