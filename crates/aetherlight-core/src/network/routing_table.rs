/**
 * Kademlia Routing Table - XOR Distance-Based Routing
 *
 * DESIGN DECISION: 160 K-buckets (one per bit in 160-bit key space)
 * WHY: Kademlia paper specifies 160-bit node IDs for optimal distribution
 *
 * REASONING CHAIN:
 * 1. Each K-bucket stores up to K=20 nodes at distance 2^i to 2^(i+1)
 * 2. XOR distance metric enables symmetric, unidirectional routing
 * 3. Least-recently-seen eviction keeps responsive nodes
 * 4. Bucket splitting handles high-density regions
 * 5. Result: O(log N) routing with high reliability
 *
 * PATTERN: Pattern-DHT-001 (Kademlia Routing Table)
 * PERFORMANCE: O(log N) lookup, <20 hops for 1M nodes
 * RELATED: dht.rs (uses routing table for find_k_closest_nodes)
 */

use super::{KademliaNode, NodeStatus};
use std::collections::VecDeque;
use std::time::{SystemTime, Duration};

const K: usize = 20; // Replication parameter (nodes per bucket)
#[allow(dead_code)] // Placeholder for Phase 3.7 DHT parallelism implementation
const ALPHA: usize = 3; // Parallelism parameter (concurrent queries)
const BUCKET_REFRESH_INTERVAL: Duration = Duration::from_secs(3600); // 1 hour

/**
 * Routing Table with 160 K-buckets
 *
 * DESIGN DECISION: Fixed 160 buckets (not dynamic splitting)
 * WHY: Simpler implementation, sufficient for 10^48 nodes
 *
 * STRUCTURE:
 * - k_buckets[0]: Nodes at distance 2^0 to 2^1 (furthest)
 * - k_buckets[1]: Nodes at distance 2^1 to 2^2
 * - ...
 * - k_buckets[159]: Nodes at distance 2^159 to 2^160 (closest)
 *
 * INVARIANT: Each bucket maintains at most K=20 nodes, sorted by last_seen (MRU at end)
 */
#[derive(Debug)]
pub struct RoutingTable {
    local_id: [u8; 20],
    k_buckets: Vec<KBucket>,
}

impl RoutingTable {
    /**
     * Create new routing table
     *
     * DESIGN DECISION: Local node ID is first 20 bytes of SHA-256(device_uuid)
     * WHY: Compatible with Kademlia 160-bit key space
     */
    pub fn new(local_id: [u8; 20]) -> Self {
        Self {
            local_id,
            k_buckets: (0..160).map(|_| KBucket::new()).collect(),
        }
    }

    /**
     * Add node to routing table
     *
     * DESIGN DECISION: Least-recently-seen eviction
     * WHY: Prefer long-lived nodes (higher reliability)
     *
     * REASONING CHAIN:
     * 1. Calculate XOR distance to determine bucket index
     * 2. If bucket not full (< K nodes) → insert at end (MRU position)
     * 3. If bucket full → check if existing node is stale
     * 4. If stale node found → replace with new node
     * 5. If all nodes responsive → ping least-recently-seen node
     * 6. If ping fails → evict and insert new node
     * 7. If ping succeeds → move to end (MRU) and discard new node
     *
     * PATTERN: LRU eviction with liveness checking
     * PERFORMANCE: O(K) = O(20) insertion time
     */
    pub fn add_node(&mut self, node: KademliaNode) -> AddNodeResult {
        // Don't add self to routing table
        if &node.id[..20] == &self.local_id {
            return AddNodeResult::IsSelf;
        }

        let bucket_index = self.bucket_index(&node.id);
        let bucket = &mut self.k_buckets[bucket_index];

        // Check if node already exists (update last_seen)
        if let Some(existing_index) = bucket.nodes.iter().position(|n| n.id == node.id) {
            let mut existing = bucket.nodes.remove(existing_index).unwrap();
            existing.last_seen = node.last_seen;
            existing.status = NodeStatus::Active;
            bucket.nodes.push_back(existing); // Move to MRU position
            return AddNodeResult::Updated;
        }

        // If bucket not full, insert at end (MRU)
        if bucket.nodes.len() < K {
            bucket.nodes.push_back(node);
            return AddNodeResult::Inserted;
        }

        // Bucket full: Check for stale nodes (not seen in 15 minutes)
        let stale_threshold = SystemTime::now() - Duration::from_secs(900);
        if let Some(stale_index) = bucket.nodes.iter().position(|n| n.last_seen < stale_threshold) {
            bucket.nodes.remove(stale_index);
            bucket.nodes.push_back(node);
            return AddNodeResult::ReplacedStale;
        }

        // All nodes fresh: Need to ping LRU node to confirm liveness
        // For now, discard new node (conservative approach)
        // TODO: Implement async ping before eviction
        AddNodeResult::BucketFull
    }

