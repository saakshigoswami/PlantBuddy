
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
