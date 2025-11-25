# Download Sui CLI - Step by Step

## Direct Download Links

**Latest Sui CLI for Windows:**
- GitHub Releases: https://github.com/MystenLabs/sui/releases
- Look for: `sui-{version}-x86_64-pc-windows-msvc.zip`

**Quick Download (if available):**
- Latest stable: https://github.com/MystenLabs/sui/releases/latest
- Download the file ending in `-x86_64-pc-windows-msvc.zip`

## Installation Steps

1. **Download the ZIP file** to your Downloads folder

2. **Extract the ZIP:**
   - Right-click → Extract All
   - You'll see `sui.exe` inside

3. **Copy to C:\sui:**
   - Create folder: `C:\sui`
   - Copy `sui.exe` to `C:\sui\sui.exe`

4. **Add to PATH:**
   - Press `Win + R` → type `sysdm.cpl` → Enter
   - Advanced tab → Environment Variables
   - System variables → Path → Edit
   - New → `C:\sui` → OK

5. **Restart PowerShell** and verify:
   ```powershell
   sui --version
   ```

## Alternative: Manual PATH Setup

If you prefer, you can also:
1. Keep `sui.exe` in any folder
2. Add that folder to PATH
3. Or use full path: `C:\sui\sui.exe`

