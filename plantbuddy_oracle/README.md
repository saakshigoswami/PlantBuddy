# PlantBuddy Oracle - Move Smart Contract

This Move smart contract provides on-chain certification for PlantBuddy data blobs stored on Walrus.

## What It Does

- **Certifies Walrus Blobs**: Creates on-chain records linking Walrus blob IDs to creators
- **Tracks Metadata**: Stores title, description, data points, and size for each blob
- **Verification**: Allows verification of blob ownership and authenticity
- **Registry**: Maintains a registry of all certified blobs

## Contract Structure

- `PlantBuddyBlob`: On-chain object representing a certified blob
- `BlobRegistry`: Shared object tracking all certified blobs
- Events: `BlobCertified`, `BlobUpdated` for tracking

## Deployment Instructions

### Prerequisites

1. Install Sui CLI:
   ```bash
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
   ```

2. Create a Sui wallet (if you don't have one):
   ```bash
   sui client new-address ed25519
   ```

3. Get testnet SUI tokens:
   - Visit: https://discord.com/channels/916379725201563759/971488439931392130
   - Or use faucet: https://docs.sui.io/guides/developer/getting-started/get-coins

### Deploy to Sui Testnet

1. Set your active address:
   ```bash
   sui client active-address
   ```

2. Build the contract:
   ```bash
   sui move build
   ```

3. Deploy to testnet:
   ```bash
   sui client publish --gas-budget 100000000
   ```

4. **Save the Package ID** from the output! It will look like:
   ```
   Published Objects:
   Package ID: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```

5. Initialize the registry:
   ```bash
   sui client call --package <PACKAGE_ID> --module plantbuddy_blob --function init --gas-budget 10000000
   ```

### Deploy to Sui Mainnet

For mainnet deployment, use:
```bash
sui client publish --gas-budget 100000000 --network mainnet
```

## Usage in Frontend

After deployment, update `services/walrusUpload.ts` with your package ID:

```typescript
const PLANTBUDDY_PACKAGE_ID = "0xYOUR_PACKAGE_ID_HERE";
```

Then use the `certifyBlobOnChain` function to certify blobs after upload.

## Functions

### `certify_blob`
Certifies a Walrus blob on-chain. Creates a `PlantBuddyBlob` object.

**Parameters:**
- `walrus_blob_id`: The blob ID from Walrus
- `title`: Blob title
- `description`: Blob description  
- `data_points`: Number of data points
- `size_bytes`: Size in bytes
- `network`: "TESTNET" or "MAINNET"

### `update_blob_metadata`
Updates blob metadata (only creator can update).

### `verify_blob`
Verifies a blob belongs to a creator.

### `get_blob_info`
Returns blob information.

## Example Transaction

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module plantbuddy_blob \
  --function certify_blob \
  --args <REGISTRY_ID> "0xabc123..." "My Plant Session" "Session data..." 100 2048 "TESTNET" \
  --gas-budget 10000000
```

## Notes

- The registry must be initialized once before certifying blobs
- Each blob certification costs gas (SUI tokens)
- Blobs are owned by the creator and can be transferred
- The registry is a shared object accessible by anyone