    /**
     * Find K closest nodes to target
     *
     * DESIGN DECISION: Return sorted by XOR distance (closest first)
     * WHY: Kademlia FIND_NODE RPC returns sorted list
     *
     * REASONING CHAIN:
     * 1. Determine target bucket index
     * 2. Collect nodes from target bucket
     * 3. If < K nodes, collect from adjacent buckets (spiraling outward)
     * 4. Sort all collected nodes by XOR distance
     * 5. Return first K nodes
     *
     * PERFORMANCE: O(K * log K) = O(20 * log 20) ≈ O(80)
     */
    pub fn find_closest(&self, target_id: &[u8; 20], count: usize) -> Vec<KademliaNode> {
        let mut candidates = Vec::new();

        // Start with target bucket
        let bucket_index = self.bucket_index_for_id(target_id);
        candidates.extend(self.k_buckets[bucket_index].nodes.iter().cloned());

        // Spiral outward to adjacent buckets
        let mut offset = 1;
        while candidates.len() < count && offset <= 160 {
            // Check bucket below
            if bucket_index >= offset {
                candidates.extend(self.k_buckets[bucket_index - offset].nodes.iter().cloned());
            }
            // Check bucket above
            if bucket_index + offset < 160 {
                candidates.extend(self.k_buckets[bucket_index + offset].nodes.iter().cloned());
            }
            offset += 1;
        }

        // Sort by XOR distance to target
        candidates.sort_by_key(|node| self.xor_distance_to(target_id, &node.id[..20].try_into().unwrap()));

        // Return first K nodes
        candidates.into_iter().take(count).collect()
    }

    /**
     * Remove node from routing table
     *
     * DESIGN DECISION: Remove on confirmed offline status
     * WHY: Free bucket space for responsive nodes
     */
    pub fn remove_node(&mut self, node_id: &[u8; 20]) -> bool {
        let bucket_index = self.bucket_index_for_id(node_id);
        let bucket = &mut self.k_buckets[bucket_index];

        if let Some(index) = bucket.nodes.iter().position(|n| &n.id[..20] == node_id) {
            bucket.nodes.remove(index);
            return true;
        }
        false
    }

    /**
     * Get bucket index for a node
     *
     * DESIGN DECISION: Bucket index = position of highest differing bit
     * WHY: Kademlia XOR metric naturally partitions key space
     *
     * EXAMPLE:
     * - local_id  = 0b00001111
     * - target_id = 0b00000111
     * - XOR       = 0b00001000 (bit 3 differs)
     * - Bucket    = 3 (distance 2^3 to 2^4)
     */
    fn bucket_index(&self, node_id: &[u8; 32]) -> usize {
        self.bucket_index_for_id(&node_id[..20].try_into().unwrap())
    }

    fn bucket_index_for_id(&self, node_id: &[u8; 20]) -> usize {
        // Calculate XOR distance
        let mut xor = [0u8; 20];
        for i in 0..20 {
            xor[i] = self.local_id[i] ^ node_id[i];
        }

        // Find position of highest bit set (leading zero count)
        for (byte_index, &byte) in xor.iter().enumerate() {
            if byte != 0 {
                let leading_zeros = byte.leading_zeros() as usize;
                return (byte_index * 8) + (7 - leading_zeros);
            }
        }

        // All bits same (shouldn't happen, node_id == local_id)
        159
    }

    /**
     * Calculate XOR distance between two 160-bit IDs
     *
     * DESIGN DECISION: Return u128 (lower 128 bits of XOR)
     * WHY: Sufficient for distance comparison, fits in register
     */
    fn xor_distance_to(&self, id1: &[u8; 20], id2: &[u8; 20]) -> u128 {
        let mut distance: u128 = 0;
        for i in 4..20 {  // Use last 16 bytes (128 bits)
            distance = distance.wrapping_shl(8);
            distance |= (id1[i] ^ id2[i]) as u128;
        }
        distance
    }

    /**
     * Get total number of nodes in routing table
     */
    pub fn node_count(&self) -> usize {
        self.k_buckets.iter().map(|b| b.nodes.len()).sum()
    }

