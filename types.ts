
export enum ViewMode {
  HOME = 'HOME',
  DEVICE = 'DEVICE',
  MARKETPLACE = 'MARKETPLACE',
  WALLET = 'WALLET'
}

export interface PlantDataPoint {
  timestamp: number;
  capacitance: number; // 0-100 simulating touch intensity
  sentiment: string; // 'Neutral', 'Joy', 'Melancholy', etc.
  userMessage?: string; // What the user said to the plant
  plantResponse?: string; // What the plant said back
}

export interface DataBlob {
  id: string; // Transaction Digest (verifiable on-chain ID) or Walrus Blob ID
  walrusBlobId?: string; // Original Walrus storage ID (optional)
  txDigest?: string; // Sui transaction digest for on-chain certification
  name: string;
  description: string;
  size: string;
  price: number; // In SUI
  creator: string;
  timestamp: string;
  dataPoints: number; // Count of interactions inside
  sentimentScore: number; // 0-100 positivity
  status: 'MINTED' | 'LISTED' | 'SOLD';
  owner: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const MOCK_BLOBS: DataBlob[] = [
  {
    id: 'blob_0x837...a92',
    name: 'Morning Melodies - Philodendron',
    description: '30 minutes of high-frequency capacitance interaction mixed with ambient user humming.',
    size: '4.2 MB',
    price: 150,
    creator: '0x12...9A',
    timestamp: '2023-10-24 08:30:00',
    dataPoints: 1240,
    sentimentScore: 85,
    status: 'LISTED',
    owner: '0x12...9A'
  },
  {
    id: 'blob_0x192...b33',
    name: 'Late Night Confessions - Cactus',
    description: 'Deep emotional speech data paired with low-latency touch responses. Validated owner.',
    size: '12.5 MB',
    price: 500,
    creator: '0x88...BB',
    timestamp: '2023-10-23 23:15:00',
    dataPoints: 5600,
    sentimentScore: 30,
    status: 'SOLD',
    owner: '0xCC...DD'
  }
];
