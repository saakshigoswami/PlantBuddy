
// src/services/walrusUpload.ts
// Walrus Upload Service (REST API Implementation)

import type { WalrusNetwork } from './walrusService';

const WALRUS_AGGREGATOR = {
  TESTNET: 'https://aggregator.walrus-testnet.walrus.space',
  MAINNET: 'https://aggregator.walrus.space'
};

const WALRUS_PUBLISHERS: Record<WalrusNetwork, string[]> = {
  TESTNET: [
    'https://publisher.walrus-testnet.walrus.space',
    'https://walrus-testnet-publisher.nodes.guru',
    'https://walrus-testnet-publisher.everstake.one',
    'https://publisher.testnet.walrus.atalma.io',
    'https://walrus-testnet-publisher.stakely.io',
  ],
  MAINNET: [
    'https://publisher.walrus.space',
  ]
};

const EPOCHS = 1;

/**
 * Upload session data to Walrus via the Publisher REST API.
 * Handles CORS retries and network selection.
 * 
 * @param sessionData - JSON-serializable object
 * @param walletAdapter - wallet adapter object (unused in REST upload, but kept for signature if needed later)
 * @param network - 'TESTNET' | 'MAINNET'
 */
export async function uploadSessionViaWalrusSDK(
  sessionData: any, 
  walletAdapter: any, 
  network: WalrusNetwork = 'TESTNET'
) {
  const payload = typeof sessionData === "string" ? sessionData : JSON.stringify(sessionData);
  const publishers = WALRUS_PUBLISHERS[network] || WALRUS_PUBLISHERS.TESTNET;

  console.log(`Initiating upload to Walrus ${network}...`);

  for (let i = 0; i < publishers.length; i++) {
    const publisher = publishers[i];
    const url = `${publisher}/v1/blobs?epochs=${EPOCHS}`;
    try {
      console.log(`Attempting Walrus publisher ${i + 1}/${publishers.length}: ${url}`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn(`Publisher ${publisher} failed: ${response.status} ${text}`);
        continue;
      }

      const result = await response.json();
      const blobId = result.newlyCreated?.blobObject?.blobId ||
                     result.newlyCreated?.blobId ||
                     result.alreadyCertified?.blobId ||
                     result.blobId;

      if (!blobId) {
        console.error("Unexpected Walrus response:", result);
        throw new Error("Upload successful but no blob ID returned.");
      }

      const walrusUrl = `${WALRUS_AGGREGATOR[network] || WALRUS_AGGREGATOR.TESTNET}/v1/${blobId}`;

      return { 
        blobId, 
        certificate: result.newlyCreated?.resourceOperation ?? null, 
        walrusUrl,
        raw: result 
      };
    } catch (error) {
      console.error(`Walrus publisher ${publisher} error:`, error);
      if (i === publishers.length - 1) {
        throw new Error(`All Walrus upload attempts failed. Last error: ${error?.message || error}`);
      }
    }
  }

  throw new Error("Walrus upload failed");
}

// PlantBuddy Oracle Package ID - UPDATE THIS AFTER DEPLOYMENT
// Get this from: sui client publish output
const PLANTBUDDY_PACKAGE_ID = import.meta.env.VITE_PLANTBUDDY_PACKAGE_ID || "";

// Debug: Log environment variables on module load
if (typeof window !== 'undefined') {
  console.log("🔍 Environment Check:", {
    hasPackageId: !!PLANTBUDDY_PACKAGE_ID,
    packageId: PLANTBUDDY_PACKAGE_ID ? `${PLANTBUDDY_PACKAGE_ID.slice(0, 10)}...` : "NOT SET",
    hasRegistryId: !!import.meta.env.VITE_PLANTBUDDY_REGISTRY_ID,
    allEnvVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
  });
}

/**
 * Certify blob on-chain using PlantBuddy Move contract
 * This creates an on-chain record linking the Walrus blob to the creator
 * 
 * @param blobId - Walrus blob ID
 * @param metadata - Blob metadata (title, description, dataPoints, size)
 * @param walletAdapter - Wallet adapter with signAndExecuteTransactionBlock
 * @param network - Network where blob is stored
 */
