$configPath = "$env:USERPROFILE\.sui\sui_config\client.yaml"
$keystorePath = "$env:USERPROFILE\.sui\sui_config\sui.keystore"

# Ensure keystore file exists with empty array
"[]" | Set-Content -Path $keystorePath -Encoding UTF8 -NoNewline

# Create YAML config - File must be unquoted
$yaml = @"
keystore: File
active_address: ""
active_env: testnet
envs:
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io:443"
    ws: ~
"@

# Write without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($configPath, $yaml, $utf8NoBom)

Write-Host "Config created. Testing..."
sui client new-address ed25519

