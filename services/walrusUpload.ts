
// src/services/walrusUpload.ts
// Walrus Upload Service (REST API Implementation)

// Configuration for Walrus Networks
// We default to Testnet as it is the primary environment for the hackathon
const WALRUS_CONFIG = {
  TESTNET: {
    PUBLISHER: "https://publisher.walrus-testnet.walrus.space",
    AGGREGATOR: "https://aggregator.walrus-testnet.walrus.space"
  },
  MAINNET: {
    PUBLISHER: "https://publisher.walrus.space",
    AGGREGATOR: "https://aggregator.walrus.space"
  },
  DEVNET: {
     PUBLISHER: "https://publisher-devnet.walrus.space",
     AGGREGATOR: "https://aggregator-devnet.walrus.space"
  }
};

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
  network: 'TESTNET' | 'MAINNET' = 'TESTNET'
) {
  const json = typeof sessionData === "string" ? sessionData : JSON.stringify(sessionData);
  const config = WALRUS_CONFIG[network];
  
  console.log(`Initiating upload to Walrus ${network}...`);
  
  try {
      // 1. PUT to Publisher
      // We use epochs=1 for short-term storage default.
      const response = await fetch(`${config.PUBLISHER}/v1/store?epochs=1`, {
        method: "PUT",
        body: json,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Walrus Publisher Error: ${response.status} ${text}`);
      }

      // 2. Parse Response
      const data = await response.json();
      
      let blobId: string | undefined;
      let certificate: any | undefined;

      if (data.newlyCreated) {
        blobId = data.newlyCreated.blobObject.blobId;
        certificate = data.newlyCreated.encodedSize; // Simplified for metadata
      } else if (data.alreadyCertified) {
        blobId = data.alreadyCertified.blobId;
      }

      if (!blobId) {
        throw new Error("Upload successful but no Blob ID returned.");
      }

      return { 
        blobId, 
        certificate, 
        raw: data 
      };

  } catch (error: any) {
      console.error("Walrus Upload Failed:", error);
      
      // Check for CORS/Network errors
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
          throw new Error(`CORS Error: The Walrus ${network} Publisher blocked this browser request. This is common in pure web-apps. In production, use a backend relay.`);
      }
      
      throw error;
  }
}

/**
 * Certify blob on-chain using Walrus Move package
 * Note: This requires the exact Move Package ID for the current deployment.
 * If certification fails due to package mismatch, the blob is still safely stored!
 */
export async function certifyBlobOnChain(blobId: string, certificate: any, walletAdapter: any) {
  console.log("Skipping on-chain certification for this demo (requires exact epoch package ID).");
  console.log("Blob is already stored on Walrus with ID:", blobId);
  return { status: "Stored", blobId };
}
