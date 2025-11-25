# PlantBuddy Oracle - Deployment Guide

Complete step-by-step guide to deploy the PlantBuddy Move contract and get your Package ID.

## Step 1: Install Sui CLI

### Windows (PowerShell)
```powershell
# Install Rust if you don't have it
# Download from: https://rustup.rs/

# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
```

### Mac/Linux
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
```

Verify installation:
```bash
sui --version
```

## Step 2: Set Up Sui Wallet

1. **Create a new address:**
   ```bash
   sui client new-address ed25519
   ```
   This will create a new address and set it as active.

2. **Get testnet SUI tokens:**
   - Visit Sui Discord: https://discord.com/channels/916379725201563759/971488439931392130
   - Or use faucet: https://docs.sui.io/guides/developer/getting-started/get-coins
   - Request tokens for your address

3. **Verify your balance:**
   ```bash
   sui client gas
   ```
   You need at least 0.1 SUI for deployment.

## Step 3: Deploy the Contract

1. **Navigate to the contract directory:**
   ```bash
   cd plantbuddy_oracle
   ```

2. **Build the contract:**
   ```bash
   sui move build
   ```
   If successful, you'll see: "Successfully built"

3. **Deploy to testnet:**
   ```bash
   sui client publish --gas-budget 100000000
   ```

4. **Save the Package ID:**
   The output will look like:
   ```
   Published Objects:
   Package ID: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```
   **COPY THIS PACKAGE ID!**

## Step 4: Initialize the Registry

After deployment, you need to initialize the registry:

```bash
sui client call \
  --package <YOUR_PACKAGE_ID> \
  --module plantbuddy_blob \
  --function init \
  --gas-budget 10000000
```

The output will show the Registry Object ID. **COPY THIS TOO!**

Example output:
```
Created Objects:
Registry ID: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

## Step 5: Configure Your Frontend

1. **Create a `.env` file in your project root:**
   ```env
   VITE_PLANTBUDDY_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
   VITE_PLANTBUDDY_REGISTRY_ID=0xYOUR_REGISTRY_ID_HERE
   ```

2. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## Step 6: Test Certification

1. Upload a blob through your PlantBuddy app
2. Check the browser console - you should see certification logs
3. Verify on Sui Explorer:
   - Go to: https://suiexplorer.com/
   - Search for your transaction digest
   - You should see the `BlobCertified` event

## Troubleshooting

### "Insufficient gas"
- Get more SUI tokens from the faucet
- Increase gas budget: `--gas-budget 200000000`

### "Package not found"
- Double-check the Package ID in your `.env` file
- Make sure you deployed to the correct network (testnet/mainnet)

### "Registry not initialized"
- Run the `init` function as shown in Step 4
- Make sure you're using the correct Registry ID

### "Transaction failed"
- Check Sui Explorer for error details
- Verify you have enough SUI for gas
- Make sure the registry object ID is correct

## Mainnet Deployment

For mainnet deployment:

```bash
sui client publish --gas-budget 100000000 --network mainnet
```

**Important:** Mainnet requires real SUI tokens. Make sure you have enough for gas fees.

## Verification

After deployment, verify your contract:

1. **Check package on Sui Explorer:**
   ```
   https://suiexplorer.com/object/<PACKAGE_ID>
   ```

2. **View registry:**
   ```
   https://suiexplorer.com/object/<REGISTRY_ID>
   ```

3. **Test certification:**
   - Upload a blob through your app
   - Check the transaction on Sui Explorer
   - Verify the `BlobCertified` event was emitted

## Next Steps

Once deployed:
- ✅ Your Package ID is ready to use
- ✅ Blobs will be certified on-chain
- ✅ You can verify blob ownership
- ✅ All certifications are publicly verifiable on Sui

## Support

If you encounter issues:
1. Check Sui documentation: https://docs.sui.io/
2. Join Sui Discord: https://discord.gg/sui
3. Review the Move contract code in `sources/plantbuddy_blob.move`

