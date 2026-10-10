//! OpenID Connect authorization code flow (with PKCE + nonce) against any
//! discoverable provider.

use std::{
    future::Future,
    pin::Pin,
    sync::Arc,
    time::{Duration, Instant},
};

use openidconnect::{
    AsyncHttpClient, AuthorizationCode, ClaimsVerificationError, ClientId, ClientSecret, CsrfToken,
    EndpointMaybeSet, EndpointNotSet, EndpointSet, HttpRequest, HttpResponse, IssuerUrl, Nonce,
    PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, Scope, TokenResponse,
    core::{CoreAuthenticationFlow, CoreClient, CoreIdTokenClaims, CoreProviderMetadata},
    url::Url,
};
use tokio::sync::RwLock;

use super::{Identity, LoginFailed};
use crate::config::OidcProviderConfig;

/// Re-discover (endpoints + signing keys) at least this often to pick up key rotation.
const METADATA_MAX_AGE: Duration = Duration::from_secs(3600);
/// Floor between forced refreshes so bogus tokens can't trigger a fetch storm.
const MIN_REFRESH: Duration = Duration::from_secs(60);

/// Adapter so openidconnect uses our reqwest version.
pub struct HttpClient(reqwest::Client);

impl HttpClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            // Following redirects opens the client up to SSRF.
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(10))
            .build()
            .expect("HTTP client");
        Self(client)
    }
}

impl Default for HttpClient {
    fn default() -> Self {
        Self::new()
    }
}

impl<'c> AsyncHttpClient<'c> for HttpClient {
    type Error = reqwest::Error;
    type Future = Pin<Box<dyn Future<Output = Result<HttpResponse, Self::Error>> + Send + 'c>>;

    fn call(&'c self, request: HttpRequest) -> Self::Future {
        Box::pin(async move {
            let (parts, body) = request.into_parts();
            let res = self
                .0
                .request(parts.method, parts.uri.to_string())
                .headers(parts.headers)
                .body(body)
                .send()
                .await?;
            let status = res.status();
            let headers = res.headers().clone();
            let mut response = HttpResponse::new(res.bytes().await?.to_vec());
            *response.status_mut() = status;
            *response.headers_mut() = headers;
            Ok(response)
        })
    }
}

type DiscoveredClient = CoreClient<
    EndpointSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointMaybeSet,
    EndpointMaybeSet,
>;

struct Cached {
    client: Arc<DiscoveredClient>,
    fetched_at: Instant,
}

/// Values to persist between `/start` and `/callback`.
pub struct AuthorizationStart {
    pub url: Url,
    pub state: String,
    pub nonce: String,
    pub pkce_verifier: String,
}

pub struct OidcProvider {
    pub name: String,
    pub label: String,
    issuer: IssuerUrl,
    client_id: ClientId,
    client_secret: ClientSecret,
    redirect_url: RedirectUrl,
    scopes: Vec<Scope>,
    cache: RwLock<Option<Cached>>,
}

impl OidcProvider {
    pub fn new(config: &OidcProviderConfig, public_url: &Url) -> Result<Self, String> {
        let issuer = IssuerUrl::new(config.issuer.clone())
            .map_err(|e| format!("provider {}: invalid issuer: {e}", config.name))?;
        let callback = public_url
            .join(&format!("auth/{}/callback", config.name))
            .map_err(|e| format!("provider {}: invalid callback URL: {e}", config.name))?;
        Ok(Self {
            name: config.name.clone(),
            label: config.label.clone().unwrap_or_else(|| config.name.clone()),
            issuer,
            client_id: ClientId::new(config.client_id.clone()),
            client_secret: ClientSecret::new(config.client_secret.clone()),
            redirect_url: RedirectUrl::from_url(callback),
            scopes: config.scopes.iter().cloned().map(Scope::new).collect(),
            cache: RwLock::new(None),
        })
    }

