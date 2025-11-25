# Create keystore file (empty array)
$keystorePath = "$env:USERPROFILE\.sui\sui_config\sui.keystore"
"[]" | Out-File -FilePath $keystorePath -Encoding utf8 -NoNewline

# Create config file with proper YAML formatting
$configContent = @"
keystore: "$keystorePath"
active_address: ""
active_env: testnet
envs:
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io:443"
    ws: ~
"@

$configContent | Out-File -FilePath "$env:USERPROFILE\.sui\sui_config\client.yaml" -Encoding utf8

Write-Host "Config created. Now creating wallet address..."
sui client new-address ed25519

