


#[cfg(dev)]
pub fn is_dev_mode() -> bool {
    true
}

#[cfg(not(dev))]
pub fn is_dev_mode() -> bool {
    false
}