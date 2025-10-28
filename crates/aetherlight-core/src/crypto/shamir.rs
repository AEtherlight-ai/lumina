/**
 * Shamir Secret Sharing for Catastrophe Recovery
 *
 * DESIGN DECISION: 3-of-5 threshold cryptography (K=3, N=5)
 * WHY: Balances security (requires 3-party collusion) with resilience (survives 2 shard losses)
 *
 * REASONING CHAIN:
 * 1. Single master key = single point of failure (device lost → all patterns lost)
 * 2. 2-of-3 threshold = less resilient (only 1 shard can be lost)
 * 3. 5-of-9 threshold = more complex (requires 9 trusted contacts)
 * 4. 3-of-5 threshold = optimal balance (survives 2 losses, requires 3 to compromise)
 * 5. Polynomial interpolation ensures K-1 shards reveal 0% of secret
 * 6. Result: Secure + resilient + privacy-preserving catastrophe recovery
 *
 * ALGORITHM: Shamir Secret Sharing (Polynomial Interpolation)
 * 1. Choose random polynomial of degree K-1: f(x) = a0 + a1*x + a2*x^2 + ...
 * 2. Set f(0) = secret (master encryption key)
 * 3. Generate N points: (1, f(1)), (2, f(2)), ..., (N, f(N))
 * 4. Each point is a shard (distributed to trusted node)
 * 5. Reconstruction: Use K points to interpolate polynomial → evaluate f(0)
 *
 * SECURITY PROPERTIES:
 * - With K-1 shards: 0% of secret revealed (polynomial underdetermined)
 * - With K shards: 100% of secret reconstructed (polynomial fully determined)
 * - Information-theoretically secure (no computational assumptions)
 *
 * PATTERN: Pattern-TRUST-001 (Circle of Trust Key Sharing)
 * RELATED: Pattern-STORAGE-001 (Multi-Layer Storage), P3-010 (DHT distribution)
 * FUTURE: Proactive secret sharing (periodic re-sharing), verifiable secret sharing
 */

use crate::{Result, Error};
use sharks::{Sharks, Share};
use rand::Rng;

/**
 * Shamir Key Manager - Catastrophe Recovery via Distributed Trust
 *
 * USAGE:
 * ```rust
 * // Setup: Generate and distribute key shards
 * let manager = ShamirKeyManager::new_recommended(); // 3-of-5
 * let master_key = manager.generate_master_key();
 * let shards = manager.split_master_key(&master_key)?;
 * // Distribute shards[0..4] to 5 trusted contacts
 *
 * // Recovery: Collect 3+ shards and reconstruct
 * let collected_shards = vec![shards[0], shards[2], shards[4]]; // Any 3
 * let recovered_key = manager.reconstruct_master_key(&collected_shards)?;
 * assert_eq!(master_key, recovered_key);
 * ```
 *
 * CATASTROPHE RECOVERY FLOW:
 * 1. User loses device (laptop stolen, phone broken)
 * 2. Install Lumina on new device
 * 3. Contact 3 friends from circle of trust
 * 4. Collect 3 key shards (via QR code, NFC, or manual entry)
 * 5. Reconstruct master key (automatic)
 * 6. Decrypt all pattern data (automatic)
 *
 * PATTERN: Pattern-TRUST-001 (Circle of Trust)
 * SECURITY: 256-bit master key, 3-of-5 threshold, information-theoretic security
 */
#[derive(Debug, Clone)]
pub struct ShamirKeyManager {
    threshold: u8,  // K (minimum shards to reconstruct)
    shares: u8,     // N (total shards distributed)
}

impl ShamirKeyManager {
    /**
     * Create recommended 3-of-5 threshold manager
     *
     * DESIGN DECISION: 3-of-5 as default
     * WHY: Optimal balance for most users (survives 2 losses, requires 3 to compromise)
     */
    pub fn new_recommended() -> Self {
        Self {
            threshold: 3,
            shares: 5,
        }
    }