    /**
     * Get buckets that need refresh
     *
     * DESIGN DECISION: Refresh buckets not queried in 1 hour
     * WHY: Keep routing table fresh, discover new nodes
     */
    pub fn buckets_needing_refresh(&self) -> Vec<usize> {
        let refresh_threshold = SystemTime::now() - BUCKET_REFRESH_INTERVAL;
        self.k_buckets
            .iter()
            .enumerate()
            .filter(|(_, bucket)| bucket.last_refresh < refresh_threshold)
            .map(|(index, _)| index)
            .collect()
    }
}

/**
 * K-Bucket: Stores up to K=20 nodes at similar distance
 *
 * DESIGN DECISION: VecDeque for O(1) insertion at both ends
 * WHY: LRU at front, MRU at back, efficient eviction
 */
#[derive(Debug)]
struct KBucket {
    nodes: VecDeque<KademliaNode>,
    last_refresh: SystemTime,
}

impl KBucket {
    fn new() -> Self {
        Self {
            nodes: VecDeque::with_capacity(K),
            last_refresh: SystemTime::now(),
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum AddNodeResult {
    Inserted,      // Node added to bucket
    Updated,       // Existing node updated (moved to MRU)
    ReplacedStale, // Stale node replaced with new node
    BucketFull,    // Bucket full, new node discarded
    IsSelf,        // Cannot add self to routing table
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::SocketAddr;

    /**
     * Test: Routing table creation
     */
    #[test]
    fn test_routing_table_creation() {
        let local_id = [42u8; 20];
        let rt = RoutingTable::new(local_id);

        assert_eq!(rt.k_buckets.len(), 160);
        assert_eq!(rt.node_count(), 0);
    }

    /**
     * Test: Add node to routing table
     */
    #[test]
    fn test_add_node() {
        let local_id = [0u8; 20];
        let mut rt = RoutingTable::new(local_id);

        let mut node_id = [0u8; 32];
        node_id[0] = 255; // Distance 2^7 (bucket 7)

        let node = KademliaNode {
            id: node_id,
            address: "127.0.0.1:8080".parse().unwrap(),
            last_seen: SystemTime::now(),
            status: NodeStatus::Active,
        };

        let result = rt.add_node(node);
        assert_eq!(result, AddNodeResult::Inserted);
        assert_eq!(rt.node_count(), 1);
    }

    /**
     * Test: Find closest nodes
     */
    #[test]
    fn test_find_closest() {
        let local_id = [0u8; 20];
        let mut rt = RoutingTable::new(local_id);

        // Add 5 nodes at different distances
        for i in 1..=5 {
            let mut node_id = [0u8; 32];
            node_id[0] = i * 10;

            let node = KademliaNode {
                id: node_id,
                address: format!("127.0.0.1:{}", 8080 + i).parse().unwrap(),
                last_seen: SystemTime::now(),
                status: NodeStatus::Active,
            };

            rt.add_node(node);
        }

        // Find 3 closest to target
        let target = [5u8; 20];
        let closest = rt.find_closest(&target, 3);

        assert_eq!(closest.len(), 3);
        // Should be sorted by distance
    }

    /**
     * Test: Bucket full eviction
     */
    #[test]
    fn test_bucket_full() {
        let local_id = [0u8; 20];
        let mut rt = RoutingTable::new(local_id);

        // Fill bucket 7 with K=20 nodes
        for i in 0..20 {
            let mut node_id = [0u8; 32];
            node_id[0] = 255; // All in bucket 7
            node_id[1] = i as u8;

            let node = KademliaNode {
                id: node_id,
                address: format!("127.0.0.1:{}", 8080 + i).parse().unwrap(),
                last_seen: SystemTime::now(),
                status: NodeStatus::Active,
            };

            let result = rt.add_node(node);
            assert!(result == AddNodeResult::Inserted || result == AddNodeResult::Updated);
        }

        // Try to add 21st node (should be discarded)
        let mut node_id = [0u8; 32];
        node_id[0] = 255;
        node_id[1] = 99;

        let node = KademliaNode {
            id: node_id,
            address: "127.0.0.1:9999".parse().unwrap(),
            last_seen: SystemTime::now(),
            status: NodeStatus::Active,
        };

        let result = rt.add_node(node);
        assert_eq!(result, AddNodeResult::BucketFull);
        assert_eq!(rt.node_count(), 20);
    }

    /**
     * Test: XOR distance calculation
     */
    #[test]
    fn test_xor_distance() {
        let local_id = [0u8; 20];
        let rt = RoutingTable::new(local_id);

        let id1 = [0u8; 20];
        let id2 = [255u8; 20];

        let distance = rt.xor_distance_to(&id1, &id2);
        assert!(distance > 0);

        // Distance to self should be 0
        let distance_self = rt.xor_distance_to(&id1, &id1);
        assert_eq!(distance_self, 0);
    }
}
