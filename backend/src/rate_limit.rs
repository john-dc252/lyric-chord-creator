//! Rate-limit tiers on tower_governor. State is in memory, so limits are per
//! process: with N replicas the effective limit is N× the configured one.

use std::{
    net::{IpAddr, Ipv6Addr, SocketAddr},
    sync::Arc,
    time::Duration,
};

use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{HeaderMap, HeaderName, Request, Response},
    response::IntoResponse,
};
use governor::middleware::NoOpMiddleware;
use tower_governor::{
    GovernorError, GovernorLayer,
    governor::{GovernorConfig, GovernorConfigBuilder},
    key_extractor::KeyExtractor,
};
use uuid::Uuid;

use crate::{auth::session::AuthUser, error::ApiError};

/// Signed-in requests are limited per user (so users behind one NAT don't share a
/// bucket); anonymous or invalid-token requests per client IP. Relies on the
/// `authenticate` middleware running first.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum ClientKey {
    User(Uuid),
    Ip(IpAddr),
}

#[derive(Clone)]
pub struct ClientKeyExtractor {
    ip_header: Option<HeaderName>,
}

impl ClientKeyExtractor {
    pub fn new(ip_header: Option<HeaderName>) -> Self {
        Self { ip_header }
    }
}

impl KeyExtractor for ClientKeyExtractor {
    type Key = ClientKey;

    fn extract<T>(&self, req: &Request<T>) -> Result<Self::Key, GovernorError> {
        if let Some(user) = req.extensions().get::<AuthUser>() {
            return Ok(ClientKey::User(user.id));
        }
        let peer = req
            .extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .map(|c| c.0);
        Ok(ClientKey::Ip(group(client_ip(
            req.headers(),
            peer,
            self.ip_header.as_ref(),
        ))))
    }
}

/// IPv6 clients usually control a whole /64, so they share one bucket.
fn group(ip: IpAddr) -> IpAddr {
    match ip {
        IpAddr::V6(v6) => match v6.to_ipv4_mapped() {
            Some(v4) => IpAddr::V4(v4),
            None => {
                let mut segments = v6.segments();
                segments[4..].fill(0);
                IpAddr::V6(Ipv6Addr::from(segments))
            }
        },
        v4 => v4,
    }
}

/// Client address from `ip_header` (set by a trusted reverse proxy) or the TCP peer.
/// For list headers like `X-Forwarded-For`, the last entry is the one the proxy added.
fn client_ip(
    headers: &HeaderMap,
    peer: Option<SocketAddr>,
    ip_header: Option<&HeaderName>,
) -> IpAddr {
    ip_header
        .and_then(|name| headers.get(name))
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.rsplit(',').map(str::trim).find(|s| !s.is_empty()))
        .and_then(|s| s.parse().ok())
        .or(peer.map(|p| p.ip()))
        .unwrap_or(IpAddr::from([0, 0, 0, 0]))
}

pub type TierLayer = GovernorLayer<ClientKeyExtractor, NoOpMiddleware, Body>;

/// Builds a layer allowing a burst of `per_minute` requests, refilling at `per_minute`
/// per minute. Returns `None` when `per_minute` is 0 (tier disabled).
pub fn tier(per_minute: u32, extractor: ClientKeyExtractor) -> Option<TierLayer> {
    if per_minute == 0 {
        return None;
    }
    let config: Arc<GovernorConfig<ClientKeyExtractor, NoOpMiddleware>> = Arc::new(
        GovernorConfigBuilder::default()
            .period(Duration::from_secs(60) / per_minute)
            .burst_size(per_minute)
            .key_extractor(extractor)
            .finish()
            .expect("non-zero period and burst"),
    );

    // Evict idle keys so the map doesn't grow without bound.
    let limiter = config.limiter().clone();
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(60));
        loop {
            tick.tick().await;
            limiter.retain_recent();
        }
    });

    Some(GovernorLayer::new(config).error_handler(error_response))
}

fn error_response(e: GovernorError) -> Response<Body> {
    match e {
        GovernorError::TooManyRequests { wait_time, .. } => {
            ApiError::RateLimited(Duration::from_secs(wait_time.max(1))).into_response()
        }
        other => ApiError::internal(other).into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ip(s: &str) -> IpAddr {
        s.parse().unwrap()
    }

    #[test]
    fn groups_ipv6_by_64() {
        assert_eq!(
            group(ip("2001:db8:1:2::1")),
            group(ip("2001:db8:1:2:ffff::9"))
        );
        assert_ne!(group(ip("2001:db8:1:2::1")), group(ip("2001:db8:1:3::1")));
        assert_eq!(group(ip("::ffff:10.0.0.1")), ip("10.0.0.1"));
        assert_eq!(group(ip("10.0.0.1")), ip("10.0.0.1"));
    }

    #[test]
    fn resolves_client_ip() {
        let peer = Some("192.0.2.1:5000".parse().unwrap());
        let xff = HeaderName::from_static("x-forwarded-for");
        let mut headers = HeaderMap::new();
        headers.insert(&xff, "1.1.1.1, 203.0.113.7".parse().unwrap());

        assert_eq!(
            client_ip(&headers, peer, None),
            ip("192.0.2.1"),
            "header ignored unless configured"
        );
        assert_eq!(client_ip(&headers, peer, Some(&xff)), ip("203.0.113.7"));
        assert_eq!(
            client_ip(&HeaderMap::new(), peer, Some(&xff)),
            ip("192.0.2.1"),
            "falls back to peer"
        );
        headers.insert(&xff, "garbage".parse().unwrap());
        assert_eq!(client_ip(&headers, peer, Some(&xff)), ip("192.0.2.1"));
    }

    #[test]
    fn keys_by_authenticated_user_else_ip() {
        let extractor = ClientKeyExtractor::new(None);
        let user = AuthUser {
            id: Uuid::new_v4(),
            session_id: Uuid::new_v4(),
        };
        let mut req = Request::builder().body(()).unwrap();
        assert_eq!(
            extractor.extract(&req).unwrap(),
            ClientKey::Ip(ip("0.0.0.0"))
        );
        req.extensions_mut().insert(user);
        assert_eq!(extractor.extract(&req).unwrap(), ClientKey::User(user.id));
    }
}
