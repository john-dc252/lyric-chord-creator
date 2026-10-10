//! Dev-only stand-in for Google sign-in. Credentials live in a plain text file:
//! one `email:password:display name` per line, `#` for comments.

use std::path::PathBuf;

use super::Identity;
use crate::error::ApiError;

pub struct StubUsers {
    path: PathBuf,
}

impl StubUsers {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    /// Re-reads the file on every sign-in so edits apply without a restart.
    pub async fn verify(&self, email: &str, password: &str) -> Result<Identity, ApiError> {
        let text = tokio::fs::read_to_string(&self.path)
            .await
            .map_err(|e| ApiError::internal(format!("reading {}: {e}", self.path.display())))?;
        find(&text, email, password).ok_or(ApiError::Unauthorized)
    }
}

fn find(text: &str, email: &str, password: &str) -> Option<Identity> {
    text.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .filter_map(|l| {
            let mut parts = l.splitn(3, ':');
            Some((
                parts.next()?.trim(),
                parts.next()?,
                parts.next().map(str::trim),
            ))
        })
        .find(|(e, p, _)| e.eq_ignore_ascii_case(email.trim()) && *p == password)
        .map(|(e, _, name)| {
            let email = e.to_ascii_lowercase();
            Identity {
                issuer: "stub".into(),
                subject: email.clone(),
                email,
                name: name.filter(|n| !n.is_empty()).map(str::to_owned),
                picture: None,
            }
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FILE: &str = "# comment\n\nAlice@Example.com:pw:Alice Dev\nbob@example.com:secret\n";

    #[test]
    fn matches_case_insensitive_email_and_exact_password() {
        let id = find(FILE, "alice@example.com", "pw").unwrap();
        assert_eq!(id.subject, "alice@example.com");
        assert_eq!(id.name.as_deref(), Some("Alice Dev"));
        assert!(
            find(FILE, "bob@example.com", "secret")
                .unwrap()
                .name
                .is_none()
        );
        assert!(find(FILE, "alice@example.com", "PW").is_none());
        assert!(find(FILE, "carol@example.com", "pw").is_none());
    }
}