    pub async fn start(&self, http: &HttpClient) -> Result<AuthorizationStart, LoginFailed> {
        let client = self.client(http, false).await?;
        let (challenge, verifier) = PkceCodeChallenge::new_random_sha256();
        let (url, state, nonce) = self
            .scopes
            .iter()
            .fold(
                client.authorize_url(
                    CoreAuthenticationFlow::AuthorizationCode,
                    CsrfToken::new_random,
                    Nonce::new_random,
                ),
                |req, scope| req.add_scope(scope.clone()),
            )
            .set_pkce_challenge(challenge)
            .url();
        Ok(AuthorizationStart {
            url,
            state: state.into_secret(),
            nonce: nonce.secret().clone(),
            pkce_verifier: verifier.into_secret(),
        })
    }

    /// Exchanges the authorization code and verifies the returned ID token.
    pub async fn finish(
        &self,
        http: &HttpClient,
        code: String,
        nonce: String,
        pkce_verifier: String,
    ) -> Result<Identity, LoginFailed> {
        let client = self.client(http, false).await?;
        let token = client
            .exchange_code(AuthorizationCode::new(code))
            .map_err(|e| self.fail("token_exchange_failed", e))?
            .set_pkce_verifier(PkceCodeVerifier::new(pkce_verifier))
            .request_async(http)
            .await
            .map_err(|e| self.fail("token_exchange_failed", e))?;
        let id_token = token
            .id_token()
            .ok_or_else(|| self.fail("invalid_id_token", "no id_token in response"))?;

        let nonce = Nonce::new(nonce);
        let verify =
            |client: &DiscoveredClient| -> Result<CoreIdTokenClaims, ClaimsVerificationError> {
                id_token
                    .claims(&client.id_token_verifier(), &nonce)
                    .cloned()
            };
        let claims = match verify(&client) {
            // Possibly a rotated signing key: refresh metadata once and retry.
            Err(ClaimsVerificationError::SignatureVerification(_)) => {
                verify(&*self.client(http, true).await?)
            }
            other => other,
        }
        .map_err(|e| self.fail("invalid_id_token", e))?;

        if claims.email_verified() == Some(false) {
            return Err(self.fail("email_unverified", "email_verified=false"));
        }
        let email = claims
            .email()
            .map(|e| e.to_string())
            .ok_or_else(|| self.fail("missing_email", "no email claim"))?;

        Ok(Identity {
            issuer: claims.issuer().to_string(),
            subject: claims.subject().to_string(),
            email,
            name: claims
                .name()
                .and_then(|n| n.get(None))
                .map(|n| n.to_string()),
            picture: claims
                .picture()
                .and_then(|p| p.get(None))
                .map(|p| p.to_string()),
        })
    }

    fn fail(&self, code: &'static str, detail: impl std::fmt::Display) -> LoginFailed {
        tracing::warn!(provider = %self.name, "sign-in failed ({code}): {detail}");
        LoginFailed(code)
    }

    /// Discovered client, cached for [`METADATA_MAX_AGE`]. `force` refreshes unless the
    /// cache is younger than [`MIN_REFRESH`]. Falls back to stale metadata if discovery fails.
    async fn client(
        &self,
        http: &HttpClient,
        force: bool,
    ) -> Result<Arc<DiscoveredClient>, LoginFailed> {
        let fresh = |c: &Cached| {
            let age = c.fetched_at.elapsed();
            age < MIN_REFRESH || (!force && age < METADATA_MAX_AGE)
        };
        if let Some(c) = self.cache.read().await.as_ref().filter(|c| fresh(c)) {
            return Ok(c.client.clone());
        }

        let mut cache = self.cache.write().await;
        if let Some(c) = cache.as_ref().filter(|c| fresh(c)) {
            return Ok(c.client.clone());
        }
        match CoreProviderMetadata::discover_async(self.issuer.clone(), http).await {
            Ok(metadata) => {
                let client = Arc::new(
                    CoreClient::from_provider_metadata(
                        metadata,
                        self.client_id.clone(),
                        Some(self.client_secret.clone()),
                    )
                    .set_redirect_uri(self.redirect_url.clone()),
                );
                *cache = Some(Cached {
                    client: client.clone(),
                    fetched_at: Instant::now(),
                });
                Ok(client)
            }
            Err(e) => match cache.as_ref() {
                Some(stale) => {
                    tracing::warn!(provider = %self.name, "discovery failed, using cached metadata: {e}");
                    Ok(stale.client.clone())
                }
                None => Err(self.fail("provider_unavailable", e)),
            },
        }
    }
}
