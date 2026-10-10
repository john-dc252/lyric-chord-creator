//! End-to-end API tests. Require the dev database: `docker compose up -d`.
//! Each test signs in fresh users, so tests are isolated and re-runnable.
//! Uses stub auth, so only built in debug profile.
#![cfg(debug_assertions)]

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};

use axum::{
    Form, Json, Router,
    body::Body,
    http::{Method, Request, StatusCode, header},
    response::Response,
    routing::{get, post},
};
use http_body_util::BodyExt;
use lyric_chord_backend::{
    app,
    config::{AuthConfig, Config, OidcProviderConfig, RateLimitConfig},
    init_state,
};
use openidconnect::url::{Url, form_urlencoded};
use serde_json::{Value, json};
use tower::ServiceExt;
use uuid::Uuid;

const PUBLIC_URL: &str = "http://api.test/";
const FRONTEND_URL: &str = "http://app.test/apps/lcc/";

struct TestApp {
    router: Router,
    users_file: std::path::PathBuf,
}

impl Drop for TestApp {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.users_file);
    }
}

fn limits() -> RateLimitConfig {
    RateLimitConfig {
        sign_in_per_minute: 100,
        auth_read_per_minute: 100,
        template_read_per_minute: 1000,
        template_write_per_minute: 1000,
        client_ip_header: None,
    }
}

async fn setup(users: &[(&str, &str)]) -> TestApp {
    setup_with(users, limits(), vec![]).await
}

async fn setup_with(
    users: &[(&str, &str)],
    rate_limit: RateLimitConfig,
    providers: Vec<OidcProviderConfig>,
) -> TestApp {
    setup_custom(users, |c| {
        c.rate_limit = rate_limit;
        c.auth.providers = providers;
    })
    .await
}

async fn setup_custom(users: &[(&str, &str)], customize: impl FnOnce(&mut Config)) -> TestApp {
    dotenvy::dotenv().ok();
    let users_file = std::env::temp_dir().join(format!("lcc-users-{}.txt", Uuid::new_v4()));
    let lines: String = users
        .iter()
        .map(|(e, p)| format!("{e}:{p}:Test User\n"))
        .collect();
    std::fs::write(&users_file, lines).unwrap();

    let mut config = Config {
        database_url: std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://lcc:lcc@localhost:5432/lcc".into()),
        db_max_connections: 5,
        bind_addr: "127.0.0.1:0".parse().unwrap(),
        cors_origins: vec![],
        session_idle_ttl: Duration::from_secs(3600),
        session_max_age: Duration::from_secs(86400),
        auth: AuthConfig {
            providers: vec![],
            stub_users_file: Some(users_file.clone()),
            public_url: Url::parse(PUBLIC_URL).unwrap(),
            frontend_url: Url::parse(FRONTEND_URL).unwrap(),
        },
        rate_limit: limits(),
    };
    customize(&mut config);
    let state = init_state(&config)
        .await
        .expect("database (docker compose up -d)");
    TestApp {
        router: app(state, &config),
        users_file,
    }
}

fn client_state() -> String {
    Uuid::new_v4().simple().to_string()
}

fn form(pairs: &[(&str, &str)]) -> String {
    form_urlencoded::Serializer::new(String::new())
        .extend_pairs(pairs)
        .finish()
}

fn location(res: &Response) -> String {
    assert_eq!(res.status(), StatusCode::SEE_OTHER, "expected redirect");
    res.headers()[header::LOCATION].to_str().unwrap().to_owned()
}

fn params(url: &str) -> HashMap<String, String> {
    Url::parse(url)
        .unwrap()
        .query_pairs()
        .into_owned()
        .collect()
}

/// Asserts a redirect to the frontend and returns its query parameters.
fn frontend_params(res: &Response) -> HashMap<String, String> {
    let loc = location(res);
    assert!(loc.starts_with(FRONTEND_URL), "{loc}");
    params(&loc)
}

impl TestApp {
    async fn raw(&self, req: Request<Body>) -> Response {
        self.router.clone().oneshot(req).await.unwrap()
    }

    async fn get(&self, uri: &str) -> Response {
        self.raw(Request::get(uri).body(Body::empty()).unwrap())
            .await
    }

