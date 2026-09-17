# 🛡️ SafeSignal (impact-safeguard)

An emergency-response case management platform for domestic violence situations, built around a single panic-button trigger.

## What it does

When a victim triggers the panic button, the app:

- Creates a case record with the victim's profile, location, and incident details
- Notifies authorities in real time
- Orchestrates the response through an automated, auditable workflow

The goal is a "no typing, no calling, no delay" flow for a moment where every second counts.

## Tech Stack

- **Frontend:** Next.js, TypeScript, React, Tailwind CSS, Radix UI
- **Cloud/AWS:** Bedrock (AI-assisted case handling), DynamoDB (case storage), Pinpoint (SMS/push notifications)
- **Data:** Scripted table creation and case migration tooling for the DynamoDB case store

## Status

Prototype / hackathon-stage project. Case creation, storage, and the notification pipeline are the core pieces built out so far.
