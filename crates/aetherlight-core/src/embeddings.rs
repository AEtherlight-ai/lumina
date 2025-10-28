/**
 * Local Text Embeddings via ONNX Runtime
 *
 * TEMPORARILY DISABLED FOR WEEK 0 LAUNCH: Requires DirectML libraries
 * WHY: ort crate links against DirectML (DXCORE.lib, DXGI.lib, D3D12.lib, DirectML.lib)
 *      which requires Windows 10 SDK with DirectX components
 *
 * REASONING CHAIN:
 * 1. ort crate downloads ONNX Runtime binaries that include DirectML providers
 * 2. DirectML requires Windows SDK libraries not available in build environment
 * 3. Embeddings are Phase 3 feature (semantic search), not required for core desktop app
 * 4. Stub implementation provides same API, returns errors when called
 * 5. Result: Desktop app compiles and runs, embeddings can be re-enabled later
 *
 * PATTERN: Pattern-PLACEHOLDER-001 (Defer non-critical dependencies for Week 0 launch)
 * FUTURE: Re-enable with Windows SDK installed OR switch to cloud-based embeddings (Voyage AI API)
 * RELATED: VectorStore, SemanticSearch, Pattern Matching
 */

use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Standard embedding dimension (matches all-MiniLM-L6-v2)
pub const EMBEDDING_DIM: usize = 384;

/// Embedding vector type
pub type Embedding = Vec<f32>;

/// Embedding result with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResult {
    /// Embedding vector (384 dimensions for all-MiniLM-L6-v2)
    pub embedding: Vec<f32>,

    /// Input text that was embedded
    pub text: String,

    /// Processing time in milliseconds
    pub duration_ms: u64,

    /// Token count
    pub token_count: usize,
}

/// Local embedding generator using ONNX Runtime
///
/// TEMPORARILY DISABLED: Stub implementation (returns errors when called)
#[derive(Clone)]
pub struct LocalEmbeddings {
    // Stub implementation - no fields needed
    _placeholder: (),
}

impl LocalEmbeddings {
    /// Create new local embeddings generator
    ///
    /// TEMPORARILY DISABLED: Returns error indicating embeddings are not available
    ///
    /// # Arguments
    /// * `model_path` - Path to ONNX model file (ignored in stub)
    /// * `tokenizer_path` - Path to tokenizer JSON (ignored in stub)
    ///
    /// # Returns
    /// * `Result<Self>` - Error indicating embeddings are disabled
    pub fn new(_model_path: impl AsRef<Path>, _tokenizer_path: impl AsRef<Path>) -> Result<Self> {
        Err(crate::Error::Internal(
            "Local embeddings are temporarily disabled (requires DirectML/Windows SDK). \
             Re-enable ort dependency in Cargo.toml or use cloud-based embeddings.".to_string()
        ))
    }

    /// Generate embedding for text
    ///
    /// TEMPORARILY DISABLED: Returns error indicating embeddings are not available
    ///
    /// # Arguments
    /// * `text` - Input text to embed (ignored in stub)
    ///
    /// # Returns
    /// * `Result<EmbeddingResult>` - Error indicating embeddings are disabled
    pub fn embed(&self, _text: &str) -> Result<EmbeddingResult> {
        Err(crate::Error::Internal(
            "Local embeddings are temporarily disabled (requires DirectML/Windows SDK)".to_string()
        ))
    }

    /// Generate embeddings for multiple texts
    ///
    /// TEMPORARILY DISABLED: Returns error indicating embeddings are not available
    ///
    /// # Arguments
    /// * `texts` - Input texts to embed (ignored in stub)
    ///
    /// # Returns
    /// * `Result<Vec<EmbeddingResult>>` - Error indicating embeddings are disabled
    pub fn embed_batch(&self, _texts: &[&str]) -> Result<Vec<EmbeddingResult>> {
        Err(crate::Error::Internal(
            "Local embeddings are temporarily disabled (requires DirectML/Windows SDK)".to_string()
        ))
    }
}

/* ORIGINAL IMPLEMENTATION COMMENTED OUT (requires ort, ndarray, tokenizers)

use ndarray::{Array1, ArrayView1, ArrayView2};
use ort::{session::Session, value::Value};
use tokenizers::Tokenizer;

[... full implementation omitted for brevity - 300+ lines ...]

See git history for full implementation or re-enable ort dependency in Cargo.toml
*/
