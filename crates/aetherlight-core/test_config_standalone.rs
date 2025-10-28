// Standalone test for config module
use aetherlight_core::config::{
    ConfigLoader, ConfigLevel, AetherlightConfig,
    PrivacyMode, SyncConfig, TerminalConfig
};

fn main() {
    println!("Testing config module...");
    
    // Test 1: ConfigLevel ordering
    assert!(ConfigLevel::User > ConfigLevel::Project);
    assert!(ConfigLevel::Project > ConfigLevel::Team);
    assert!(ConfigLevel::Team > ConfigLevel::System);
    println!("✓ ConfigLevel ordering test passed");
    
    // Test 2: Default config
    let config = AetherlightConfig::default();
    assert_eq!(config.level, ConfigLevel::System);
    assert!(config.sync.enabled);
    println!("✓ Default config test passed");
    
    // Test 3: Config validation
    let config = AetherlightConfig::default();
    assert!(config.validate().is_ok());
    println!("✓ Config validation test passed");
    
    // Test 4: Privacy mode
    let mode = PrivacyMode::DecisionsOnly;
    assert!(mode.allows_decisions());
    assert!(!mode.allows_code_snippets());
    println!("✓ Privacy mode test passed");
    
    // Test 5: Config loader creation
    let loader = ConfigLoader::new();
    assert!(loader.is_ok());
    println!("✓ ConfigLoader creation test passed");
    
    println!("\n✅ All config module tests passed!");
}