export async function certifyBlobOnChain(
  blobId: string, 
  metadata: {
    title: string;
    description: string;
    dataPoints: number;
    sizeBytes: number;
  },
  walletAdapter: any,
  network: WalrusNetwork = 'TESTNET',
  senderAddress?: string
): Promise<{ status: string; blobId: string; txDigest?: string }> {
  
  // If package ID not set, skip certification but still return success
  if (!PLANTBUDDY_PACKAGE_ID) {
    console.warn("⚠️ PlantBuddy Package ID not configured. Skipping on-chain certification.");
    console.warn("   Set VITE_PLANTBUDDY_PACKAGE_ID in your .env file after deploying the contract.");
    console.log("✅ Blob is already stored on Walrus with ID:", blobId);
    return { status: "Stored (not certified)", blobId };
  }

  if (!walletAdapter || !walletAdapter.signAndExecuteTransactionBlock) {
    console.warn("⚠️ Wallet adapter not available. Skipping on-chain certification.");
    return { status: "Stored (not certified)", blobId };
  }

  try {
    console.log("🔐 Certifying blob on-chain...");
    console.log("   Package ID:", PLANTBUDDY_PACKAGE_ID);
    console.log("   Blob ID:", blobId);
    console.log("   Wallet adapter:", walletAdapter);

    // Import Sui Transaction Builder
    // @mysten/sui.js 0.54.1 only has TransactionBlock
    const { TransactionBlock } = await import('@mysten/sui.js/transactions');
    const tx = new TransactionBlock();
    
    console.log("   Using TransactionBlock API");

    // Build the certify_blob transaction
    const REGISTRY_ID = import.meta.env.VITE_PLANTBUDDY_REGISTRY_ID || "";

    if (!REGISTRY_ID) {
      console.warn("⚠️ Registry ID not configured. Skipping certification.");
      console.warn("   Initialize the registry first, then set VITE_PLANTBUDDY_REGISTRY_ID");
      return { status: "Stored (not certified)", blobId };
    }

    tx.moveCall({
      target: `${PLANTBUDDY_PACKAGE_ID}::plantbuddy_blob::certify_blob`,
      arguments: [
        tx.object(REGISTRY_ID), // Registry object
        tx.pure.string(blobId), // walrus_blob_id
        tx.pure.string(metadata.title), // title
        tx.pure.string(metadata.description), // description
        tx.pure.u64(metadata.dataPoints), // data_points
        tx.pure.u64(metadata.sizeBytes), // size_bytes
      ],
    });

    // Execute transaction
    // Pass transactionBlock to the adapter
    console.log("   Executing transaction...");
    console.log("   TransactionBlock type:", tx.constructor.name);
    
    // The adapter will handle extracting transactionBlock from params
    const result = await walletAdapter.signAndExecuteTransactionBlock({
      transactionBlock: tx,
    });

    console.log("✅ Blob certified on-chain!");
    console.log("   Transaction:", result.digest);

    return { 
      status: "Certified", 
      blobId,
      txDigest: result.digest
    };

  } catch (error: any) {
    console.error("❌ On-chain certification failed:", error);
    
    // Check for specific error types - handle both string messages and error objects
    const errorMessage = error?.message || error?.data?.message || String(error || '');
    const errorString = errorMessage.toLowerCase();
    
    if (errorString.includes('gas') || errorString.includes('no valid gas coins') || errorString.includes('insufficient')) {
      console.warn("⚠️ Insufficient SUI for gas fees. Please add more SUI to your wallet.");
      return { 
        status: "Stored (insufficient gas)", 
        blobId,
        error: "Insufficient SUI for transaction fees. Please add more SUI to your wallet."
      };
    }
    
    // Don't throw - blob is still stored on Walrus
    return { 
      status: "Stored (certification failed)", 
      blobId,
      error: errorMessage || "Unknown error"
    };
  }
}