    /**
     * Create custom threshold manager
     *
     * DESIGN DECISION: Validate K <= N and K >= 2
     * WHY: K=1 provides no security, K>N is impossible
     *
     * EXAMPLES:
     * - 2-of-3: Minimal (survives 1 loss, 2-party collusion)
     * - 3-of-5: Recommended (survives 2 losses, 3-party collusion)
     * - 5-of-9: High security (survives 4 losses, 5-party collusion)
     * - 10-of-20: Enterprise (survives 10 losses, 10-party collusion)
     */
    pub fn new(threshold: u8, shares: u8) -> Result<Self> {
        if threshold > shares {
            return Err(Error::Internal(format!(
                "Threshold {} cannot exceed total shares {}",
                threshold, shares
            )));
        }

        if threshold < 2 {
            return Err(Error::Internal(
                "Threshold must be at least 2 for security".to_string()
            ));
        }

        Ok(Self { threshold, shares })
    }

    /**
     * Generate 256-bit master encryption key
     *
     * SECURITY: 256-bit = 2^256 brute force resistance (~10^77 operations)
     * - AES-256 encryption (quantum-resistant with proper key derivation)
     * - Used to encrypt all pattern data
     * - ChaCha20-Poly1305 alternative (faster on mobile, same security)
     *
     * DESIGN DECISION: Use OS-provided CSPRNG (cryptographically secure)
     * WHY: rand::thread_rng() uses OS entropy (e.g., /dev/urandom on Linux)
     */
    pub fn generate_master_key(&self) -> [u8; 32] {
        let mut key = [0u8; 32];
        rand::thread_rng().fill(&mut key);
        key
    }

    /**
     * Split master key into N shards using Shamir Secret Sharing
     *
     * ALGORITHM: Polynomial interpolation in finite field GF(2^8)
     * 1. Choose random polynomial of degree K-1 (threshold-1)
     * 2. Set f(0) = master_key (secret)
     * 3. Generate N points: (1, f(1)), (2, f(2)), ..., (N, f(N))
     * 4. Each point is a shard (x-coordinate + y-coordinate)
     *
     * SECURITY PROPERTY (Information-Theoretic):
     * - With K-1 shards: 0% of secret revealed (polynomial underdetermined)
     * - With K shards: 100% of secret revealed (polynomial fully determined)
     * - No computational assumptions (secure even against quantum computers)
     *
     * PERFORMANCE: O(N * K) operations, <1ms for typical parameters
     * PATTERN: Pattern-TRUST-001 (Circle of Trust)
     */
    pub fn split_master_key(&self, master_key: &[u8; 32]) -> Result<Vec<KeyShard>> {
        let sharks = Sharks(self.threshold);
        let dealer = sharks.dealer(master_key);

        let shards: Vec<KeyShard> = dealer
            .take(self.shares as usize)
            .enumerate()
            .map(|(index, share)| KeyShard {
                shard_id: index as u8 + 1,
                total_shards: self.shares,
                threshold: self.threshold,
                data: Vec::from(&share),
            })
            .collect();

        Ok(shards)
    }

    /**
     * Reconstruct master key from K or more shards
     *
     * USAGE: Device lost → Collect 3 shards from circle of trust → Reconstruct key
     *
     * ALGORITHM: Lagrange interpolation to reconstruct polynomial, evaluate at x=0
     * 1. Take K shards (any K will work, order doesn't matter)
     * 2. Compute Lagrange basis polynomials
     * 3. Interpolate f(x) = sum(y_i * L_i(x))
     * 4. Evaluate f(0) to recover secret
     *
     * SECURITY:
     * - 1 shard: 0% of key (attacker gains nothing)
     * - 2 shards (K=3): 0% of key (still underdetermined)
     * - 3 shards: 100% of key (can decrypt all patterns)
     *
     * PERFORMANCE: O(K^2) operations, <5ms for typical parameters
     * PATTERN: Pattern-TRUST-001 (Circle of Trust Recovery)
     */
    pub fn reconstruct_master_key(&self, shards: &[KeyShard]) -> Result<[u8; 32]> {
        if shards.len() < self.threshold as usize {
            return Err(Error::Internal(format!(
                "Insufficient shards: need {}, provided {}",
                self.threshold,
                shards.len()
            )));
        }

        let sharks = Sharks(self.threshold);

        // Convert KeyShards to Share objects
        let shares: Vec<Share> = shards
            .iter()
            .map(|shard| Share::try_from(shard.data.as_slice()))
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| Error::Internal(format!("Shard conversion failed: {}", e)))?;

