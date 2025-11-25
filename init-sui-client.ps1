# Initialize Sui Client
$answers = @"
y
https://fullnode.testnet.sui.io:443
testnet
0
"@

$answers | sui client

# Now create a new address
sui client new-address ed25519

