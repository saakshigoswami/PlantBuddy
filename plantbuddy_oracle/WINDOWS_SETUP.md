# Windows Setup Guide for PlantBuddy Oracle

Complete guide for Windows users to install all dependencies and deploy the contract.

## Step 1: Install Visual Studio Build Tools (Required for Rust)

You need Visual C++ build tools to compile Rust/Sui CLI on Windows.

### Option A: Quick Install (Recommended)
1. Download **Visual Studio Community** (free):
   - Go to: https://visualstudio.microsoft.com/downloads/
   - Download "Visual Studio Community 2022" (free)

2. During installation, select:
   - ✅ **Desktop development with C++** workload
   - ✅ **Windows 10/11 SDK** (latest version)
   - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools**

3. Click "Install" and wait for completion (~3-5 GB download)

### Option B: Minimal Install (Faster)
1. Download **Build Tools for Visual Studio**:
   - Go to: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Download "Build Tools for Visual Studio 2022"

2. During installation, select:
   - ✅ **C++ build tools** workload
   - ✅ **Windows 10/11 SDK**

### Verify Installation
After installation, restart your terminal/PowerShell and verify:
```powershell
cl
```
You should see Microsoft C/C++ compiler info (not an error).

## Step 2: Install Rust

1. **Download Rust installer:**
   - Go to: https://rustup.rs/
   - Download and run `rustup-init.exe`

2. **During installation:**
   - Press Enter to proceed with default installation
   - It will install to: `C:\Users\YourName\.cargo\bin`

3. **Verify installation:**
   Open a NEW PowerShell window and run:
   ```powershell
   rustc --version
   cargo --version
   ```
   Both should show version numbers.

## Step 3: Install Sui CLI

Open PowerShell (as Administrator recommended) and run:

```powershell
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
```

**This will take 10-30 minutes** (compiles from source).

### If you get errors:
- Make sure Visual Studio Build Tools are installed
- Restart PowerShell after installing build tools
- Try running PowerShell as Administrator

### Verify Sui CLI:
```powershell
sui --version
```
Should show: `sui 1.x.x` or similar

## Step 4: Set Up Sui Wallet

1. **Create a new address:**
   ```powershell
   sui client new-address ed25519
   ```
   This creates a new wallet address.

2. **Get your address:**
   ```powershell
   sui client active-address
   ```
   Copy this address - you'll need it for the faucet.

3. **Get testnet SUI tokens:**
   - **Option 1 - Discord Faucet:**
     - Join: https://discord.gg/sui
     - Go to #devnet-faucet channel
     - Type: `!faucet YOUR_ADDRESS_HERE`
   
   - **Option 2 - Web Faucet:**
     - Visit: https://docs.sui.io/guides/developer/getting-started/get-coins
     - Enter your address
     - Request testnet tokens

4. **Verify you received tokens:**
   ```powershell
   sui client gas
   ```
   You should see at least 0.1 SUI.

## Step 5: Deploy PlantBuddy Contract

1. **Navigate to contract directory:**
   ```powershell
   cd C:\Users\10sak\Downloads\PlantBuddy\plantbuddy_oracle
   ```

2. **Build the contract:**
   ```powershell
   sui move build
   ```
   Should see: `Successfully built`

3. **Deploy to testnet:**
   ```powershell
   sui client publish --gas-budget 100000000
   ```

4. **Save the Package ID:**
   Look for output like:
   ```
   Published Objects:
   Package ID: 0x1234567890abcdef...
   ```
   **COPY THIS ENTIRE PACKAGE ID!**

## Step 6: Initialize Registry

After deployment, initialize the registry:

```powershell
sui client call --package <YOUR_PACKAGE_ID> --module plantbuddy_blob --function init --gas-budget 10000000
```

Replace `<YOUR_PACKAGE_ID>` with the actual Package ID from Step 5.

**Save the Registry Object ID** from the output!

## Step 7: Configure Frontend

1. **Create `.env` file** in your project root (`C:\Users\10sak\Downloads\PlantBuddy\.env`):

   ```env
   VITE_PLANTBUDDY_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
   VITE_PLANTBUDDY_REGISTRY_ID=0xYOUR_REGISTRY_ID_HERE
   ```

2. **Restart your dev server:**
   ```powershell
   npm run dev
   ```

## Troubleshooting

### "Rust requires a linker"
- Install Visual Studio Build Tools (Step 1)
- Restart PowerShell after installation

### "cargo: command not found"
- Restart PowerShell after Rust installation
- Check: `$env:Path` should include `C:\Users\YourName\.cargo\bin`

### "Insufficient gas"
- Get more SUI from faucet
- Check balance: `sui client gas`

### "Package not found"
- Double-check Package ID in `.env` file
- Make sure you deployed to testnet (not mainnet)

### Build takes too long
- This is normal! Sui CLI compiles from source (10-30 minutes)
- Make sure you have stable internet connection

## Quick Reference Commands

```powershell
# Check versions
rustc --version
cargo --version
sui --version

# Sui wallet
sui client active-address
sui client gas
sui client new-address ed25519

# Contract deployment
cd plantbuddy_oracle
sui move build
sui client publish --gas-budget 100000000

# Initialize registry
sui client call --package <PACKAGE_ID> --module plantbuddy_blob --function init --gas-budget 10000000
```

## Next Steps

Once deployed:
1. ✅ Package ID saved
2. ✅ Registry initialized
3. ✅ `.env` file configured
4. ✅ Ready to certify blobs on-chain!

Test by uploading a blob through your PlantBuddy app and check the console for certification logs.

