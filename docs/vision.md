# Likecord — Product Vision

## Purpose

Likecord is a private, real-time communication platform designed exclusively for internal use among friends. It enables voice, text, and screen sharing in persistent group servers, inspired by the core functionality of Discord — but self-hosted, private, and simple.

## Target Audience

- A small, closed group of friends (up to 100 registered users)
- 20–30 concurrent users during peak activity
- No public registration or external discovery

## Core Values

| Value | Description |
|---|---|
| **Privacy** | Invite-only access; no public discovery; no third-party data handling |
| **Simplicity** | One-person operations; minimal infrastructure; proven technologies |
| **Reliability** | Working voice and messaging is better than flashy but fragile features |
| **Low cost** | Total monthly budget under €20 including hosting and object storage |
| **Maintainability** | A solo developer should be able to deploy, back up, and troubleshoot |

## Success Criteria

1. A new user can register via invite link, join a server, send a text message, and start voice chat within 30 minutes of deployment.
2. 20–30 concurrent users experience voice latency under 200ms.
3. All messages, edits, and file uploads persist across restarts.
4. The entire stack deploys with docker compose up.
5. Daily backup and restore can be performed with documented single-command procedures.

## Non-Goals

- Public registration or open communities
- Mobile apps (out of scope until V2+)
- Video calls, bots, plugin system, E2E encryption, federation, AI features
- Kubernetes, microservices, or serverless architecture
