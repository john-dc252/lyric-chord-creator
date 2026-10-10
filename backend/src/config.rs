use std::{env, net::SocketAddr, time::Duration};

use axum::http::{HeaderName, HeaderValue};
use openidconnect::url::Url;
use serde::Deserialize;

/// Reads a setting from the runtime environment, falling back to the value
/// captured at compile time (`VAR=... cargo build --release`).
/// Empty values count as unset (e.g. Docker build args that weren't provided).
macro_rules! setting {
    ($name:literal) => {
        env::var($name).ok().filter(|v| !v.is_empty()).or_else(|| {
            option_env!($name)
                .filter(|v| !v.is_empty())
                .map(str::to_owned)
        })
    };
}

/// One OpenID Connect provider; endpoints and keys come from `{issuer}/.well-known/openid-configuration`.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OidcProviderConfig {
    /// URL-safe id used in routes: `/auth/{name}/start`.
    pub name: String,
    /// Display name for the sign-in button.
    pub label: Option<String>,
    pub issuer: String,
    pub client_id: String,
    pub client_secret: String,
    /// Requested in addition to `openid`.
    #[serde(default = "default_scopes")]
    pub scopes: Vec<String>,
}

fn default_scopes() -> Vec<String> {
    vec!["email".into(), "profile".into()]
}

#[derive(Clone, Debug)]
pub struct AuthConfig {
    pub providers: Vec<OidcProviderConfig>,
    /// Dev-only: credentials read from a plain text file. Not compiled into release builds.
    #[cfg(debug_assertions)]
    pub stub_users_file: Option<std::path::PathBuf>,
    /// Externally reachable base URL of this API; callback URLs are built from it.
    pub public_url: Url,
    /// Where the browser is sent after sign-in, with `login_code` or `login_error` appended.
    pub frontend_url: Url,
}

/// Requests per minute per client (also the burst size). 0 disables a tier.
#[derive(Clone, Debug)]
pub struct RateLimitConfig {
    /// `/auth/{provider}/start|callback`, `/auth/exchange`, stub login.
    pub sign_in_per_minute: u32,
    /// `/auth/config`, `/auth/me`.
    pub auth_read_per_minute: u32,
    pub template_read_per_minute: u32,
    pub template_write_per_minute: u32,
    /// Header carrying the client IP when behind a trusted reverse proxy.
    pub client_ip_header: Option<HeaderName>,
}

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub db_max_connections: u32,
    pub bind_addr: SocketAddr,
    pub cors_origins: Vec<HeaderValue>,
    /// Sessions expire after this much inactivity…
    pub session_idle_ttl: Duration,
    /// …or this long after sign-in, whichever comes first.
    pub session_max_age: Duration,
    pub auth: AuthConfig,
    pub rate_limit: RateLimitConfig,
}

#[derive(Debug, thiserror::Error)]
#[error("config: {0}")]
pub struct ConfigError(String);

fn required(name: &str, value: Option<String>) -> Result<String, ConfigError> {
    value
        .filter(|v| !v.trim().is_empty())
        .ok_or_else(|| ConfigError(format!("{name} is required")))
}

fn list(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
        .collect()
}

fn parse<T: std::str::FromStr>(
    name: &str,
    value: Option<String>,
    default: T,
) -> Result<T, ConfigError> {
    match value {
        Some(v) => v
            .parse()
            .map_err(|_| ConfigError(format!("{name} is invalid: {v}"))),
        None => Ok(default),
    }
}

fn url(name: &str, value: Option<String>) -> Result<Url, ConfigError> {
    let v = required(name, value)?;
    Url::parse(&v).map_err(|_| ConfigError(format!("{name} is not a valid URL: {v}")))
}

