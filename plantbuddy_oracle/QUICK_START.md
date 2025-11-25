# 🚀 PlantBuddy Oracle - Quick Start Guide

Follow these steps in order. I'll guide you through each one.

## ✅ Checklist

- [ ] Step 1: Install Visual Studio Build Tools
- [ ] Step 2: Install Rust
- [ ] Step 3: Install Sui CLI
- [ ] Step 4: Get Testnet SUI
- [ ] Step 5: Deploy Contract
- [ ] Step 6: Initialize Registry
- [ ] Step 7: Configure Frontend

---

## Step 1: Install Visual Studio Build Tools ⚙️

**This fixes the "Rust requires a linker" error you're seeing.**

### Quick Method (Recommended):

1. **Download Visual Studio Community** (FREE):
   - Go to: https://visualstudio.microsoft.com/downloads/
   - Click "Free download" under **Visual Studio Community 2022**

2. **Run the installer** and when it asks what to install:
   - ✅ Check **"Desktop development with C++"**
   - ✅ Make sure **"Windows 10/11 SDK"** is checked
   - Click **"Install"**

3. **Wait for installation** (~3-5 GB, 15-30 minutes)

4. **Restart your computer** (important!)

### Alternative - Minimal Install:

If you want a smaller download:
1. Go to: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Download "Build Tools for Visual Studio 2022"
3. Install with "C++ build tools" workload

**After installation, restart your computer, then continue to Step 2.**

---

## Step 2: Install Rust 🦀

1. **Download Rust installer:**
   - Go to: https://rustup.rs/
   - Click "Download rustup-init.exe" (Windows)

2. **Run the installer:**
   - Press **Enter** to proceed with default installation
   - Wait for it to finish

3. **Open a NEW PowerShell window** (important - close and reopen)

4. **Verify installation:**
   ```powershell
   rustc --version
   cargo --version
   ```
   Both should show version numbers (like `rustc 1.75.0`).

**If you see errors, make sure you:**
- Restarted your computer after Step 1
- Opened a NEW PowerShell window
- Visual Studio Build Tools are installed

---

## Step 3: Install Sui CLI 🔧

**This will take 10-30 minutes** (compiles from source).

1. **Open PowerShell** (as Administrator if possible)

2. **Run this command:**
   ```powershell
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
   ```

3. **Wait patiently** - it's compiling from source code
   - You'll see lots of compilation messages
   - This is normal!

4. **Verify installation:**
   ```powershell
   sui --version
   ```
   Should show: `sui 1.x.x` or similar

**If you get errors:**
- Make sure Visual Studio Build Tools are installed (Step 1)
- Make sure Rust is installed (Step 2)
- Try running PowerShell as Administrator
- Restart PowerShell and try again

---

## Step 4: Get Testnet SUI Tokens 💰

You need SUI tokens to pay for gas fees.

1. **Create a wallet address:**
   ```powershell
   sui client new-address ed25519
   ```
   This creates a new address. Save it!

2. **Get your address:**
   ```powershell
   sui client active-address
   ```
   Copy this address (starts with `0x`)

3. **Get testnet tokens** (choose one method):

   **Method A - Discord Faucet:**
   - Join Sui Discord: https://discord.gg/sui
   - Go to `#devnet-faucet` channel
   - Type: `!faucet YOUR_ADDRESS_HERE`
   - Wait a few minutes

   **Method B - Web Faucet:**
   - Visit: https://docs.sui.io/guides/developer/getting-started/get-coins
   - Enter your address
   - Click "Request Testnet Tokens"

4. **Check your balance:**
   ```powershell
   sui client gas
   ```
   You need at least **0.1 SUI** for deployment.

---

## Step 5: Deploy the Contract 📦

1. **Navigate to contract directory:**
   ```powershell
   cd C:\Users\10sak\Downloads\PlantBuddy\plantbuddy_oracle
   ```

2. **Build the contract:**
   ```powershell
   sui move build
   ```
   Should see: `✅ Successfully built`

3. **Deploy to testnet:**
   ```powershell
   sui client publish --gas-budget 100000000
   ```

4. **IMPORTANT - Save the Package ID:**
   Look for this in the output:
   ```
   Published Objects:
   Package ID: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```
   
   **COPY THE ENTIRE PACKAGE ID!** (It's a long hex string starting with `0x`)

---

## Step 6: Initialize Registry 📋

After deployment, you need to initialize the registry:

```powershell
sui client call --package <YOUR_PACKAGE_ID> --module plantbuddy_blob --function init --gas-budget 10000000
```

**Replace `<YOUR_PACKAGE_ID>` with the actual Package ID from Step 5.**

Example:
```powershell
sui client call --package 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef --module plantbuddy_blob --function init --gas-budget 10000000
```

**Save the Registry Object ID** from the output (also starts with `0x`).

---

## Step 7: Configure Frontend 🎨

1. **Create `.env` file** in your project root:
   - Location: `C:\Users\10sak\Downloads\PlantBuddy\.env`
   - Create this file if it doesn't exist

2. **Add these lines:**
   ```env
   VITE_PLANTBUDDY_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
   VITE_PLANTBUDDY_REGISTRY_ID=0xYOUR_REGISTRY_ID_HERE
   ```

   Replace `YOUR_PACKAGE_ID_HERE` and `YOUR_REGISTRY_ID_HERE` with the actual IDs from Steps 5 and 6.

3. **Save the file**

4. **Restart your dev server:**
   ```powershell
   npm run dev
   ```

---

## ✅ You're Done!

Now when you upload a blob through PlantBuddy:
1. It will be stored on Walrus ✅
2. It will be certified on-chain ✅
3. You'll get a transaction digest ✅

**Test it:**
- Upload a blob through your app
- Check the browser console for certification logs
- Verify on Sui Explorer: https://suiexplorer.com/

---

## 🆘 Need Help?

**Common Issues:**

1. **"Rust requires a linker"**
   → Install Visual Studio Build Tools (Step 1) and restart computer

2. **"cargo: command not found"**
   → Restart PowerShell after Rust installation

3. **"Insufficient gas"**
   → Get more SUI from faucet (Step 4)

4. **"Package not found"**
   → Double-check Package ID in `.env` file

5. **Build takes forever**
   → This is normal! Sui CLI compiles from source (10-30 min)

**Still stuck?** Check the detailed guides:
- `WINDOWS_SETUP.md` - Detailed Windows instructions
- `DEPLOYMENT_GUIDE.md` - Full deployment guide