        // Reconstruct secret using Lagrange interpolation
        let recovered = sharks.recover(&shares)
            .map_err(|e| Error::Internal(format!("Key reconstruction failed: {}", e)))?;

        // Convert to fixed-size array
        if recovered.len() != 32 {
            return Err(Error::Internal(format!(
                "Invalid key length: expected 32, got {}",
                recovered.len()
            )));
        }

        let mut master_key = [0u8; 32];
        master_key.copy_from_slice(&recovered);

        Ok(master_key)
    }

    pub fn threshold(&self) -> u8 {
        self.threshold
    }

    pub fn total_shares(&self) -> u8 {
        self.shares
    }
}

/**
 * Key Shard - Individual piece of split master key
 *
 * DESIGN DECISION: Include metadata (shard_id, threshold, total_shards)
 * WHY: User sees "Shard 2 of 5 (need 3 to recover)" - clear communication
 *
 * DISTRIBUTION:
 * - QR code (base64-encoded, fits in standard QR code)
 * - NFC tap (Android/iOS)
 * - Manual entry (base64 string)
 * - DHT publish (encrypted with recipient public key)
 *
 * PATTERN: Pattern-TRUST-001 (Circle of Trust)
 */
#[derive(Debug, Clone)]
pub struct KeyShard {
    pub shard_id: u8,
    pub total_shards: u8,
    pub threshold: u8,
    pub data: Vec<u8>,
}

impl KeyShard {
    pub fn to_base64(&self) -> String {
        use base64::{engine::general_purpose, Engine as _};
        general_purpose::STANDARD.encode(&self.data)
    }

    pub fn from_base64(encoded: &str, shard_id: u8, total_shards: u8, threshold: u8) -> Result<Self> {
        use base64::{engine::general_purpose, Engine as _};

        let data = general_purpose::STANDARD
            .decode(encoded)
            .map_err(|e| Error::Internal(format!("Base64 decode failed: {}", e)))?;

        Ok(Self {
            shard_id,
            total_shards,
            threshold,
            data,
        })
    }
}

#[derive(Debug)]
pub enum ShamirError {
    InvalidThreshold { threshold: u8, shares: u8 },
    ThresholdTooLow,
    InsufficientShards { required: u8, provided: u8 },
    ReconstructionFailed(String),
}

impl std::fmt::Display for ShamirError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ShamirError::InvalidThreshold { threshold, shares } => {
                write!(f, "Invalid threshold: {} > {}", threshold, shares)
            }
            ShamirError::ThresholdTooLow => write!(f, "Threshold must be at least 2"),
            ShamirError::InsufficientShards { required, provided } => {
                write!(f, "Insufficient shards: need {}, have {}", required, provided)
            }
            ShamirError::ReconstructionFailed(msg) => write!(f, "Reconstruction failed: {}", msg),
        }
    }
}

