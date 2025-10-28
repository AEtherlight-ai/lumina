/**
 * Cryptography Module - Secure Key Management and Distribution
 *
 * DESIGN DECISION: Shamir Secret Sharing for catastrophe recovery
 * WHY: Single master key = single point of failure; Shamir enables distributed trust
 *
 * REASONING CHAIN:
 * 1. User loses device (theft, damage, etc.) → All encrypted patterns inaccessible
 * 2. Cloud backup = privacy concern + vendor lock-in
 * 3. Shamir Secret Sharing = split key into N shards, need K to reconstruct
 * 4. Distribute shards to circle of trust (family, teammates, friends)
 * 5. Catastrophe recovery: Collect K shards → Reconstruct key → Decrypt patterns
 * 6. Result: No single point of failure, privacy-preserving, zero vendor lock-in
 *
 * PATTERN: Pattern-TRUST-001 (Circle of Trust Key Sharing with Shamir)
 * RELATED: Pattern-STORAGE-001 (Multi-Layer Storage), P3-010 (DHT for shard distribution)
 * FUTURE: Hardware security module (HSM) integration, quantum-resistant algorithms
 */

pub mod shamir;

pub use shamir::{
    ShamirKeyManager, ShamirError, KeyShard
};
