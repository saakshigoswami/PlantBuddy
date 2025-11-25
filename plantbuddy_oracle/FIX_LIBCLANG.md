# Fix libclang Error for Sui CLI Installation

The error you're seeing means the build system can't find `libclang.dll`, which is needed to compile Sui CLI.

## Quick Fix: Install LLVM

### Option 1: Install LLVM (Recommended)

1. **Download LLVM for Windows:**
   - Go to: https://github.com/llvm/llvm-project/releases
   - Or use the official installer: https://releases.llvm.org/download.html
   - Download: **LLVM-XX.X.X-win64.exe** (latest version, e.g., LLVM-18.1.0-win64.exe)

2. **Install LLVM:**
   - Run the installer
   - **IMPORTANT:** During installation, check:
     - ✅ **Add LLVM to system PATH**
   - Install to default location: `C:\Program Files\LLVM`

3. **Restart PowerShell** (close and reopen)

4. **Verify LLVM is installed:**
   ```powershell
   clang --version
   ```
   Should show Clang version info.

5. **Set Environment Variable (if needed):**
   ```powershell
   $env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
   ```
   
   Or set it permanently:
   - Open System Properties → Environment Variables
   - Add new System Variable:
     - Name: `LIBCLANG_PATH`
     - Value: `C:\Program Files\LLVM\bin`

6. **Try installing Sui CLI again:**
   ```powershell
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
   ```

### Option 2: Use Pre-built Sui Binary (Easier!)

Instead of compiling from source, you can download a pre-built binary:

1. **Download Sui CLI binary:**
   - Go to: https://github.com/MystenLabs/sui/releases
   - Download: `sui-{version}-x86_64-pc-windows-msvc.zip` (latest release)
   - Extract the ZIP file

2. **Add to PATH:**
   - Copy `sui.exe` to a folder (e.g., `C:\sui\`)
   - Add that folder to your System PATH:
     - System Properties → Environment Variables
     - Edit "Path" variable
     - Add: `C:\sui\`

3. **Verify:**
   ```powershell
   sui --version
   ```

### Option 3: Use WSL (Windows Subsystem for Linux)

If the above doesn't work, you can use WSL:

1. Install WSL: `wsl --install`
2. Install Rust in WSL: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. Install Sui CLI in WSL: `cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui`

## Recommended: Use Pre-built Binary

For Windows, I **strongly recommend Option 2** (pre-built binary) because:
- ✅ No compilation needed (saves 30+ minutes)
- ✅ No libclang dependency issues
- ✅ Faster and more reliable
- ✅ Same functionality

After installing Sui CLI (any method), continue with the deployment guide!

