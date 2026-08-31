# Documentation

Everything written about BeepMyDevice, and the order to read it in.

---

## Start here

| If you want to… | Read |
|---|---|
| Understand what this is and why | [`FEATURES.md`](FEATURES.md) |
| Understand how it works | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Get it running locally | [`DEVELOPMENT.md`](DEVELOPMENT.md) |
| Call the API | [`API.md`](API.md) |
| Build a screen | [`BeepMyDevice_UI_UX_Design_Brief.md`](BeepMyDevice_UI_UX_Design_Brief.md) |
| Write code for it | [`CODING_STANDARDS.md`](CODING_STANDARDS.md) |
| Ship it | [`DEPLOYMENT.md`](DEPLOYMENT.md) |

A reasonable first pass: **FEATURES → ARCHITECTURE → DEVELOPMENT**, then the
coding standards for whichever side you are working on.

---

## Index

### Working documents

| Document | Contents |
|---|---|
| [`FEATURES.md`](FEATURES.md) | Feature list by phase, and what the project deliberately does not do |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | HLD and LLD — layering, data model, key flows, security, extension points |
| [`API.md`](API.md) | Every endpoint, the response envelope, the full error-code table |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | Setup, daily workflow, running single tests, troubleshooting |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Nginx, Docker, TLS, mobile releases, rollback |
| [`CODING_STANDARDS.md`](CODING_STANDARDS.md) | The cross-cutting contract both sides implement |

### Per-side coding style

| Document | Scope |
|---|---|
| [`../backend/docs/CODING_STYLE.md`](../backend/docs/CODING_STYLE.md) | Python, FastAPI, SQLAlchemy |
| [`../frontend/docs/CODING_STYLE.md`](../frontend/docs/CODING_STYLE.md) | TypeScript, React Native |

These are wired into Claude Code skills in `.claude/skills/`, so the relevant
rules load automatically when working in either directory.

### Design

| Document | Contents |
|---|---|
| [`BeepMyDevice_UI_UX_Design_Brief.md`](BeepMyDevice_UI_UX_Design_Brief.md) | Full UI/UX specification -- screens, components, colour, typography, states |
| [`Claude_Design_Prompt.md`](Claude_Design_Prompt.md) | Ready-to-paste prompt for generating high-fidelity mockups |
| [`How_to_Use_Claude_Design.md`](How_to_Use_Claude_Design.md) | Walkthrough for the mockup workflow |
| [`CLAUDE_DESIGN_QUICK_START.md`](CLAUDE_DESIGN_QUICK_START.md) | Condensed three-step version of the above |

The design brief is the reference when building any screen or component -- it
is more specific than the wireframes in the original specification.

### Original specifications

Written during planning. Superseded by the working documents above where they
disagree, but kept because they carry detail the newer docs summarise.

| Document | Contents |
|---|---|
| [`BeepMyDevice_Complete_Documentation.md`](BeepMyDevice_Complete_Documentation.md) | The master planning document — features, stack, HLD/LLD, schema, API, phases |
| [`WiFi_Alert_System_Specification.md`](WiFi_Alert_System_Specification.md) | Technical spec with data-flow walkthroughs and screen wireframes |
| [`BeepMyDevice_Repository_Setup.md`](BeepMyDevice_Repository_Setup.md) | Target folder tree, dependency pins, full SQL DDL |
| [`BeepMyDevice_GitHub_Setup.md`](BeepMyDevice_GitHub_Setup.md) | Repository creation, README templates, CI workflow YAML |
| [`BeepMyDevice_Professional_Brief.md`](BeepMyDevice_Professional_Brief.md) | The setup brief this structure was built from |
| [`BeepMyDevice_TODAY_CHECKLIST.md`](BeepMyDevice_TODAY_CHECKLIST.md) | One-time checklist for the initial GitHub push (now complete) |
| [`COMPLETE_PROJECT_SUMMARY.md`](COMPLETE_PROJECT_SUMMARY.md) | Inventory of the original planning package |
| [`MASTER_FILE_INDEX.md`](MASTER_FILE_INDEX.md) | Index of the original planning files |

---

## Precedence

Where documents conflict:

1. **`CODING_STANDARDS.md`** wins on conventions — response format, error codes,
   logging, correlation IDs.
2. **`ARCHITECTURE.md`** wins on design and scope.
3. The original specifications are historical context.

One known conflict is already resolved: `CODING_STANDARDS.md` §5 shows
`pagination` as a sibling of `data`, while every other example nests it as
`data.pagination`. **`data.pagination` is correct** — that is what the code
implements.

---

## FAQ

**Why not just use Find My?** Find My requires every device to share one Apple
ID. A household with three Apple IDs, two Google accounts and a Windows laptop
cannot be covered by any single ecosystem tool. See
[`FEATURES.md`](FEATURES.md).

**Why does the app need location permission?** Both iOS and Android classify the
WiFi BSSID as location data. The BSSID is how devices are grouped, so without
the permission the app cannot identify the network at all.

**Why can't I alert a device that shows as UNKNOWN?** `UNKNOWN` means the device
reported a different WiFi MAC than the one it registered with — it has left the
network, so it is outside the alert group. See the heartbeat section of
[`ARCHITECTURE.md`](ARCHITECTURE.md).

**Why only one Uvicorn worker?** WebSocket connections are held in process
memory, so with several workers a heartbeat handled by one worker never reaches
a dashboard connected to another. Redis pub/sub is the Phase 2 fix. See
[`DEPLOYMENT.md`](DEPLOYMENT.md).

**Where do I add a new endpoint?** A route in `backend/src/routes/`, the logic in
a service, a Pydantic schema for the contract, a TypeScript type in
`frontend/src/types/`, and a path in `API_ROUTES`. Both coding-style documents
cover the layering rules.

## Setup

- [`PUSH_SETUP.md`](PUSH_SETUP.md) — Firebase and APNs credentials, the only
  outstanding Phase 1 item. Everything around them is built and tested.
