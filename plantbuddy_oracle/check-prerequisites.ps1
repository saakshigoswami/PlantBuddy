# PlantBuddy Oracle - Prerequisites Checker
# Run this script to check what's installed

Write-Host "🔍 Checking Prerequisites for PlantBuddy Oracle..." -ForegroundColor Cyan
Write-Host ""

# Check Rust
Write-Host "1. Checking Rust..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version 2>&1
    Write-Host "   ✅ Rust installed: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Rust NOT installed" -ForegroundColor Red
    Write-Host "      → Download from: https://rustup.rs/" -ForegroundColor Gray
}

# Check Cargo
Write-Host ""
Write-Host "2. Checking Cargo..." -ForegroundColor Yellow
try {
    $cargoVersion = cargo --version 2>&1
    Write-Host "   ✅ Cargo installed: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Cargo NOT installed" -ForegroundColor Red
    Write-Host "      → Install Rust first (includes Cargo)" -ForegroundColor Gray
}

# Check Visual C++ Compiler
Write-Host ""
Write-Host "3. Checking Visual C++ Build Tools..." -ForegroundColor Yellow
try {
    $clVersion = cl 2>&1
    if ($clVersion -match "Microsoft") {
        Write-Host "   ✅ Visual C++ Build Tools installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Visual C++ Build Tools NOT found" -ForegroundColor Red
        Write-Host "      → Download from: https://visualstudio.microsoft.com/downloads/" -ForegroundColor Gray
        Write-Host "      → Select 'Desktop development with C++' workload" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Visual C++ Build Tools NOT installed" -ForegroundColor Red
    Write-Host "      → Download from: https://visualstudio.microsoft.com/downloads/" -ForegroundColor Gray
    Write-Host "      → Select 'Desktop development with C++' workload" -ForegroundColor Gray
}

# Check Sui CLI
Write-Host ""
Write-Host "4. Checking Sui CLI..." -ForegroundColor Yellow
try {
    $suiVersion = sui --version 2>&1
    Write-Host "   ✅ Sui CLI installed: $suiVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Sui CLI NOT installed" -ForegroundColor Red
    Write-Host "      → Install after Rust: cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui" -ForegroundColor Gray
}

# Check Sui Wallet
Write-Host ""
Write-Host "5. Checking Sui Wallet Configuration..." -ForegroundColor Yellow
try {
    $activeAddress = sui client active-address 2>&1
    if ($activeAddress -match "0x") {
        Write-Host "   ✅ Sui wallet configured: $activeAddress" -ForegroundColor Green
        
        # Check gas balance
        $gas = sui client gas 2>&1
        Write-Host "   Gas balance:" -ForegroundColor Yellow
        Write-Host $gas -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Sui wallet not configured" -ForegroundColor Yellow
        Write-Host "      → Run: sui client new-address ed25519" -ForegroundColor Gray
    }
} catch {
Write-Host "   WARNING: Sui wallet not configured" -ForegroundColor Yellow
        Write-Host "      -> Configure after installing Sui CLI" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   If you see ❌, install those components first" -ForegroundColor Yellow
Write-Host "   Follow the guide in QUICK_START.md" -ForegroundColor Yellow
Write-Host ""