fn providers(value: Option<String>) -> Result<Vec<OidcProviderConfig>, ConfigError> {
    let Some(json) = value.filter(|v| !v.trim().is_empty()) else {
        return Ok(vec![]);
    };
    let providers: Vec<OidcProviderConfig> = serde_json::from_str(&json)
        .map_err(|e| ConfigError(format!("OIDC_PROVIDERS is invalid: {e}")))?;
    let mut names = std::collections::HashSet::new();
    for p in &providers {
        let valid = !p.name.is_empty()
            && p.name
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
        if !valid || p.name == "stub" {
            return Err(ConfigError(format!(
                "OIDC provider name must match [a-z0-9-]+ and not be \"stub\": {}",
                p.name
            )));
        }
        if !names.insert(&p.name) {
            return Err(ConfigError(format!("duplicate OIDC provider: {}", p.name)));
        }
    }
    Ok(providers)
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let stub_users_file = setting!("STUB_USERS_FILE").filter(|v| !v.trim().is_empty());
        #[cfg(not(debug_assertions))]
        if stub_users_file.is_some() {
            return Err(ConfigError(
                "STUB_USERS_FILE is unavailable in release builds".into(),
            ));
        }

        let auth = AuthConfig {
            providers: providers(setting!("OIDC_PROVIDERS"))?,
            #[cfg(debug_assertions)]
            stub_users_file: stub_users_file.map(Into::into),
            public_url: url("PUBLIC_URL", setting!("PUBLIC_URL"))?,
            frontend_url: url("FRONTEND_URL", setting!("FRONTEND_URL"))?,
        };
        #[cfg(debug_assertions)]
        let has_stub = auth.stub_users_file.is_some();
        #[cfg(not(debug_assertions))]
        let has_stub = false;
        if auth.providers.is_empty() && !has_stub {
            return Err(ConfigError(
                "configure at least one sign-in provider (OIDC_PROVIDERS)".into(),
            ));
        }

        let cors_origins = list(&setting!("CORS_ORIGINS").unwrap_or_default())
            .into_iter()
            .map(|s| {
                HeaderValue::from_str(&s)
                    .map_err(|_| ConfigError(format!("invalid CORS origin: {s}")))
            })
            .collect::<Result<_, _>>()?;

        Ok(Self {
            database_url: required("DATABASE_URL", setting!("DATABASE_URL"))?,
            db_max_connections: parse("DB_MAX_CONNECTIONS", setting!("DB_MAX_CONNECTIONS"), 10)?,
            bind_addr: parse(
                "BIND_ADDR",
                setting!("BIND_ADDR"),
                SocketAddr::from(([127, 0, 0, 1], 8080)),
            )?,
            cors_origins,
            session_idle_ttl: Duration::from_secs(
                3600 * parse("SESSION_IDLE_HOURS", setting!("SESSION_IDLE_HOURS"), 168u64)?,
            ),
            session_max_age: Duration::from_secs(
                86400
                    * parse(
                        "SESSION_MAX_AGE_DAYS",
                        setting!("SESSION_MAX_AGE_DAYS"),
                        90u64,
                    )?,
            ),
            auth,
            rate_limit: RateLimitConfig {
                sign_in_per_minute: parse(
                    "RATE_LIMIT_SIGN_IN_PER_MINUTE",
                    setting!("RATE_LIMIT_SIGN_IN_PER_MINUTE"),
                    10,
                )?,
                auth_read_per_minute: parse(
                    "RATE_LIMIT_AUTH_READ_PER_MINUTE",
                    setting!("RATE_LIMIT_AUTH_READ_PER_MINUTE"),
                    60,
                )?,
                template_read_per_minute: parse(
                    "RATE_LIMIT_TEMPLATE_READ_PER_MINUTE",
                    setting!("RATE_LIMIT_TEMPLATE_READ_PER_MINUTE"),
                    300,
                )?,
                template_write_per_minute: parse(
                    "RATE_LIMIT_TEMPLATE_WRITE_PER_MINUTE",
                    setting!("RATE_LIMIT_TEMPLATE_WRITE_PER_MINUTE"),
                    120,
                )?,
                client_ip_header: setting!("CLIENT_IP_HEADER")
                    .filter(|v| !v.trim().is_empty())
                    .map(|v| {
                        HeaderName::try_from(v.trim())
                            .map_err(|_| ConfigError(format!("invalid CLIENT_IP_HEADER: {v}")))
                    })
                    .transpose()?,
            },
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_providers() {
        let p = providers(Some(
            r#"[{"name":"google","issuer":"https://accounts.google.com","clientId":"id","clientSecret":"s"}]"#.into(),
        ))
        .unwrap();
        assert_eq!(p[0].scopes, ["email", "profile"]);
        assert!(providers(None).unwrap().is_empty());
    }

    #[test]
    fn rejects_bad_provider_names() {
        let one = |name: &str| {
            providers(Some(format!(
                r#"[{{"name":"{name}","issuer":"https://x","clientId":"i","clientSecret":"s"}}]"#
            )))
        };
        assert!(one("Google").is_err());
        assert!(one("stub").is_err());
        assert!(one("a/b").is_err());
        assert!(one("ok-1").is_ok());
        let dup = r#"[{"name":"a","issuer":"https://x","clientId":"i","clientSecret":"s"},
                      {"name":"a","issuer":"https://y","clientId":"i","clientSecret":"s"}]"#;
        assert!(providers(Some(dup.into())).is_err());
    }
}
