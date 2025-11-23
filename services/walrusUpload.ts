// src/services/walrusUpload.ts
// Walrus SDK + Sui upload & certify helper (Testnet)
// Drop into your React + TypeScript project under src/services/

import { WalrusClient } from "@mysten/walrus";
import { JsonRpcProvider, TransactionBlock } from "@mysten/sui";

// Configuration for Testnet
const UPLOAD_RELAY = "https://upload-relay.testnet.walrus.space";
const SUI_RPC = "https://fullnode.testnet.sui.io:443";
const WALRUS_PACKAGE_ID = "0x73a7a35d8e8b4b2cfb8811c7cdbfc2bbd2eaa1a8ef9a0f757f673bf007c5a7f4";

const suiProvider = new JsonRpcProvider({ url: SUI_RPC });

const walrus = new WalrusClient({
  network: "testnet",
  uploadRelay: { host: UPLOAD_RELAY },
  suiProvider,
});

/**
 * Upload session data to Walrus via SDK + Upload Relay.
 * @param sessionData - JSON-serializable object
 * @param walletAdapter - wallet adapter from @mysten/wallet-kit OR an object exposing signAndExecuteTransactionBlock({transactionBlock, options})
 */
export async function uploadSessionViaWalrusSDK(sessionData: any, walletAdapter: any) {
  const json = typeof sessionData === "string" ? sessionData : JSON.stringify(sessionData);
  const blobBytes = new TextEncoder().encode(json); // Uint8Array

  // signer wrapper
  const signerWrapper = {
    async signAndExecuteTransactionBlock({ transactionBlock, options }: any) {
      if (!walletAdapter || !walletAdapter.signAndExecuteTransactionBlock) {
        throw new Error("walletAdapter missing signAndExecuteTransactionBlock; ensure you pass the WalletKit adapter");
      }
      return await walletAdapter.signAndExecuteTransactionBlock({ transactionBlock, options });
    },
    async signTransactionBlock(...args: any[]) {
      if (walletAdapter.signTransactionBlock) return walletAdapter.signTransactionBlock(...args);
      return this.signAndExecuteTransactionBlock(...args);
    }
  };

  // Try high-level helper if available
  try {
    if (typeof (walrus as any).writeBlobToUploadRelay === "function") {
      const result = await (walrus as any).writeBlobToUploadRelay({
        blob: blobBytes,
        signer: signerWrapper,
        uploadRelayHost: UPLOAD_RELAY,
      });
      const blobId = result.blobId || result.newlyCreated?.blobObject?.blobId;
      const certificate = result.certificate || result.confirmationCertificate || result.rawCertificate || null;
      return { blobId, certificate, raw: result };
    }
  } catch (e) {
    console.warn("High-level walrus helper failed; falling back to manual flow:", e);
  }

  // Fallback manual flow using registerBlobTransaction helper (SDK versions vary)
  try {
    if (typeof (walrus as any).registerBlobTransaction !== "function") {
      throw new Error("Walrus SDK in this project does not expose registerBlobTransaction fallback. Update SDK or use the high-level helper.");
    }

    const size = blobBytes.byteLength;
    const epochs = 1;
    const deletable = false;

    // build register tx
    const tx = (walrus as any).registerBlobTransaction({ size, epochs, deletable });
    // sign & execute
    const txResult = await signerWrapper.signAndExecuteTransactionBlock({ transactionBlock: tx, options: {} });

    // try to extract blobId from txResult using SDK helper if exists
    let blobId: string | undefined;
    if (typeof (walrus as any).getBlobIdFromRegisterTxResult === "function") {
      blobId = (walrus as any).getBlobIdFromRegisterTxResult(txResult);
    } else {
      // scan events
      const events = txResult?.effects?.events || txResult?.events || [];
      for (const ev of events) {
        try {
          const parsed = ev?.parsedJson || ev?.json || ev?.data;
          if (parsed && parsed.blobId) { blobId = parsed.blobId; break; }
        } catch {}
      }
    }

    if (!blobId) throw new Error("Could not derive blobId after register transaction");

    // POST bytes to relay with blob_id query param
    const relayUrl = `${UPLOAD_RELAY}/v1/blob-upload-relay?blob_id=${encodeURIComponent(blobId)}`;
    const relayResp = await fetch(relayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: blobBytes,
    });
    const txt = await relayResp.text();
    if (!relayResp.ok) {
      throw new Error(`Upload relay returned ${relayResp.status}: ${txt}`);
    }
    const parsed = JSON.parse(txt);
    const certificate = parsed?.confirmation_certificate || parsed?.certificate || parsed;
    return { blobId, certificate, raw: parsed };
  } catch (err) {
    console.error("Walrus upload failed:", err);
    throw err;
  }
}

/**
 * Certify blob on-chain using Walrus Move package
 * @param blobId
 * @param certificate - certificate bytes or object
 * @param walletAdapter - wallet adapter (must provide signAndExecuteTransactionBlock)
 */
export async function certifyBlobOnChain(blobId: string, certificate: any, walletAdapter: any) {
  if (!blobId || !certificate) throw new Error("blobId and certificate required");

  const tx = new TransactionBlock();
  // The Move function signature may vary; the SDK docs show how to call certify; adjust if needed.
  tx.moveCall({
    target: `${WALRUS_PACKAGE_ID}::blob::certify_blob`,
    arguments: [
      tx.pure(blobId),
      tx.pure(typeof certificate === "string" ? certificate : JSON.stringify(certificate)),
    ],
  });

  if (!walletAdapter || !walletAdapter.signAndExecuteTransactionBlock) {
    throw new Error("walletAdapter missing signAndExecuteTransactionBlock");
  }

  const res = await walletAdapter.signAndExecuteTransactionBlock({ transactionBlock: tx, options: {} });
  return res;
}
