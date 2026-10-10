pub mod oidc;
pub mod session;
#[cfg(debug_assertions)]
pub mod stub;

use std::collections::BTreeMap;

use crate::config::AuthConfig;

/// Identity asserted by a provider, before it is mapped to a local user.
#[derive(Debug, Clone)]
pub struct Identity {
    /// OIDC issuer URL, or "stub".
    pub issuer: String,
    pub subject: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
}

/// Sign-in failure, reported to the frontend as `login_error=<code>`. Details are logged.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LoginFailed(pub &'static str);

/// Configured sign-in providers.
pub struct Auth {
    pub oidc: BTreeMap<String, oidc::OidcProvider>,
    pub http: oidc::HttpClient,
    #[cfg(debug_assertions)]
    pub stub: Option<stub::StubUsers>,
    pub config: AuthConfig,
}

impl Auth {
    pub fn from_config(config: &AuthConfig) -> Result<Self, String> {
        let oidc = config
            .providers
            .iter()
            .map(|p| {
                Ok((
                    p.name.clone(),
                    oidc::OidcProvider::new(p, &config.public_url)?,
                ))
            })
            .collect::<Result<_, String>>()?;
        #[cfg(debug_assertions)]
        let stub = config.stub_users_file.clone().map(|path| {
            tracing::warn!("STUB sign-in enabled from {} — dev only", path.display());
            stub::StubUsers::new(path)
        });
        Ok(Self {
            oidc,
            http: oidc::HttpClient::new(),
            #[cfg(debug_assertions)]
            stub,
            config: config.clone(),
        })
    }
}
