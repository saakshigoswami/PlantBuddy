#!/bin/bash

# PlantBuddy Oracle Deployment Script
# This script builds and deploys the PlantBuddy Move contract to Sui

set -e

echo "🌱 PlantBuddy Oracle - Deployment Script"
echo "=========================================="
echo ""

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo "❌ Sui CLI not found. Please install it first:"
    echo "   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui"
    exit 1
fi

echo "✅ Sui CLI found"
echo ""

# Build the contract
echo "📦 Building Move contract..."
sui move build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Get active address
ACTIVE_ADDRESS=$(sui client active-address)
echo "📍 Active address: $ACTIVE_ADDRESS"
echo ""

# Ask for network
read -p "Select network (testnet/mainnet) [testnet]: " NETWORK
NETWORK=${NETWORK:-testnet}

if [ "$NETWORK" != "testnet" ] && [ "$NETWORK" != "mainnet" ]; then
    echo "❌ Invalid network. Use 'testnet' or 'mainnet'"
    exit 1
fi

echo ""
echo "🚀 Deploying to $NETWORK..."
echo ""

# Deploy
if [ "$NETWORK" == "mainnet" ]; then
    sui client publish --gas-budget 100000000 --network mainnet
else
    sui client publish --gas-budget 100000000
fi

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📝 IMPORTANT: Copy the Package ID from the output above!"
echo "   It will look like: 0x1234...abcd"
echo ""
echo "💡 Next steps:"
echo "   1. Save the Package ID to your .env or config file"
echo "   2. Initialize the registry:"
echo "      sui client call --package <PACKAGE_ID> --module plantbuddy_blob --function init --gas-budget 10000000"
echo ""

