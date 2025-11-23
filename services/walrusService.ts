// src/services/walrusClient.ts
export type WalrusNetwork = 'TESTNET' | 'MAINNET';

const WALRUS_CONFIG = {
  TESTNET: {
    // IMPORTANT: Use the real testnet publisher/relay hosts for your environment
    PUBLISHER: "https://publisher-devnet.walrus.space",
    AGGREGATOR: "https://aggregator-devnet.walrus.space",
    // optional relay / CORS-friendly endpoint (use if publisher rejects browser CORS)
    UPLOAD_RELAY: "https://upload-relay.testnet.walrus.space"
  },
  MAINNET: {
    PUBLISHER: "https://publisher.walrus.space",
    AGGREGATOR: "https://aggregator.walrus.space",
    UPLOAD_RELAY: "https://upload-relay.walrus.space"
  }
};

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      blobId: string;
      storageNodeId?: string;
      storedEpoch?: number;
    };
    resourceOperation?: any;
    cost?: number;
  };
  alreadyCertified?: {
    blobId: string;
    event?: any;
  };
}

/**
 * Upload data to Walrus (tries publisher first, optionally upload-relay).
 * content: string | Blob | ArrayBuffer
 */
export async function uploadToWalrus(
  content: string | Blob | ArrayBuffer,
  network: WalrusNetwork = 'TESTNET',
  opts: { timeoutMs?: number; retries?: number; tryRelay?: boolean } = {}
): Promise<{ blobId: string; url: string; rawResponse?: any }> {
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const retries = opts.retries ?? 2;
  const tryRelay = opts.tryRelay ?? true;

  const publisherUrl = `${WALRUS_CONFIG[network].PUBLISHER}/v1/blobs`;
  const relayUrl = WALRUS_CONFIG[network].UPLOAD_RELAY ? `${WALRUS_CONFIG[network].UPLOAD_RELAY}/v1/blob-upload-relay` : null;
  const candidates: string[] = [publisherUrl];
  if (tryRelay && relayUrl) candidates.push(relayUrl);

  // normalize body
  let body: BodyInit = typeof content === 'string' ? content : (content as BodyInit);

  async function singleAttempt(url: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'PUT', // relay might expect POST; we try PUT first for publisher
        headers: {
          'Content-Type': typeof content === 'string' ? 'application/json' : 'application/octet-stream'
        },
        body,
        signal: controller.signal
      });
      clearTimeout(timer);

      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
      }

      // parse JSON if possible
      let parsed: any = null;
      try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
      return parsed;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error(`Upload aborted after ${timeoutMs}ms`);
      throw err;
    }
  }

  let lastErr: any = null;
  for (const url of candidates) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // If trying relay, some relays expect POST — try POST on relay
        const attemptUrl = url;
        const res = await (async () => {
          if (url === relayUrl) {
            // try POST for relays (common)
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
              const r = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': typeof content === 'string' ? 'application/json' : 'application/octet-stream'
                },
                body,
                signal: controller.signal
              });
              clearTimeout(timer);
              const txt = await r.text().catch(() => '');
              if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} - ${txt}`);
              return txt ? JSON.parse(txt) : null;
            } catch (e) {
              clearTimeout(timer);
              throw e;
            }
          } else {
            return await singleAttempt(url);
          }
        })();

        // parse response to find blobId
        const data: WalrusUploadResponse | any = res;
        let blobId = "";
        if (data && typeof data === 'object') {
          if (data.newlyCreated) blobId = data.newlyCreated.blobObject?.blobId;
          else if (data.alreadyCertified) blobId = data.alreadyCertified.blobId;
        }
        if (!blobId) {
          // If response is text or different shape, try to log it and continue (or treat as error)
          throw new Error(`Unexpected Walrus response: ${JSON.stringify(data)}`);
        }

        const aggregatorUrl = `${WALRUS_CONFIG[network].AGGREGATOR}/v1/${encodeURIComponent(blobId)}`;
        return { blobId, url: aggregatorUrl, rawResponse: data };
      } catch (err) {
        lastErr = err;
        // backoff before retry
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
    }
  }

  throw new Error(`All Walrus upload attempts failed. Last error: ${lastErr?.message || lastErr}`);
}
