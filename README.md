# wholelife-app

A goal-tracking app rooted in identity-based change, minimum viable actions, and whole-life balance. No streak shame. Built for real people.

---

## What this is

Most goal apps reward hustle and punish inconsistency. WholeLife is different.

It helps you pursue meaningful goals without sacrificing your health, relationships, rest, or spiritual life. It starts with one question: **Who do you want to become?**

Built on the principles of Atomic Habits, Tiny Habits, and Self-Determination Theory.

---

## Core philosophy

- **Identity-first** — change starts with who you are, not what you do
- **Minimum Viable Actions (MVAs)** — the smallest action that still counts
- **No streak shame** — missing a day is not failure
- **Whole-life balance** — health, relationships, rest, and spiritual/mental wellbeing

---

## Roadmap

### Phase 1 — Telegram Bot MVP (current)
Validating the core habit loop via a Telegram bot before building a frontend.

- Onboarding: name, identity goal, MVA
- Daily check-in via Telegram
- Weekly reflection prompts
- 14-day progress view

### Phase 2 — React Web App
Same backend. New interface.

### Phase 3 — React Native Mobile App
Native mobile experience.

---

## Tech stack

| Layer         | Technology                      |
|---------------|---------------------------------|
| Bot interface | Telegraf.js                     |
| Backend       | Node.js + Express               |
| Database      | PostgreSQL                      |
| Scheduler     | node-cron                       |
| Hosting       | Render                          |
| Frontend (v2) | React                           |
| Mobile (v3)   | React Native                    |

> The backend built for the Telegram bot is the same backend the web and mobile apps will connect to. All data logic lives in the API from day one.

---

## Getting started

```bash
git clone https://github.com/your-username/wholelife-app.git
cd wholelife-app
npm install
cp .env.example .env
# Add your Telegram bot token and DB credentials to .env
npm run dev
```

---

## Environment variables

```
TELEGRAM_BOT_TOKEN=
DATABASE_URL=
PORT=3000
```

---

## Project structure

```
wholelife-app/
├── src/
│   ├── bot/          # Telegraf bot logic
│   ├── api/          # Express REST API (shared with web app)
│   ├── db/           # PostgreSQL models and migrations
│   └── cron/         # Scheduled daily/weekly jobs
├── .env.example
└── README.md
```

---

## Non-negotiables

- No streak counters
- No shame-based language, ever
- Always identity-first framing
- Whole-life balance is not optional — it's the product

---

## Vision

> "To help people pursue meaningful goals without sacrificing their health, relationships, or spiritual life."

This is not a productivity app. It is a becoming app.
