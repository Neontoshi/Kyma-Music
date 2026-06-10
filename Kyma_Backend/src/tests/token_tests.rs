// Kyma_Backend/src/tests/token_tests.rs
use crate::commands::settings::{deobfuscate, obfuscate};

#[test]
fn test_obfuscate_different_output() {
    let original = "my_secret_token_12345";
    let encoded = obfuscate(original);
    // Obfuscated output should be different from original
    assert_ne!(encoded, original);
    // Should produce some output (not empty)
    assert!(!encoded.is_empty());
}

#[test]
fn test_roundtrip() {
    let original = "listenbrainz_token_abc123";
    let encoded = obfuscate(original);
    let decoded = deobfuscate(&encoded).unwrap();
    assert_eq!(decoded, original);
}

#[test]
fn test_empty_string() {
    let original = "";
    let encoded = obfuscate(original);
    let decoded = deobfuscate(&encoded).unwrap();
    assert_eq!(decoded, original);
}

#[test]
fn test_special_chars() {
    let original = "token!@#$%^&*()_+-=[]{}|;:',.<>?/`~";
    let encoded = obfuscate(original);
    let decoded = deobfuscate(&encoded).unwrap();
    assert_eq!(decoded, original);
}

#[test]
fn test_alphanumeric_roundtrip() {
    let original = "abcdefghijklmnopqrstuvwxyz0123456789";
    let encoded = obfuscate(original);
    let decoded = deobfuscate(&encoded).unwrap();
    assert_eq!(decoded, original);
}

#[test]
fn test_invalid_base64_fails() {
    assert!(deobfuscate("!!!not valid base64!!!").is_err());
}