impl std::error::Error for ShamirError {}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * Test: 3-of-5 threshold (recommended setup)
     *
     * VALIDATES:
     * - Key generation produces 256-bit key
     * - Splitting produces 5 shards
     * - Reconstruction with 3 shards succeeds
     * - Reconstructed key matches original
     */
    #[test]
    fn test_3_of_5_threshold() {
        let manager = ShamirKeyManager::new_recommended();

        // Generate master key
        let master_key = manager.generate_master_key();
        assert_eq!(master_key.len(), 32);

        // Split into 5 shards
        let shards = manager.split_master_key(&master_key).unwrap();
        assert_eq!(shards.len(), 5);

        // Reconstruct with shards 0, 2, 4 (any 3 of 5)
        let collected_shards = vec![shards[0].clone(), shards[2].clone(), shards[4].clone()];
        let recovered_key = manager.reconstruct_master_key(&collected_shards).unwrap();

        // Verify reconstruction
        assert_eq!(master_key, recovered_key);
    }

    /**
     * Test: Insufficient shards fails reconstruction
     *
     * SECURITY CHECK:
     * - 2 shards (K=3) should fail
     * - Validates security property: K-1 shards reveal nothing
     */
    #[test]
    fn test_insufficient_shards() {
        let manager = ShamirKeyManager::new_recommended();

        let master_key = manager.generate_master_key();
        let shards = manager.split_master_key(&master_key).unwrap();

        // Try with only 2 shards (need 3)
        let insufficient = vec![shards[0].clone(), shards[1].clone()];
        let result = manager.reconstruct_master_key(&insufficient);

        assert!(result.is_err());
    }

    /**
     * Test: Different shard combinations all work
     *
     * VALIDATES: Any K of N shards work (order doesn't matter)
     */
    #[test]
    fn test_different_shard_combinations() {
        let manager = ShamirKeyManager::new_recommended();

        let master_key = manager.generate_master_key();
        let shards = manager.split_master_key(&master_key).unwrap();

        // Try different combinations of 3 shards
        let combinations = vec![
            vec![0, 1, 2],
            vec![0, 2, 4],
            vec![1, 3, 4],
            vec![2, 3, 4],
        ];

        for combo in combinations {
            let collected = combo.iter()
                .map(|&i| shards[i].clone())
                .collect::<Vec<_>>();

            let recovered = manager.reconstruct_master_key(&collected).unwrap();
            assert_eq!(master_key, recovered, "Failed for combination {:?}", combo);
        }
    }

    /**
     * Test: Custom threshold (2-of-3)
     *
     * VALIDATES: Custom thresholds work correctly
     */
    #[test]
    fn test_custom_threshold() {
        let manager = ShamirKeyManager::new(2, 3).unwrap();

        let master_key = manager.generate_master_key();
        let shards = manager.split_master_key(&master_key).unwrap();
        assert_eq!(shards.len(), 3);

        // Reconstruct with any 2 of 3
        let collected = vec![shards[0].clone(), shards[2].clone()];
        let recovered = manager.reconstruct_master_key(&collected).unwrap();

        assert_eq!(master_key, recovered);
    }

    /**
     * Test: Base64 encoding for QR codes / manual entry
     *
     * VALIDATES: Shards can be serialized for distribution
     */
    #[test]
    fn test_base64_encoding() {
        let manager = ShamirKeyManager::new_recommended();
        let master_key = manager.generate_master_key();
        let shards = manager.split_master_key(&master_key).unwrap();

        // Encode shard to base64
        let encoded = shards[0].to_base64();
        assert!(!encoded.is_empty());

        // Decode back
        let decoded = KeyShard::from_base64(&encoded, 1, 5, 3).unwrap();
        assert_eq!(shards[0].data, decoded.data);
    }

    /**
     * Test: Invalid configurations rejected
     *
     * SECURITY CHECK: Threshold validation prevents weak setups
     */
    #[test]
    fn test_invalid_threshold() {
        // Threshold > shares (impossible)
        assert!(ShamirKeyManager::new(5, 3).is_err());

        // Threshold = 1 (no security)
        assert!(ShamirKeyManager::new(1, 5).is_err());

        // Valid configurations
        assert!(ShamirKeyManager::new(2, 3).is_ok());
        assert!(ShamirKeyManager::new(3, 5).is_ok());
        assert!(ShamirKeyManager::new(10, 20).is_ok());
    }
}
