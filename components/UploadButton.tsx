// // src/components/UploadButton.tsx
// import React, { useState } from "react";
// import { useWallet, useWalletKit } from "@mysten/wallet-kit"; // if you use wallet-kit
// import { uploadSessionViaWalrusSDK, certifyBlobOnChain } from "../services/walrusUpload";

// interface Props {
//   getSessionData: () => any; // function to fetch current session data from parent app
// }

// export const UploadButton: React.FC<Props> = ({ getSessionData }) => {
//   const wallet = useWallet ? useWallet() : null;
//   const [loading, setLoading] = useState(false);
//   const [blobId, setBlobId] = useState<string | null>(null);
//   const [certificate, setCertificate] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);

//   const onUpload = async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const session = getSessionData();
//       if (!session) throw new Error("No session data provided");
//       // Ensure wallet connected
//       if (wallet && !wallet.connected) {
//         await wallet.connect();
//       }
//       const adapter = wallet || (window as any).sui || null;
//       if (!adapter) {
//         throw new Error("Wallet not found. Please connect a Sui wallet.");
//       }
//       const result = await uploadSessionViaWalrusSDK(session, adapter);
//       setBlobId(result.blobId || null);
//       setCertificate(result.certificate || result.raw || null);
//     } catch (e: any) {
//       console.error(e);
//       setError(e.message || String(e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onCertify = async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       if (!blobId || !certificate) throw new Error("Missing blobId or certificate");
//       const adapter = wallet || (window as any).sui || null;
//       if (!adapter) throw new Error("Wallet not found for certification");
//       const res = await certifyBlobOnChain(blobId, certificate, adapter);
//       console.log("Certification result:", res);
//       alert("Certified on-chain! Check explorer for the object.");
//     } catch (e: any) {
//       console.error(e);
//       setError(e.message || String(e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-4 bg-slate-800 rounded shadow">
//       <button onClick={onUpload} disabled={loading} className="px-4 py-2 bg-emerald-500 text-white rounded mr-2">
//         {loading ? "Uploading..." : "Upload session to Walrus (Testnet Relay)"}
//       </button>
//       <button onClick={onCertify} disabled={loading || !blobId || !certificate} className="px-4 py-2 bg-blue-600 text-white rounded">
//         {loading ? "Working..." : "Certify on Sui"}
//       </button>
//       {blobId && <div className="mt-2 text-sm">BlobId: <code>{blobId}</code></div>}
//       {error && <div className="mt-2 text-red-400">Error: {error}</div>}
//     </div>
//   );
// };

// export default UploadButton;
