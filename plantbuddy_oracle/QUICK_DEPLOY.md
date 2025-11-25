# Quick Deployment Guide - Using Pre-built Sui CLI

**Fastest way to get your Package ID without compilation issues!**

## Step 1: Download Pre-built Sui CLI (5 minutes)

1. **Go to Sui Releases:**
   - Visit: https://github.com/MystenLabs/sui/releases
   - Find the latest release (e.g., `v1.62.0`)
   - Download: `sui-{version}-x86_64-pc-windows-msvc.zip`

2. **Extract and Setup:**
   - Extract the ZIP file
   - You'll see `sui.exe` inside
   - Copy `sui.exe` to: `C:\sui\` (create this folder)

3. **Add to PATH:**
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find "Path" → Edit
   - Click "New" → Add: `C:\sui`
   - Click OK on all dialogs

4. **Verify Installation:**
   - Open a NEW PowerShell window
   - Run: `sui --version`
   - Should show: `sui 1.x.x`

## Step 2: Create Sui Wallet

1. **Create new address:**
   ```powershell
   sui client new-address ed25519
   ```
   This creates a wallet and sets it as active.

2. **Get your address:**
   ```powershell
   sui client active-address
   ```
   **Copy this address!**

3. **Get testnet SUI:**
   - Join Sui Discord: https://discord.gg/sui
   - Go to `#devnet-faucet` channel
   - Type: `!faucet YOUR_ADDRESS_HERE`
   - Wait 1-2 minutes

4. **Check balance:**
   ```powershell
   sui client gas
   ```
   You need at least 0.1 SUI.

## Step 3: Deploy Your Contract

1. **Navigate to contract:**
   ```powershell
   cd C:\Users\10sak\Downloads\PlantBuddy\plantbuddy_oracle
   ```

2. **Build contract:**
   ```powershell
   sui move build
   ```
   Should see: `✅ Successfully built`

3. **Deploy to testnet:**
   ```powershell
   sui client publish --gas-budget 100000000
   ```

4. **SAVE THE PACKAGE ID!**
   Look for this in the output:
   ```
   Published Objects:
   Package ID: 0x1234567890abcdef...
   ```
   **COPY THIS ENTIRE PACKAGE ID!**

## Step 4: Initialize Registry

```powershell
sui client call --package <YOUR_PACKAGE_ID> --module plantbuddy_blob --function init --gas-budget 10000000
```

Replace `<YOUR_PACKAGE_ID>` with your actual Package ID.

**SAVE THE REGISTRY ID** from the output!

## Step 5: Configure Frontend

1. **Create `.env` file** in project root:
   ```
   C:\Users\10sak\Downloads\PlantBuddy\.env
   ```

2. **Add your IDs:**
   ```env
   VITE_PLANTBUDDY_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
   VITE_PLANTBUDDY_REGISTRY_ID=0xYOUR_REGISTRY_ID_HERE
   ```

3. **Restart dev server:**
   ```powershell
   npm run dev
   ```

## ✅ Done!

Your Package ID is now configured. When you upload blobs, they'll be certified on-chain!

---

## Troubleshooting

**"sui: command not found"**
- Make sure you added `C:\sui` to PATH
- Restart PowerShell after adding to PATH

**"Insufficient gas"**
- Get more SUI from faucet
- Check: `sui client gas`

**"Package not found"**
- Double-check Package ID in `.env` file
- Make sure you deployed to testnet (not mainnet)