    async fn call(
        &self,
        method: Method,
        uri: &str,
        token: Option<&str>,
        body: Option<Value>,
    ) -> (StatusCode, Value) {
        let mut req = Request::builder().method(method).uri(uri);
        if let Some(t) = token {
            req = req.header("authorization", format!("Bearer {t}"));
        }
        let req = match body {
            Some(b) => req
                .header("content-type", "application/json")
                .body(Body::from(b.to_string())),
            None => req.body(Body::empty()),
        }
        .unwrap();
        let res = self.raw(req).await;
        let status = res.status();
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        (
            status,
            serde_json::from_slice(&bytes).unwrap_or(Value::Null),
        )
    }

    async fn stub_submit(&self, client_state: &str, email: &str, password: &str) -> Response {
        let body = form(&[
            ("client_state", client_state),
            ("email", email),
            ("password", password),
        ]);
        self.raw(
            Request::post("/auth/stub/login")
                .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
    }

    /// Runs the stub login form and returns the single-use login code.
    async fn stub_login_code(&self, email: &str, password: &str) -> String {
        let cs = client_state();
        let p = frontend_params(&self.stub_submit(&cs, email, password).await);
        assert_eq!(p["client_state"], cs);
        p["login_code"].clone()
    }

    async fn exchange(&self, code: &str) -> (StatusCode, Value) {
        self.call(
            Method::POST,
            "/auth/exchange",
            None,
            Some(json!({ "code": code })),
        )
        .await
    }

    async fn sign_in(&self, email: &str, password: &str) -> String {
        let code = self.stub_login_code(email, password).await;
        let (status, body) = self.exchange(&code).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        body["token"].as_str().unwrap().to_owned()
    }
}

fn email() -> String {
    format!("{}@example.com", Uuid::new_v4())
}

#[tokio::test]
async fn stub_sign_in_flow() {
    let alice = email();
    let t = setup(&[(&alice, "pw")]).await;

    let (status, body) = t.call(Method::GET, "/auth/config", None, None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body["providers"],
        json!([{ "name": "stub", "label": "Stub (dev)", "startUrl": "http://api.test/auth/stub/login" }])
    );

    // client_state is required and must be well-formed.
    let p = frontend_params(&t.get("/auth/stub/login").await);
    assert_eq!(p["login_error"], "invalid_client_state");
    let p = frontend_params(&t.get("/auth/stub/login?client_state=%3Cscript%3E").await);
    assert_eq!(p["login_error"], "invalid_client_state");

    let cs = client_state();
    let page = t.get(&format!("/auth/stub/login?client_state={cs}")).await;
    assert_eq!(page.status(), StatusCode::OK);
    let html = String::from_utf8(
        page.into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .to_vec(),
    )
    .unwrap();
    assert!(html.contains(&format!(r#"value="{cs}""#)));

    let wrong = t.stub_submit(&cs, &alice, "nope").await;
    assert_eq!(location(&wrong), format!("login?client_state={cs}&error=1"));

    // Login codes are single use.
    let code = t.stub_login_code(&alice.to_uppercase(), "pw").await;
    let (status, session) = t.exchange(&code).await;
    assert_eq!(status, StatusCode::OK, "{session}");
    assert_eq!(session["user"]["email"], alice);
    let (status, body) = t.exchange(&code).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "Sign-in code is invalid or expired.");

    let token = session["token"].as_str().unwrap();
    let (status, me) = t.call(Method::GET, "/auth/me", Some(token), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(me["email"], alice);

    // Signing in again maps to the same user.
    let token2 = t.sign_in(&alice, "pw").await;
    let (_, me2) = t.call(Method::GET, "/auth/me", Some(&token2), None).await;
    assert_eq!(me["id"], me2["id"]);

    assert_eq!(
        t.get(&format!("/auth/nope/start?client_state={cs}"))
            .await
            .status(),
        StatusCode::NOT_FOUND
    );
    let (status, _) = t.call(Method::GET, "/templates", None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = t
        .call(Method::GET, "/templates", Some("garbage"), None)
        .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

/// Minimal OpenID provider: discovery, JWKS, and a token endpoint that signs ID
/// tokens with the test key and whatever nonce the test sets.
struct MockIdp {
    issuer: String,
    subject: String,
    email: String,
    nonce: Arc<Mutex<String>>,
    token_requests: Arc<Mutex<Vec<HashMap<String, String>>>>,
}

async fn mock_idp() -> MockIdp {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", listener.local_addr().unwrap());
    let idp = MockIdp {
        issuer: issuer.clone(),
        subject: Uuid::new_v4().to_string(),
        email: email(),
        nonce: Arc::default(),
        token_requests: Arc::default(),
    };

    let discovery = json!({
        "issuer": issuer,
        "authorization_endpoint": format!("{issuer}/authorize"),
        "token_endpoint": format!("{issuer}/token"),
        "jwks_uri": format!("{issuer}/jwks"),
        "response_types_supported": ["code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
    });
    let jwks: Value = serde_json::from_str(include_str!("fixtures/oidc_test_jwks.json")).unwrap();
    let (iss, sub, mail) = (issuer.clone(), idp.subject.clone(), idp.email.clone());
    let (nonce, requests) = (idp.nonce.clone(), idp.token_requests.clone());

    let token = move |Form(req): Form<HashMap<String, String>>| {
        requests.lock().unwrap().push(req);
        let now = jsonwebtoken::get_current_timestamp();
        let claims = json!({
            "iss": iss, "sub": sub, "aud": "test-client", "iat": now, "exp": now + 300,
            "nonce": *nonce.lock().unwrap(), "email": mail, "email_verified": true, "name": "Oidc User",
        });
        let mut header = jsonwebtoken::Header::new(jsonwebtoken::Algorithm::RS256);
        header.kid = Some("test-key".into());
        let key =
            jsonwebtoken::EncodingKey::from_rsa_pem(include_bytes!("fixtures/oidc_test_key.pem"))
                .unwrap();
        let id_token = jsonwebtoken::encode(&header, &claims, &key).unwrap();
        async move {
            Json(
                json!({ "access_token": "at", "token_type": "Bearer", "expires_in": 300, "id_token": id_token }),
            )
        }
    };
    let router = Router::new()
        .route(
            "/.well-known/openid-configuration",
            get(move || async move { Json(discovery) }),
        )
        .route("/jwks", get(move || async move { Json(jwks) }))
        .route("/token", post(token));
    tokio::spawn(async move { axum::serve(listener, router).await.unwrap() });
    idp
}

#[tokio::test]
async fn oidc_sign_in_flow() {
    let idp = mock_idp().await;
    let provider = OidcProviderConfig {
        name: "mock".into(),
        label: Some("Mock".into()),
        issuer: idp.issuer.clone(),
        client_id: "test-client".into(),
        client_secret: "secret".into(),
        scopes: vec!["email".into(), "profile".into()],
    };
    let t = setup_with(&[], limits(), vec![provider]).await;

    let (_, config) = t.call(Method::GET, "/auth/config", None, None).await;
    assert_eq!(
        config["providers"][0]["startUrl"],
        "http://api.test/auth/mock/start"
    );

    // Starts an authorization request; returns (state, nonce).
    let start = |cs: String| {
        let t = &t;
        let issuer = idp.issuer.clone();
        async move {
            let loc = location(&t.get(&format!("/auth/mock/start?client_state={cs}")).await);
            assert!(loc.starts_with(&format!("{issuer}/authorize?")), "{loc}");
            let p = params(&loc);
            assert_eq!(p["client_id"], "test-client");
            assert_eq!(p["response_type"], "code");
            assert_eq!(p["scope"], "openid email profile");
            assert_eq!(p["code_challenge_method"], "S256");
            assert_eq!(p["redirect_uri"], "http://api.test/auth/mock/callback");
            (p["state"].clone(), p["nonce"].clone())
        }
    };

    let cs = client_state();
    let (state, nonce) = start(cs.clone()).await;
    *idp.nonce.lock().unwrap() = nonce;
    let callback = format!("/auth/mock/callback?code=c1&state={state}");
    let p = frontend_params(&t.get(&callback).await);
    assert_eq!(p["client_state"], cs);
    {
        let reqs = idp.token_requests.lock().unwrap();
        let req = reqs.last().unwrap();
        assert_eq!(req["grant_type"], "authorization_code");
        assert_eq!(req["code"], "c1");
        assert_eq!(req["redirect_uri"], "http://api.test/auth/mock/callback");
        assert!(req["code_verifier"].len() >= 43, "PKCE verifier sent");
    }
    let (status, session) = t.exchange(&p["login_code"]).await;
    assert_eq!(status, StatusCode::OK, "{session}");
    assert_eq!(session["user"]["email"], idp.email);
    assert_eq!(session["user"]["name"], "Oidc User");

    // States are single use.
    let p = frontend_params(&t.get(&callback).await);
    assert_eq!(p["login_error"], "invalid_state");
    assert!(!p.contains_key("client_state"));

    // ID token nonce must match the one we issued.
    let cs = client_state();
    let (state, _) = start(cs.clone()).await;
    *idp.nonce.lock().unwrap() = "wrong".into();
    let p = frontend_params(
        &t.get(&format!("/auth/mock/callback?code=c2&state={state}"))
            .await,
    );
    assert_eq!(
        (p["login_error"].as_str(), p["client_state"].as_str()),
        ("invalid_id_token", cs.as_str())
    );

    // Provider-side denial.
    let cs = client_state();
    let (state, _) = start(cs.clone()).await;
    let p = frontend_params(
        &t.get(&format!(
            "/auth/mock/callback?error=access_denied&state={state}"
        ))
        .await,
    );
    assert_eq!(
        (p["login_error"].as_str(), p["client_state"].as_str()),
        ("access_denied", cs.as_str())
    );

    // Same issuer + subject maps to the same user.
    let (state, nonce) = start(client_state()).await;
    *idp.nonce.lock().unwrap() = nonce;
    let p = frontend_params(
        &t.get(&format!("/auth/mock/callback?code=c3&state={state}"))
            .await,
    );
    let (_, again) = t.exchange(&p["login_code"]).await;
    assert_eq!(again["user"]["id"], session["user"]["id"]);
}

#[tokio::test]
async fn template_crud_and_isolation() {
    let (alice, bob) = (email(), email());
    let t = setup(&[(&alice, "a"), (&bob, "b")]).await;
    let ta = t.sign_in(&alice, "a").await;
    let tb = t.sign_in(&bob, "b").await;

    let content =
        "@title: Amazing Grace\n@artist: John Newton\n{G}Amazing grace how {C}sweet the sound";
    let (status, created) = t
        .call(
            Method::POST,
            "/templates",
            Some(&ta),
            Some(json!({ "name": " Hymn ", "content": content })),
        )
        .await;
    assert_eq!(status, StatusCode::CREATED, "{created}");
    assert_eq!(created["name"], "Hymn");
    assert_eq!(created["title"], "Amazing Grace");
    assert_eq!(created["artist"], "John Newton");
    assert!(created["createdAt"].is_i64());
    let id = created["id"].as_str().unwrap();

    // Case-insensitive unique names per user; other users unaffected.
    let (status, body) = t
        .call(
            Method::POST,
            "/templates",
            Some(&ta),
            Some(json!({ "name": "hymn", "content": "" })),
        )
        .await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert!(body["error"].as_str().unwrap().contains("already exists"));
    let (status, _) = t
        .call(
            Method::POST,
            "/templates",
            Some(&tb),
            Some(json!({ "name": "Hymn", "content": "" })),
        )
        .await;
    assert_eq!(status, StatusCode::CREATED);
    let (status, _) = t
        .call(
            Method::POST,
            "/templates",
            Some(&ta),
            Some(json!({ "name": "  ", "content": "" })),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Bob can't see, edit or delete Alice's template.
    let uri = format!("/templates/{id}");
    assert_eq!(
        t.call(Method::GET, &uri, Some(&tb), None).await.0,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        t.call(Method::DELETE, &uri, Some(&tb), None).await.0,
        StatusCode::NOT_FOUND
    );
    let (status, _) = t
        .call(
            Method::PUT,
            &uri,
            Some(&tb),
            Some(json!({ "name": "Stolen", "content": "" })),
        )
        .await;
    assert_eq!(status, StatusCode::CONFLICT);

    // Update recomputes metadata.
    let (status, updated) = t
        .call(
            Method::PUT,
            &uri,
            Some(&ta),
            Some(json!({ "name": "Hymn", "content": "@title: Renamed" })),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["title"], "Renamed");
    assert!(updated.get("artist").is_none());
    assert_eq!(updated["createdAt"], created["createdAt"]);

    // PUT to a new id creates it, keeping supplied timestamps (local sync).
    let local_id = Uuid::new_v4();
    let (status, synced) = t
        .call(
            Method::PUT,
            &format!("/templates/{local_id}"),
            Some(&ta),
            Some(json!({ "name": "Local", "content": "x", "createdAt": 1700000000000i64, "updatedAt": 1700000001000i64 })),
        )
        .await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(synced["createdAt"], 1700000000000i64);
    assert_eq!(synced["updatedAt"], 1700000001000i64);

    let (_, list) = t.call(Method::GET, "/templates", Some(&ta), None).await;
    let names: Vec<_> = list
        .as_array()
        .unwrap()
        .iter()
        .map(|t| t["name"].as_str().unwrap())
        .collect();
    assert_eq!(names, ["Hymn", "Local"], "sorted by updatedAt desc");

    assert_eq!(
        t.call(Method::DELETE, &uri, Some(&ta), None).await.0,
        StatusCode::NO_CONTENT
    );
    assert_eq!(
        t.call(Method::GET, &uri, Some(&ta), None).await.0,
        StatusCode::NOT_FOUND
    );
}

#[tokio::test]
async fn search() {
    let alice = email();
    let t = setup(&[(&alice, "a")]).await;
    let ta = t.sign_in(&alice, "a").await;

    for (name, content) in [
        (
            "Sunday Set",
            "@title: Amazing Grace\n@artist: John Newton\n{G}How sweet the sound",
        ),
        (
            "Rock",
            "@title: Bohemian Rhapsody\n@artist: Queen\nIs this the real life",
        ),
        (
            "100% Hits",
            "@title: Hey Jude\n@artist: The Beatles\nTake a sad song",
        ),
        (
            "Medley",
            "@title: Opening\n@artist: Band A\nla\n@title: Wonderwall\n@artist: Oasis\nla",
        ),
    ] {
        let (status, _) = t
            .call(
                Method::POST,
                "/templates",
                Some(&ta),
                Some(json!({ "name": name, "content": content })),
            )
            .await;
        assert_eq!(status, StatusCode::CREATED);
    }

    let names = |v: Value| -> Vec<String> {
        v.as_array()
            .unwrap()
            .iter()
            .map(|t| t["name"].as_str().unwrap().to_owned())
            .collect()
    };
    let search = |q: &str, field: &str| {
        let uri = format!(
            "/templates?q={}&field={field}",
            q.replace('%', "%25").replace(' ', "%20")
        );
        let ta = ta.clone();
        let t = &t;
        async move {
            let (status, body) = t.call(Method::GET, &uri, Some(&ta), None).await;
            assert_eq!(status, StatusCode::OK, "{body}");
            names(body)
        }
    };

    assert_eq!(
        search("sweet sound", "all").await,
        ["Sunday Set"],
        "full-text, non-adjacent words"
    );
    assert_eq!(search("rhaps", "all").await, ["Rock"], "substring on title");
    assert_eq!(search("queen", "artist").await, ["Rock"]);
    assert_eq!(search("queen", "title").await, Vec::<String>::new());
    assert_eq!(search("real life", "lyrics").await, ["Rock"]);
    assert_eq!(search("sun", "name").await, ["Sunday Set"]);
    assert_eq!(
        search("100%", "name").await,
        ["100% Hits"],
        "LIKE wildcards are escaped"
    );
    assert_eq!(search("%", "name").await, ["100% Hits"]);
    assert_eq!(search("", "all").await.len(), 4);
    // Title/artist filters match any song, not just the first.
    assert_eq!(search("wonderwall", "title").await, ["Medley"]);
    assert_eq!(search("oasis", "artist").await, ["Medley"]);
    assert_eq!(search("oasis", "all").await, ["Medley"]);
}

#[tokio::test]
async fn rate_limits_per_tier_and_client() {
    let (alice, bob) = (email(), email());
    let rate_limit = RateLimitConfig {
        auth_read_per_minute: 2,
        template_read_per_minute: 1,
        client_ip_header: Some(header::HeaderName::from_static("x-forwarded-for")),
        ..limits()
    };
    let t = setup_with(&[(&alice, "a"), (&bob, "b")], rate_limit, vec![]).await;
    let send = |uri: &str, ip: &str, token: Option<&str>| {
        let mut req = Request::get(uri).header("x-forwarded-for", ip);
        if let Some(token) = token {
            req = req.header(header::AUTHORIZATION, format!("Bearer {token}"));
        }
        t.raw(req.body(Body::empty()).unwrap())
    };

    for _ in 0..2 {
        assert_eq!(
            send("/auth/config", "203.0.113.1", None).await.status(),
            StatusCode::OK
        );
    }
    let limited = send("/auth/config", "203.0.113.1", None).await;
    assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
    let retry: u64 = limited.headers()["retry-after"]
        .to_str()
        .unwrap()
        .parse()
        .unwrap();
    assert!((1..=30).contains(&retry), "{retry}");
    let body: Value =
        serde_json::from_slice(&limited.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .starts_with("Too many requests.")
    );

    // Other IPs, other tiers and /health are unaffected.
    assert_eq!(
        send("/auth/config", "203.0.113.2", None).await.status(),
        StatusCode::OK
    );
    for _ in 0..10 {
        assert_eq!(
            send("/health", "203.0.113.1", None).await.status(),
            StatusCode::OK
        );
    }

    // Signed-in requests are limited per user, not per IP.
    let (ta, tb) = (t.sign_in(&alice, "a").await, t.sign_in(&bob, "b").await);
    assert_eq!(
        send("/templates", "203.0.113.9", Some(&ta)).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        send("/templates", "203.0.113.9", Some(&ta)).await.status(),
        StatusCode::TOO_MANY_REQUESTS
    );
    assert_eq!(
        send("/templates", "203.0.113.9", Some(&tb)).await.status(),
        StatusCode::OK
    );
}

#[tokio::test]
async fn sessions_can_be_revoked() {
    let alice = email();
    let t = setup(&[(&alice, "a")]).await;
    let (t1, t2, t3) = (
        t.sign_in(&alice, "a").await,
        t.sign_in(&alice, "a").await,
        t.sign_in(&alice, "a").await,
    );
    let me = |token: String| {
        let t = &t;
        async move { t.call(Method::GET, "/auth/me", Some(&token), None).await.0 }
    };

    assert_eq!(
        t.call(Method::POST, "/auth/logout", Some(&t1), None)
            .await
            .0,
        StatusCode::NO_CONTENT
    );
    assert_eq!(
        me(t1.clone()).await,
        StatusCode::UNAUTHORIZED,
        "logged-out session rejected"
    );
    assert_eq!(
        me(t2.clone()).await,
        StatusCode::OK,
        "other sessions unaffected"
    );

    assert_eq!(
        t.call(Method::POST, "/auth/logout-all", Some(&t2), None)
            .await
            .0,
        StatusCode::NO_CONTENT
    );
    assert_eq!(me(t2).await, StatusCode::UNAUTHORIZED);
    assert_eq!(me(t3).await, StatusCode::UNAUTHORIZED);
    assert_eq!(
        t.call(Method::POST, "/auth/logout", None, None).await.0,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn batch_create() {
    let alice = email();
    let t = setup(&[(&alice, "a")]).await;
    let ta = t.sign_in(&alice, "a").await;

    let (status, results) = t
        .call(
            Method::POST,
            "/templates/batch",
            Some(&ta),
            Some(json!({ "templates": [
                { "name": "One", "content": "@title: One", "createdAt": 1700000000000i64 },
                { "name": "one", "content": "dup" },
                { "name": " ", "content": "blank" },
                { "name": "Two", "content": "@title: Two" },
            ]})),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{results}");
    let r = results.as_array().unwrap();
    assert_eq!(r[0]["template"]["title"], "One");
    assert_eq!(r[0]["template"]["createdAt"], 1700000000000i64);
    assert_eq!(r[1]["status"], 409);
    assert!(r[1]["error"].as_str().unwrap().contains("already exists"));
    assert_eq!(r[2]["status"], 400);
    assert_eq!(r[3]["template"]["name"], "Two");

    let (_, list) = t.call(Method::GET, "/templates", Some(&ta), None).await;
    assert_eq!(list.as_array().unwrap().len(), 2);

    let too_many: Vec<Value> = (0..101)
        .map(|i| json!({ "name": format!("t{i}"), "content": "" }))
        .collect();
    let (status, body) = t
        .call(
            Method::POST,
            "/templates/batch",
            Some(&ta),
            Some(json!({ "templates": too_many })),
        )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "At most 100 templates per batch.");
}

#[tokio::test]
async fn export_then_delete_account() {
    let (alice, bob) = (email(), email());
    let t = setup(&[(&alice, "a"), (&bob, "b")]).await;
    let (ta, tb) = (t.sign_in(&alice, "a").await, t.sign_in(&bob, "b").await);
    for (name, content) in [("Hymn", "@title: Hymn"), ("hymn!", "@title: Other")] {
        t.call(
            Method::POST,
            "/templates",
            Some(&ta),
            Some(json!({ "name": name, "content": content })),
        )
        .await;
    }
    t.call(
        Method::POST,
        "/templates",
        Some(&tb),
        Some(json!({ "name": "Bob", "content": "x" })),
    )
    .await;

    let res = t
        .raw(
            Request::get("/templates/export")
                .header(header::AUTHORIZATION, format!("Bearer {ta}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await;
    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(res.headers()[header::CONTENT_TYPE], "application/zip");
    let disposition = res.headers()[header::CONTENT_DISPOSITION]
        .to_str()
        .unwrap()
        .to_owned();
    assert!(
        disposition.starts_with("attachment; filename=\"lyric-chord-cloud-library-"),
        "{disposition}"
    );
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes.to_vec())).unwrap();
    let mut names: Vec<_> = archive.file_names().map(str::to_owned).collect();
    names.sort();
    assert_eq!(
        names,
        ["hymn-2.lcct.txt", "hymn.lcct.txt"],
        "only the caller's templates"
    );
    let mut content = String::new();
    std::io::Read::read_to_string(&mut archive.by_name("hymn.lcct.txt").unwrap(), &mut content)
        .unwrap();
    assert_eq!(content, "@title: Hymn");

    assert_eq!(
        t.call(Method::DELETE, "/auth/me", Some(&ta), None).await.0,
        StatusCode::NO_CONTENT
    );
    assert_eq!(
        t.call(Method::GET, "/auth/me", Some(&ta), None).await.0,
        StatusCode::UNAUTHORIZED
    );
    // Signing in again creates a fresh, empty account.
    let ta2 = t.sign_in(&alice, "a").await;
    let (_, list) = t.call(Method::GET, "/templates", Some(&ta2), None).await;
    assert_eq!(list, json!([]));
    let (_, bob_list) = t.call(Method::GET, "/templates", Some(&tb), None).await;
    assert_eq!(
        bob_list.as_array().unwrap().len(),
        1,
        "other users untouched"
    );
}

#[tokio::test]
async fn sessions_expire_when_idle_and_at_max_age() {
    let alice = email();
    let idle = setup_custom(&[(&alice, "a")], |c| {
        c.session_idle_ttl = Duration::from_millis(1500);
    })
    .await;
    let capped = setup_custom(&[(&alice, "a")], |c| {
        c.session_max_age = Duration::from_millis(1500);
    })
    .await;
    let (ti, tc) = (
        idle.sign_in(&alice, "a").await,
        capped.sign_in(&alice, "a").await,
    );
    assert_eq!(
        idle.call(Method::GET, "/auth/me", Some(&ti), None).await.0,
        StatusCode::OK
    );
    assert_eq!(
        capped
            .call(Method::GET, "/auth/me", Some(&tc), None)
            .await
            .0,
        StatusCode::OK
    );

    tokio::time::sleep(Duration::from_millis(1700)).await;
    assert_eq!(
        idle.call(Method::GET, "/auth/me", Some(&ti), None).await.0,
        StatusCode::UNAUTHORIZED
    );
    // Activity doesn't extend past the absolute cap.
    assert_eq!(
        capped
            .call(Method::GET, "/auth/me", Some(&tc), None)
            .await
            .0,
        StatusCode::UNAUTHORIZED
    );
}
