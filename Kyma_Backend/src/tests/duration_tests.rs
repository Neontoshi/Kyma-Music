// Kyma_Backend/src/tests/duration_tests.rs
use crate::commands::youtube::secs_to_duration_str;

#[test]
fn test_seconds_only() {
    assert_eq!(secs_to_duration_str(0.0), "0:00");
    assert_eq!(secs_to_duration_str(45.0), "0:45");
    assert_eq!(secs_to_duration_str(59.0), "0:59");
}

#[test]
fn test_minutes_and_seconds() {
    assert_eq!(secs_to_duration_str(60.0), "1:00");
    assert_eq!(secs_to_duration_str(90.0), "1:30");
    assert_eq!(secs_to_duration_str(599.0), "9:59");
}

#[test]
fn test_hours() {
    assert_eq!(secs_to_duration_str(3600.0), "1:00:00");
    assert_eq!(secs_to_duration_str(3661.0), "1:01:01");
    assert_eq!(secs_to_duration_str(7200.0), "2:00:00");
}

#[test]
fn test_large_values() {
    assert_eq!(secs_to_duration_str(36000.0), "10:00:00");
    assert_eq!(secs_to_duration_str(86399.0), "23:59:59");
}
