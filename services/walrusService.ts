
export type WalrusNetwork = 'TESTNET' | 'MAINNET';

const WALRUS_CONFIG = {
  TESTNET: {
    // Using Devnet endpoints as they are the standard for development/hackathons
    PUBLISHER: "https://publisher-devnet.walrus.space",
    AGGREGATOR: "https://aggregator-devnet.walrus.space"
  },
  MAINNET: {
    // Official Mainnet Endpoints
    // Note: Mainnet publishers often require authentication/payment headers not present in this public demo
    PUBLISHER: "https://publisher.walrus.space", 
    AGGREGATOR: "https://aggregator.walrus.space"
  }
};

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      blobId: string;
      storageNodeId: string;
      storedEpoch: number;
    };
    resourceOperation: any;
    cost: number;
  };
  alreadyCertified?: {
    blobId: string;
    event: any;
  };
}

/**
 * Uploads text data (as a file) to the Walrus Network via HTTP PUT.
 */
export const uploadToWalrus = async (
  content: string, 
  network: WalrusNetwork = 'TESTNET'
): Promise<{ blobId: string; url: string }> => {
  
  // We remove explicit epoch params to rely on system defaults (usually 1 epoch) for maximum compatibility
  const publisherUrl = `${WALRUS_CONFIG[network].PUBLISHER}/v1/store`; 

  console.log(`[Walrus] Uploading to ${publisherUrl}...`);

  try {
    const response = await fetch(publisherUrl, {
      method: 'PUT',
      body: content,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Walrus Upload Failed: ${response.status} ${errText}`);
    }

    const data: WalrusUploadResponse = await response.json();
    
    // Extract Blob ID
    let blobId = "";
    if (data.newlyCreated) {
      blobId = data.newlyCreated.blobObject.blobId;
    } else if (data.alreadyCertified) {
      blobId = data.alreadyCertified.blobId;
    } else {
      throw new Error("Unexpected Walrus response format");
    }

    const aggregatorUrl = `${WALRUS_CONFIG[network].AGGREGATOR}/v1/${blobId}`;

    return { blobId, url: aggregatorUrl };

  } catch (error) {
    console.error("Walrus Service Error:", error);
    throw error;
  }
};
