# Product

## Register

product

## Users

Seabreeze serves people who want a capable AI chat app that feels native on Apple platforms while still giving them serious control over providers, models, search, attachments, and local persistence. Primary users include power AI users comparing model behavior across Apple Intelligence, OpenAI, OpenRouter, Opencode, Ollama, and Codex-backed flows; iOS-first users who expect a polished mobile interface; developers and tinkerers who configure credentials, local models, and advanced provider behavior; and general consumers who still need the core chat path to feel understandable and safe.

Users are often working in short mobile sessions: starting a new chat, resuming a saved thread, switching providers, attaching media, enabling web search, or recovering from provider and persistence errors. They need clear state, fast feedback, and enough transparency to trust what the app is doing without feeling trapped inside configuration.

## Product Purpose

Seabreeze is an OpenWebUI-style AI chat client for iOS, Android, and web, built with React Native and Expo. It exists to make multi-provider AI chat feel like a real native app rather than a wrapped website or a developer demo.

Success means users can move from thought to conversation quickly, understand which provider and model are active, recover from failures without losing work, and customize enough of the experience to make the app their daily AI workspace. The product should balance consumer-grade ease with power-user control.

## Brand Personality

Controlled, capable, transparent.

The interface should feel like a power-user cockpit adapted to mobile: confident, direct, and information-rich when it matters, but not visually noisy by default. Seabreeze should sound practical and calm. Labels should be explicit, errors should explain recovery, and settings should make advanced behavior discoverable without making every screen feel like a control panel.

## Anti-references

Seabreeze should not look or feel like a toy chat app: avoid childish illustration, novelty motion, unserious empty states, and playful copy that weakens trust.

It should not resemble generic SaaS AI marketing or app UI: avoid cream-gradient startup styling, vague productivity language, interchangeable assistant tropes, hero-metric patterns, and decorative polish that does not clarify behavior.

It should not become a terminal-only tool: avoid dense command-line aesthetics, expert-only labels, hidden assumptions, and interfaces that make mobile comfort feel secondary.

It should also avoid becoming a dense settings maze. Provider power is a strength only when configuration state, next steps, and recovery paths remain legible.

## Design Principles

1. Keep the chat path immediate. Starting, reading, replying, attaching, and recovering should require as little interpretation as possible.
2. Show system state without ceremony. Provider, model, web search, streaming, persistence, and error states should be visible when relevant and quiet when irrelevant.
3. Make advanced control feel native. Power-user settings should use platform-comfortable patterns, clear grouping, and direct language instead of developer-console sprawl.
4. Protect user work. Streaming, persistence, retry, hydration, and destructive actions should prioritize continuity, reversible decisions, and clear recovery.
5. Design for trust over spectacle. Visual character should come from precision, rhythm, and confident hierarchy, not novelty effects or generic AI gloss.

## Accessibility & Inclusion

Use WCAG AA as the baseline for contrast and readability. Preserve native accessibility expectations across iOS, Android, and web: accessible labels for icon-only controls, readable touch targets, clear focus and pressed states, and text that remains usable with larger system font settings.

Motion should be purposeful and non-essential. Respect reduced-motion needs, avoid attention-grabbing animation during reading or streaming, and ensure color is never the only carrier of provider status, errors, or active settings.
