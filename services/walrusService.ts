
export type WalrusNetwork = 'TESTNET' | 'MAINNET';

const WALRUS_CONFIG = {
  TESTNET: {
    PUBLISHER: "https://publisher.walrus-testnet.walrus.space",
    AGGREGATOR: "https://aggregator.walrus-testnet.walrus.space"
  },
  MAINNET: {
    // Official Mainnet Publisher (requires payment/auth usually)
    // You may need to replace this with your own private publisher node if using Mainnet
    PUBLISHER: "https://publisher.walrus.site", 
    AGGREGATOR: "https://aggregator.walrus.site"
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
  
  const publisherUrl = `${WALRUS_CONFIG[network].PUBLISHER}/v1/store?epochs=5`; // Store for 5 epochs by default

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
