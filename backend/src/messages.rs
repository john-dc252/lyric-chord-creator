//! User-facing API messages. Text lives in `locales/app.yml` (rust-i18n, embedded at
//! build time); this enum keeps call sites typo-proof.

use std::fmt::Display;

use rust_i18n::t;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Msg {
    Unauthorized,
    NotFound,
    InternalError,
    TemplateNameEmpty,
    TemplateNameTooLong,
    TemplateContentTooLarge,
    InvalidTimestamp,
    TemplateNameTaken,
    TemplateIdTaken,
    LoginCodeInvalid,
    RateLimited,
    BatchTooLarge,
}

impl Msg {
    #[cfg(test)]
    const ALL: [Msg; 12] = [
        Msg::Unauthorized,
        Msg::NotFound,
        Msg::InternalError,
        Msg::TemplateNameEmpty,
        Msg::TemplateNameTooLong,
        Msg::TemplateContentTooLarge,
        Msg::InvalidTimestamp,
        Msg::TemplateNameTaken,
        Msg::TemplateIdTaken,
        Msg::LoginCodeInvalid,
        Msg::RateLimited,
        Msg::BatchTooLarge,
    ];

    fn key(self) -> &'static str {
        match self {
            Msg::Unauthorized => "unauthorized",
            Msg::NotFound => "not_found",
            Msg::InternalError => "internal_error",
            Msg::TemplateNameEmpty => "template_name_empty",
            Msg::TemplateNameTooLong => "template_name_too_long",
            Msg::TemplateContentTooLarge => "template_content_too_large",
            Msg::InvalidTimestamp => "invalid_timestamp",
            Msg::TemplateNameTaken => "template_name_taken",
            Msg::TemplateIdTaken => "template_id_taken",
            Msg::LoginCodeInvalid => "login_code_invalid",
            Msg::RateLimited => "rate_limited",
            Msg::BatchTooLarge => "batch_too_large",
        }
    }

    pub fn text(self) -> String {
        t!(self.key()).into_owned()
    }

    /// Fills `%{name}` placeholders.
    pub fn fill(self, args: &[(&str, &dyn Display)]) -> String {
        args.iter().fold(self.text(), |s, (k, v)| {
            s.replace(&format!("%{{{k}}}"), &v.to_string())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_message_has_text_in_every_locale() {
        for locale in rust_i18n::available_locales!() {
            for m in Msg::ALL {
                let text = t!(m.key(), locale = locale);
                // rust-i18n returns "{locale}.{key}" for missing translations.
                assert_ne!(text, format!("{locale}.{}", m.key()), "missing {m:?}");
            }
        }
    }

    #[test]
    fn fills_placeholders() {
        assert_eq!(
            Msg::TemplateNameTooLong.fill(&[("max", &200)]),
            "Template name exceeds 200 characters."
        );
    }
}
