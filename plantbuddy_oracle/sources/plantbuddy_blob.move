/// PlantBuddy Oracle - On-chain certification for Walrus blob storage
/// This contract allows PlantBuddy to certify and verify plant interaction data stored on Walrus
module plantbuddy_oracle::plantbuddy_blob {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};

    // Error codes
    const E_BLOB_NOT_FOUND: u64 = 1;
    const E_UNAUTHORIZED: u64 = 2;
    const E_INVALID_DATA: u64 = 3;

    /// Represents a certified PlantBuddy data blob stored on Walrus
    public struct PlantBuddyBlob has key, store {
        id: UID,
        /// Walrus blob ID (immutable reference to Walrus storage)
        walrus_blob_id: String,
        /// Creator address
        creator: address,
        /// Blob metadata
        title: String,
        description: String,
        /// Number of data points in the blob
        data_points: u64,
        /// Timestamp when blob was certified
        certified_at: u64,
        /// Size of the blob in bytes
        size_bytes: u64,
        /// Network where blob is stored (TESTNET/MAINNET)
        network: String,
    }

    /// Registry of all certified blobs (for easy lookup)
    public struct BlobRegistry has key {
        id: UID,
        /// Map of blob IDs to their certified blob objects
        blobs: vector<ID>,
        /// Total number of certified blobs
        total_blobs: u64,
    }

    // Events
    public struct BlobCertified has copy, drop {
        blob_id: ID,
        walrus_blob_id: String,
        creator: address,
        title: String,
        certified_at: u64,
    }

    public struct BlobUpdated has copy, drop {
        blob_id: ID,
        walrus_blob_id: String,
    }

    /// Initialize the blob registry (one-time setup)
    public fun init(ctx: &mut TxContext) {
        let registry = BlobRegistry {
            id: object::new(ctx),
            blobs: vector::empty(),
            total_blobs: 0,
        };
        transfer::share_object(registry);
    }

    /// Certify a PlantBuddy blob stored on Walrus
    /// This creates an on-chain record linking the Walrus blob ID to the creator
    public entry fun certify_blob(
        registry: &mut BlobRegistry,
        walrus_blob_id: vector<u8>,
        title: vector<u8>,
        description: vector<u8>,
        data_points: u64,
        size_bytes: u64,
        network: vector<u8>,
        ctx: &mut TxContext
    ) {
        let creator = tx_context::sender(ctx);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let blob = PlantBuddyBlob {
            id: object::new(ctx),
            walrus_blob_id: string::utf8(walrus_blob_id),
            creator,
            title: string::utf8(title),
            description: string::utf8(description),
            data_points,
            certified_at: timestamp,
            size_bytes,
            network: string::utf8(network),
        };

        let blob_id = object::uid_to_inner(&blob.id);
        
        // Add to registry
        vector::push_back(&mut registry.blobs, blob_id);
        registry.total_blobs = registry.total_blobs + 1;

        // Emit event
        event::emit(BlobCertified {
            blob_id,
            walrus_blob_id: blob.walrus_blob_id,
            creator,
            title: blob.title,
            certified_at: timestamp,
        });

        // Transfer blob to creator
        transfer::transfer(blob, creator);
    }

    /// Update blob metadata (only creator can update)
    public entry fun update_blob_metadata(
        blob: &mut PlantBuddyBlob,
        new_title: vector<u8>,
        new_description: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == blob.creator, E_UNAUTHORIZED);
        
        blob.title = string::utf8(new_title);
        blob.description = string::utf8(new_description);

        event::emit(BlobUpdated {
            blob_id: object::uid_to_inner(&blob.id),
            walrus_blob_id: blob.walrus_blob_id,
        });
    }

    /// Verify a blob exists and belongs to a creator
    public fun verify_blob(blob: &PlantBuddyBlob, creator: address): bool {
        blob.creator == creator
    }

    /// Get blob information
    public fun get_blob_info(blob: &PlantBuddyBlob): (String, address, u64, u64) {
        (blob.walrus_blob_id, blob.creator, blob.data_points, blob.certified_at)
    }

    /// Get registry stats
    public fun get_registry_stats(registry: &BlobRegistry): u64 {
        registry.total_blobs
    }

    /// Check if blob exists in registry
    public fun blob_exists(registry: &BlobRegistry, blob_id: ID): bool {
        let mut i = 0;
        let len = vector::length(&registry.blobs);
        while (i < len) {
            if (*vector::borrow(&registry.blobs, i) == blob_id) {
                return true
            };
            i = i + 1;
        };
        false
    }
}

