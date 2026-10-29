# Task → Backend engine: the method

**Purpose:** Give this doc **one role app**, **the role's task doc** and **one task in them**. Following the steps gives the **complete backend** for that task: contexts, tables and columns, actions with gates, API, events, reactions, approvals, timers, queries, authority, history and accounting. Anyone (a person or an AI) following it gets **the same answer**.

**Status:** rev 6, 29-Oct-2026 · Owner: Vijay

**Example output:** `02_example_create_vendor_customer.md` (this method applied to the reference inputs).

**Reference inputs:**
- **App:** `docs/accounts_executive/app` (onboarding, task T7 · T12 · T17 "Set up a party account"). **Fixed; never changed by this method.**
- **Task doc:** `docs/accounts_executive/01_accounts_executive_tasks_and_responsibilities.md` (the cards of T7, T12, T17 and the role summary). **Read, never edited. Its format may change; its information does not.**

---

## 0. Inputs: how this method was built

Each input is **stacked** on the earlier ones. A later input replaces an earlier one only where it says so.

| # | Date | From | Input | Effect on the method |
|---|---|---|---|---|
| 1 | 23-Oct | Vijay | Tasks → designed UI → app, like Credit Controller | Base docs and the app |
| 2 | 26-Oct | Vijay | Onboarding only; **the backend is the goal**; mock UI as walkthrough | One task taken all the way down |
| 3 | 26-Oct | Vijay | "Already exists" → return the form to the source with a comment | A send-back ending |
| 4 | 27-Oct | Vijay | Own `party_master`, not the P&C tables | Party master is its own context |
| 5 | 27-Oct | Vijay | Nothing arrives from Procurement or Sales; the AE types everything | No cross-module input |
| 6 | 27-Oct | Shared deck | `engine-concepts.pptx`: 9 words, one owner per fact, actions only, receipts, named automations | **The 9 steps and their rules (§4)** |
| 7–8 | 27-Oct | Vijay | A simple, general method; **one life cycle**; focus on the accounting engine | One state flow per subject |
| 9 | 27-Oct | Vijay | SAP Fiori: role-based; about 10 accounting roles | Role app → task → backend; role map |
| 10 | 27-Oct | **Team lead (CA)** | Three layers; Posting Engine + rules + account determination; one immutable journal; sub-ledgers under control accounts; exceptions; periods | **The Accounting context (§5)** |
| 11 | 28-Oct | Vijay | The card was habit | No card: the app is read directly |
| 12 | 28-Oct | Vijay | **The UI app is the source of truth**, not the task doc | The app is the input |
| 13 | 28-Oct | Vijay | Stack every input; the doc opens with them | This section |
| 14 | 28-Oct | Vijay | Be strict like the deck: **one task in → exact tables, fields and API out**, for anyone | Fixed conventions (§3), fixed output (§6), determinism check (§7) |
| 15 | 28-Oct | Vijay | **Never change the app.** It is the reference point; engineer only the logic | App words are *interpreted* (§2.3), never edited |
| 16 | 28-Oct | Vijay | Show **exactly how many tables, APIs and rules** | Output section 0, Backend at a glance |
| 17 | 28-Oct | Review (pasted by Vijay) | Schema, API contracts, rule tests, failure handling, outside calls and production readiness were weak or missing | §3.9–§3.14 and output sections Q–T |
| 18 | 28-Oct | Vijay | **UI → engine, with a clear picture of how many tables are proposed and where each one goes** | §3.14 Table placement; table map in section 0 |
| 19 | 29-Oct | Vijay | **The task doc is an input too**, not only the app. Its format may change, its information doesn't | Two sources: task-doc facts found by meaning (§2.4), which source owns which fact (§2.5), doc words (§2.6), task type → shape (§3.15), every step also reads the doc (§4), output U, checklist (§7) |

---

## 1. The idea

```text
┌──────────────────────────┐     ┌──────────────────────────────────────────┐     ┌──────────────────────────┐
│ INPUT 1 · the role app   │     │ THE METHOD (this doc)                    │     │ OUTPUT                   │
│ (fixed) = HOW            │     │                                          │     │                          │
│  · screens, fields       │────►│ step 0  inventory both sources           │────►│ backend spec sheet (§6)  │
│  · checks, buttons       │     │         app ids S…L · task-doc ids K     │     │  contexts · tables · DDL │
│  · statuses, checkers    │     │         + who owns which fact (§2.5)     │     │  actions · API · events  │
├──────────────────────────┤     │ step 1–9  the deck's 9 words, in order   │     │  reactions · approvals   │
│ INPUT 2 · the task doc   │     │           each: READ → RULE → WRITE      │     │  queries · authority     │
│ (read) = WHY · WHO · WHEN│────►│ step 10 assemble: DDL · API · tests      │     │  accounting · tests      │
│  · trigger, hand-off     │     │                                          │     │  OpenAPI · rule tests    │
│  · never, indicators     │     │ conventions (§3) · accounting (§5)       │     │  failure · production    │
├──────────────────────────┤     │                                          │     │  two sources (U)         │
│ + one task id            │     │                                          │     │                          │
└──────────────────────────┘     └──────────────────────────────────────────┘     └──────────────────────────┘
```

**Five rules:**
1. **The app is fixed; the task doc is read.** The method reads both. It never asks for a screen change or a doc change.
2. **Same input, same output.** Every name, type and table comes from a rule in §2.5 and §3–§5, never from taste.
3. **Never invent.** If **both sources** are silent, use a **listed default** (§3.8) or record a **gap**.
4. **Full trace.** Every output row names the app element or task-doc fact it came from (its inventory id). Every app element and every task-doc fact is used at least once, or listed as out of scope or a gap.
5. **The deck's law holds:** every fact has one owner; a fact changes only through an action; everything else listens or reads.

---

## 2. Step 0: read the two sources

Two inventories: the **app** (2.1) and the **task doc** (2.4). Then the task card (2.2) and **which source owns which fact** (2.5).

### 2.1 Inventory of the app: what to list, and where it is

Give every element an **id**. The ids are used for tracing in every later step.

| Id | Element | Where to look (any app) · *onboarding example* | Record |
|---|---|---|---|
| **S** | Screen, tab, list, tile, sheet | the screen components · *`screens/*.tsx`* | What it lists or shows; filters |
| **F** | Field someone types | the form's field definitions · *`rules.ts FIELDS`* | key, label, kind, unit, options, required-when, visible-when, pattern |
| **W** | Worked-out value | functions that fill a field from others · *`suggestionsOf`* | key, source fields, the rule |
| **C** | Check line (stop / warn / send-back) | the validation function or messages · *`checksOf`* | condition, level, message |
| **P** | Probe button (outside check) | actions that call an outside service · *penny-drop, GST portal* | service, input, result |
| **B** | Button | every `onClick` and the action it calls · *`store.ts`* | label, who sees it, when enabled |
| **T** | Status shown | the status type and its pills | the words shown |
| **A** | Checker block | who-checks-what lists · *`routesFor`* | position, fields covered |
| **N** | Notice, reminder, "the system does …" | `notice()`, toasts, flow text | trigger, receiver |
| **D** | Date, wait, limit number | parameter lists, hints | value, unit, who sets it |
| **L** | Mock Backend log / tables | any backend sketch in the app · *Backend tab, `log()`* | each line (a sketch, see §2.3); the tables it marks as existing |

### 2.2 The task card (from both sources)

| Item | Read from |
|---|---|
| Task id and name | The task tag in the app (e.g. `T7 · T12 · T17 Set up a party account`) and the task doc's heading for each task (e.g. `T7 — Complete and maintain vendor finance fields`). One app screen may serve several doc tasks: read every card |
| Starts when | **How** it arrives: the app ("New" button, flow text, e.g. a paper form is handed over). **What** starts it in the business and how often: the doc (K.TRG) |
| Done when | The app's terminal statuses (e.g. `active`, `sent_back`). The doc's K.DONE says where the maker's part ends |
| Hands to | The doc (K.HO, K.SND, KR.HAND) and the app (notices, flow text): every receiver named by either |

### 2.3 Interpreting app words (the app is not edited)

| App word | Engine meaning |
|---|---|
| "System" in the mock log | A **named automation** with a grant (§3.6). Never anonymous |
| "Account (as it shows in the books)" for a party | A **sub-ledger account** (AP or AR), not a GL account (§5.2) |
| "Under (header)" for a party account | The **control account** it sits under, from **account determination** (§5.2) |
| The party account's id (`ACC-…`) | The **sub-ledger account id** (`accounting.subledger_account.id`) |
| A person picked on a form ("Handed over by") | A **person id** (the principal), not a role. Their position is kept in the receipt |
| Mock Backend tab names (`accounting_txn.*`, `/legal-entities/LE-1/…`) | **A sketch.** Its effects must all appear in the output (rule 4), but the names follow §3. List the renames in output section P |
| A status word on screen | **The same word** is the state in the engine (deck: state labels stay stable) |

### 2.4 Inventory of the task doc: facts (K)

Read the parts of the task doc that speak of this task:
- **its card(s)** and **its row in the task list**;
- **the role summary** (gets work from · hands work to · never);
- **the "not tasks / not this role's" list**;
- **the open questions** that name it, and **the revision notes** that change it.

**Find each fact by its meaning, not its heading.** A table, a list or a sentence all count; a renamed field is the same fact. So a doc with another layout gives the same K table.

Id: `K<task>.<FACT>` for a card fact (e.g. `K7.HO`) · `KR.<FACT>` for a role fact · `KQ<n>` for an open question.

| Fact | Means | Also written as | Feeds |
|---|---|---|---|
| SRV | The responsibility and outcome it serves | serves, responsibility, outcome | trace; indicators |
| TRG | What starts it, how often | trigger, cadence, starts when, arrives when | step 5; step 6 (timer) |
| SUB | The one thing it acts on | subject, the item | step 2 |
| REQ | What must be true first | requires, precondition | step 1; step 3 |
| SEE | The facts it uses | sees, shows, reads | step 1; step 7 |
| DONE | The ways it ends | done when, ends, completion | step 2; step 7 (holder) |
| WR | The record it leaves | writes, saves, makes | step 3 (names → renames) |
| HO | Who checks, who gets it next | hand-off, hands over to, checked by | step 6; step 4 |
| SND | Messages that go out, who is told | sends, informs, feeds | step 4; step 5 |
| HELD | Whose move it is per stage | held by, needs me · waiting on others · coming up | step 7 |
| EXC | Cases flagged | exceptions, flags | step 3 |
| CANT | What blocks sending | can't send when, blocked when | step 3 |
| FILL | What is entered or shown | what you fill in, fields | cross-check with F / W |
| PAR | Company rules, by name | parameters, thresholds, limits | step 6 |
| RUL | Standing rules and who may set them | rules allowed ✅ 🟠 ❌ | step 8; step 6 (owners) |
| NEV | What the role never does (role level) | never, not this role's | step 8 |
| GET · HAND | What reaches the role, what leaves it (role level) | gets work from, hands work to | step 4; step 5 |
| IND | How you see the responsibility is kept | indicators, measures | step 7 |
| TYP | The kind of work and its screen pattern | type, pattern | step 2; §3.15 |
| EVD | Where it is evidenced | evidence, scenario step | step 9; contract tests |
| ASK | What is still open | ask, open question, verdict note | output P · U |

- Keep the doc's own tag on each fact: **Fact** or **Proposal** (its source boundary).
- A fact the doc does not give is written `— (not in the doc)`: never guessed.

### 2.5 Which source owns which fact

| Fact | Owner | The other source |
|---|---|---|
| Screens, fields, field kinds, check wording, buttons, statuses, checker blocks (who covers which fields), how work arrives | **App** | The doc confirms; a doc field with no screen element is a gap |
| The subject and its end states | **App** (the list row, the statuses) | K.SUB, K.DONE, K.TYP confirm. One screen for several doc tasks = **one subject** |
| What starts it in the business, how often | **Doc** (K.TRG) | — |
| Approval order | **App** when it shows one (all steps waiting at once = parallel); else the doc's "first … then …" (sequential); else parallel (DF18) | — |
| Who is told, who listens | **Both**: every receiver in the app's notices and in K.SND, K.HO, KR.HAND | — |
| Holder per state | **App** (statuses) | K.HELD must agree; "coming up" = a timer |
| Stop and warn rules | **App** (C rows) | A K.CANT or K.EXC line with no C row: a new gate if the app holds the data it needs, else a gap |
| Parameters | **App** gives values (D) | **Doc** gives names (K.PAR). A named parameter with no value is `UNSET` (a gap) |
| Authority: never, not this role's, rules allowed | **Doc** (KR.NEV, K.RUL, the not-this-role list) | The app hides buttons (confirms) |
| Indicators | **Doc** (K.IND) | Plus the app's KPIs |
| Action and event names | **Method** (§3.1) | Doc names (K.WR) and mock names go to the renames list |
| Evidence, open questions | **Doc** (K.EVD, K.ASK) | An open question the app already answers is marked "answered by the app" |

- **Owner silent:** the other source fills it, and the trace shows its id. **Both silent:** a default (§3.8) or a gap.
- **Both speak and differ:** the owner wins. The difference goes to output U with both texts; nothing is dropped silently.
- **A decision recorded later** (an input in §0, a decision in §9) beats both.

### 2.6 Interpreting task-doc words (the doc is not edited)

| Doc word | Engine meaning |
|---|---|
| "Needs me" · "Waiting on others" · "Coming up" | Holder = the maker · the positions of the requested steps · a timer, or a trigger not yet arrived |
| ✅ myself · 🟠 Accounts Manager · ❌ never | This role owns that standing rule (parameter owner) · the AM owns it · a **refusal rule** (§4 step 8) |
| The role's "Never" list · "not this role's" | A refusal rule on every action of this task where it could happen · no grant for this role |
| "Writes `X.Save`" | The doc's name for the action. The method's name wins; the doc's goes to renames |
| "Parameters (by name, not value)" | Parameter rows; the value from the app, else `UNSET` |
| Type words: Record, Make, Ask, Decide, Run a batch, Worklist | The backend shape of §3.15 |
| "Evidence: scenario step …" | A seed row and a contract test |
| "Ask …", an open question | A gap, or "answered by the app" |
| "Merge into Tn?" | If the app does both on one screen: one subject (app wins) |
| A system named in the doc (e.g. "Business Core") | The context the method owns for it (e.g. `party_master`, input 4) |

---

## 3. Conventions (fixed)

### 3.1 Names

| Thing | Rule | Example |
|---|---|---|
| Context (schema) | snake_case noun | `party_master`, `finance`, `accounting`, `platform` |
| Entity (table) | `<context>.<singular_snake>` | `finance.party_account_request` |
| Column | snake_case of the app's field key. If it equals a standard column (§3.5), add `_code` for a select, else `_value` | `credit_days`; field `state` → `state_code` |
| Id of an entity the app shows an id for | Text, with the app's prefix | `REQ-0101`, `P-0141`, `ACC-2101` |
| Id of any other table | `bigint generated always as identity` (no prefix) | `party_gstin.id` |
| Action | PascalCase **Verb + Object** (verbs in §3.2). Object = the entity acted on, or the entity linked | `SubmitPartyAccountRequest`, `CheckGstin`, `UseParty` |
| Event | **Object + past participle** of the action. **An action that moves its subject to a new state** publishes **Subject + that state** instead | `GstinChecked`; `DecidePartyAccountRequest` → `PartyAccountRequestApproved` or `…Returned` |
| Link to a person | `<field key>_person_id` | app `from` → `from_person_id` |
| Timer event | `<Object>DeadlineReached` (a limit) · `<Purpose>ReminderDue` (a repeat) | `ApprovalDeadlineReached`, `UdyamReminderDue` |
| Endpoint, create | `POST /api/v1/{context-kebab}/{entities-kebab}` | `POST /api/v1/finance/party-account-requests` |
| Endpoint, save a draft | `PATCH …/{id}` | |
| Endpoint, other action | `POST …/{id}/{action minus the entity name, kebab}` | `…/{id}/submit`, `…/{id}/check-gstin` |
| Endpoint, query | `GET …` (list) · `GET …/{id}` (one) | |
| Automation | kebab `<subject>-<verb-ing>` | `party-registration` |
| Parameter | snake + unit suffix (`_days`, `_hours`, `_pct`, `_amount`) | `udyam_reminder_days` |

### 3.2 Action verbs (use only these)

| Verb | Meaning | Verb | Meaning |
|---|---|---|---|
| Open | Create a draft subject; in accounting, open a sub-ledger account | Decide | An approver decides one step (§4 step 6) |
| Save | Change a draft | SendBack | The maker returns the source paper; nothing is created |
| Submit | Ask for approval | Discard | Drop a draft never submitted |
| Check / Verify | Run a probe | Activate | Make the result live (automatic) |
| Use | Link an existing record; with `null`, un-link | Change | Change a live fact (a new version) |
| Register / Add | Create a fact in a master | Send | Send a notice or message |
| Mark | Set a flag on one's own item (`MarkNotice`) | Escalate | Move an overdue approval step up (`EscalateApproval`) |
| Post / Reverse | Accounting only | | |

No other verbs. A screen button that fits none is a gap.

### 3.3 Field kind → column type

| App field | Column |
|---|---|
| text | `text` |
| text with a **format check** in C (PAN, GSTIN, IFSC, Udyam, PIN …) | `text` + `CHECK (value ~ '<pattern>')` |
| number, unit days / count | `integer CHECK (≥ 0)` |
| number, unit ₹ | `numeric(18,2) CHECK (≥ 0)` |
| select with exactly yes / no | `boolean` |
| select, ≤ 6 fixed options (other) | `text CHECK (IN (<keys>))` |
| select, > 6 options (a business list) | `text REFERENCES <owner>.<field>_code(key)`; code table (key, label, active). One table for both sides, with a `side` column when the list differs by side |
| select whose options are built at run time | `text` + a gate (no CHECK) |
| switch | `boolean NOT NULL DEFAULT <app default>` |
| date | `date` |
| Link to a record **in the same context** | `<entity>_id text REFERENCES …` |
| Link to a record **in another context** | `<entity>_id text`, **no FK** (a declared identifier) |
| Required always | `NOT NULL` in its final table |
| Required-when / visible-when | Nullable + a **submit gate** |

### 3.4 Where a field's value lives

```text
 while the subject is open                        after the ending action
┌──────────────────────────────────┐            ┌────────────────────────────────────────┐
│ <subject>.values  jsonb          │  Activate  │ each value in the table of the context │
│ checked against the field list   │ ─────────► │ that OWNS that fact (§4 step 1)        │
│ + origins (typed·worked·changed) │            │ typed columns (§3.3)                   │
└──────────────────────────────────┘            └────────────────────────────────────────┘
```

**The result table:** the ending writes one row in a table named after the app's result object (e.g. the app's `Account` → `finance.party_account`). It is keyed by the result's id (e.g. `subledger_account_id`) and holds every single value its context owns.

**Separate table, not columns, only when** (follow the app's data type):
- the app holds the values as a **list** (`gstins: []`, `phones: []`, `roles: []`) → a child table; or
- the values sit in a **checker block other than the main one** (bank → Finance Controller, credit limit → Credit Controller) → their own table, **versioned** (`valid_from`, `valid_to`).

**Everything else stays as columns,** including single objects such as an address.

### 3.5 Standard columns

| Table kind | Columns it always has |
|---|---|
| Entity with a life | `id, <tenant>, state, version, created_at, created_by, updated_at, updated_by` |
| Tenant column | `legal_entity_id` in module contexts (finance, accounting) · `workspace_id` in Foundation contexts (party_master, hr), shared by every legal entity |
| Versioned fact | `…, valid_from, valid_to, created_by_invocation` |
| Probe result | `<subject>_id, input_key, result, detail jsonb, checked_at` (valid only while `input_key` equals the current input) |
| Code list | `key PK, label, active` (+ `side` if it differs by side) + `attributes jsonb` for any other per-option fact the app attaches (e.g. the 43B(h) rule, the TDS hint) |
| Child table (from an app list) | `id, <parent>_id, <singular of the list key>, created_at, created_by_invocation` (e.g. `gstins` → `party_gstin.gstin`) |
| Subject state times | `<state>_at` on the subject for each state after draft (`submitted_at`, `activated_at`, `sent_back_at`). The result table has only the standard columns |

### 3.6 Platform tables (shared machinery; built once)

**Platform is machinery, not a business context.** Each action writes its own receipt, trail, outbox, approval and timer rows **inside its own commit**. Notices are the exception: they go through the platform automation `notice-sending`.

```sql
platform.approval     (id, entity, entity_id, round, step, position, covers text[], covered_values jsonb,
                       state, deadline_at, decided_by, decided_at, reason)
                      -- state: requested | approved | returned | cancelled | expired   (the one approval mechanism)
platform.receipt      (invocation_id PK, action, principal, position_or_grant, request_key, rules_version, outcome jsonb, at)
platform.trail        (id, entity, entity_id, invocation_id, diff jsonb, reason, at)        -- never rewritten
platform.outbox       (event_id PK, event, version, entity, entity_id, invocation_id, payload jsonb, at, delivered_at)
platform.reaction_run (event_id, reaction, invocation_id, state, attempts, last_error)   -- state: pending | done | failed
platform.timer        (id, event, entity, entity_id, due_at, state)                      -- state: scheduled | fired | cancelled
platform.parameter    (key PK, value numeric NOT NULL, unit, owner_position NOT NULL, valid_from)
platform.notice       (id, to_position, to_party_id, to_address, channel, entity, entity_id, tone, title, body, at, read_at)
                      -- to a person (position, in-app) · to an outside party (party_id, or to_address before the party exists; email | sms)
-- every platform table also carries legal_entity_id
platform.automation   (name PK, context, grant text[])                                   -- named principals
platform.access_log   (id, principal, entity, entity_id, fields text[], at)               -- unmasked reads of sensitive data (§3.13)
```

### 3.7 Calls

- **Every action call** carries an `Idempotency-Key` header. `invocation_id = hash(legal_entity, action, key, principal)`. A repeat returns the recorded outcome.
- **One commit per action:** the state + the receipt + the trail + the outbox row. If one fails, none happens.
- The **legal entity** comes from the session, not the path.
- **Every `GET` of a subject** returns `values`, `checks` (stop / warn / ok), `holder` and **`allows`**: each action, allowed or not, and why not.
- **Submit takes no body.** It uses the saved values; the client saves first.
- **Responses:** `201` created · `200` done · `422` a stop gate (Input, Consistency, Probe, Uniqueness, Business) · `409` a State gate or a stale `version` · `403` Authority · `404` unknown id · `502` an outside service failed (§3.12). A repeat call returns the first response.

### 3.8 Defaults (used only when the app and the task doc are both silent; each use is listed in the output)

| # | Default |
|---|---|
| DF1 | Approval deadline `approval_deadline_hours = 48`, owner Accounts Manager; then an escalation reaction |
| DF2 | Notice to the maker on every Return and every Activate |
| DF3 | Task lists are fresh as of now (no lag) |
| DF4 | Nothing is deleted: Discard sets the state `discarded` |
| DF5 | A return needs a reason; an approval does not |
| DF6 | Anyone in the maker's position may act on a draft; the maker may not decide their own subject |
| DF7 | Currency INR, book `STAT` |
| DF8 | A parameter whose owner neither source names: owner Accounts Manager |
| DF9 | Escalation goes to the Accounts Manager; a step already with the Accounts Manager goes to the Finance Controller |
| DF10 | A column seen only in the mock log (not on any screen) is dropped and listed in P |
| DF11 | A dashboard count is its list query with `count=true`; no separate query |
| DF12 | Save is never blocked by checks (only by State and Authority gates); it returns them |
| DF13 | Reaction retry: 5 attempts after 1 min, 5 min, 15 min, 1 h, 6 h; then `failed` (§3.11) |
| DF14 | Outside call: timeout 10 s; 2 retries on a network error only (§3.12) |
| DF15 | A subject held in a transient state (e.g. `approved`) for more than `chain_stuck_hours = 2` raises a notice to its owner position |
| DF16 | Lists: `limit` 50 (max 200), cursor `after` |
| DF17 | Targets: action p95 < 500 ms (without outside calls), list p95 < 300 ms; trail, receipt and journal kept 8 years; notices kept 1 year |
| DF18 | Approval steps run in parallel when neither source gives an order |

### 3.9 Constraints, indexes, migrations

| From | Becomes |
|---|---|
| A Uniqueness gate (C) | A `UNIQUE` index on the owner's key, scoped by tenant; `lower()` when the app compares without case |
| Every FK column and declared identifier | An index |
| Every query filter (§4 step 7) | An index on `(tenant, filter columns)`; task lists on `(tenant, state, updated_at)` |
| Delete | **Never cascades.** FKs are `ON DELETE RESTRICT` (nothing is deleted, DF4) |
| Each context's tables | One migration per context, in DDL order (§4 step 10). Reference data (code lists, parameters, automations, account determination) is seeded by a migration, with its owner |

### 3.10 API contract

- **Create body** = the fields the app asks for before the subject exists (the "New" dialog).
- **Save body** = `{version, values: {<field key>: value | null}}` (only the changed keys).
- **Other action bodies** = only the inputs the action takes that are not already saved (e.g. `{step, outcome, reason}`). Submit has none.
- **Every action response** = `{invocation_id, event_id, subject: <the GET view>}`.
- **Every error** = `{errors: [{gate, class, message, field?, send_back?, use_id?}]}` with the codes of §3.7.
- **Lists** = `{rows, next_after, count?}` (DF16).
- **Version:** `/api/v1`; a breaking change is `/api/v2`; events carry `version`.
- **Output:** an **OpenAPI 3.1 file** (`<NN>_<task>_openapi.yaml`). `operationId` = the action or query name; schemas = the DDL columns. A test tool can check the API against it.

### 3.11 Failure handling

| Failure | What happens |
|---|---|
| An action fails | Nothing is written (one commit). The caller gets the error; a repeat with the same `Idempotency-Key` is safe |
| An event is delivered twice | The reaction runs once: `(event_id, reaction)` is unique in `platform.reaction_run` |
| A reaction fails | Retried (DF13). After the last try it is `failed`; it shows in the **owner context's exception queue** (held by that context's maker position) and a notice is sent |
| A chain breaks midway | Earlier steps stay done (each committed). The subject stays in its transient state, held by the failed automation. **Retry continues from the failed step**; no step is undone. A wrong result is corrected by a new action, never by a delete |
| A chain is stuck | DF15 raises a notice |

### 3.12 Outside calls (probes)

| Item | Rule |
|---|---|
| Where | One **adapter** per outside service, in the context that owns the probe result |
| Credentials | In the secret store; never in tables or code |
| Timeout and retry | DF14. A business answer (e.g. "cancelled") is a result, never retried |
| Service down | `502`, class Probe; no result row is written; the subject is unchanged; the user retries |
| Audit | The request and response (masked, §3.13) go in the result row's `detail` |
| Tests | A **fake adapter** with fixed answers (taken from the app's mock, e.g. a GSTIN starting `29ZZ` is cancelled) is used in every contract and rule test |

### 3.13 Production rules

| Item | Rule |
|---|---|
| Sensitive data | Fields holding PAN, bank account, Aadhaar, phone or email are marked `sensitive`. They are encrypted at rest, **masked in API responses** (last 4) unless the caller's position has `view_sensitive`, and masked in the trail and logs |
| Reading sensitive data | A full (unmasked) read writes a row in `platform.access_log` |
| Monitoring | Per action: count, time, gate failures by gate id. Per reaction: lag and failures. Per probe: time and errors. Every log line carries `invocation_id` |
| Performance and retention | DF17 |
| Reference data | Seeded by migration (§3.9); later changes are subjects of their own (rule / mapping change) |
| Environments | The same migrations run in dev, test and production; no hand edits |

### 3.14 Table placement (where each table goes)

```text
 one PostgreSQL database
 ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
 │ schema platform      │ │ schema <foundation>  │ │ schema accounting    │ │ schema <module>      │
 │ code: platform/      │ │ code: capabilities/  │ │ code: capabilities/  │ │ code: capabilities/  │
 │ SHARED, built once   │ │ <context>/           │ │ accounting/          │ │ <context>/           │
 └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

- **Schema = context.** Code = the capability package of that context (POC baseline: `capabilities/<context>/` with its models, actions, queries, events and reactions). Platform machinery lives in `platform/`.
- **Every table gets one status:**

| Status | Meaning |
|---|---|
| **NEW** | Proposed by this task; built with it |
| **REPLACES** `<existing>` | Proposed; takes the place of an existing table (named in the app's backend sketch or the target repo) |
| **EXISTS** | Already there; this task only reads it |
| **SHARED** | Platform machinery or reference data; built once, reused by every later task |

- **Section 0 of the output** shows the table map: every table with its schema, package, status, rows-written-by and purpose, and the totals per status.

### 3.15 Task type → backend shape (from K.TYP)

| Type in the doc | Backend shape |
|---|---|
| **Make** → form on the item | A subject that drafts the facts of one item. The ending writes the result table (§3.4); one approval step per checker block |
| **Record** → form filled from a document | As Make, plus the source document's number on the subject (`<document>_no`) and a Uniqueness gate: one subject per source document |
| **Ask** → form on the item | A subject that asks another role. The ending is their decision; no fact changes here |
| **Decide** | An approval step (`platform.approval`) on another subject; no subject of its own |
| **Run a batch** → gate, press, result | A run subject `<thing>_run` (period, state, totals); one action `Run<Thing>` with a period gate; result rows written by the run |
| **Run a batch, then Decide each line** → worklist | The run + a line table `<thing>_run_line` (state open · explained · fixed · carried, reason); one action `Decide<Thing>Line`; the run completes when every line is decided |
| Cadence "month end", "quarter end" (K.TRG) | A timer `<Thing>RunDue` on the calendar, and a notice to the holder |

---

## 4. The 9 steps (the deck's words, in order)

Each step: **READ** (from the inventory) → **RULE** → **WRITE** (an output section, §6).

### Step 1 · Context: who owns each fact

```text
READ  every F, W, S row · K.REQ, K.SEE, KR.NEV      RULE  owner = the context whose role DECIDES the fact      WRITE  §6-C
```
- **One owner per fact.** Who the party is → `party_master`. The AE's onboarding request and the party's terms → `finance`. Sub-ledgers, the journal and control accounts → `accounting`. Approvals, receipts, timers → `platform`.
- **Another context's fact is only read** (a declared query), never joined and never written.
- **By field group:**
  - party / identity fields → the master (`party_master`);
  - finance fields → the module (`finance`);
  - a worked value worked out **only from identity fields** (PAN, GSTIN) → `party_master` (state, constitution, resident);
  - a worked value that **names or places the account in the books** → `accounting` (account name, "Under (header)");
  - any other worked value → the module (currency, bill-by-bill, 43B(h) → `finance`);
  - the control account → `accounting`.
- **Code tables** belong to the owner of the field that uses them.
- **If two contexts still seem to own a fact,** the one whose checker approves it owns it.
- **From the task doc:** a fact the doc says is "not edited here" (K.REQ, KR.NEV) is read-only for this subject; a refusal rule stops any change to it (step 8).

*Onboarding:* legal name, PAN, GSTIN, address → `party_master`; category, credit days, MSME, bank → `finance`; "Under (header)" → `accounting` (determination).

### Step 2 · Entity: the subject and its life

```text
READ  S (the list rows), T (statuses), F groups · K.SUB, K.DONE, K.TYP      RULE  §3.4–3.5, §3.15      WRITE  §6-D  (tables + state map)
```
- **The subject** = what one row of the task's list stands for (e.g. a request).
- **States** = the status words shown (T), **exactly**. Add `discarded` (DF4), and any transient state needed between an approval and its effect (e.g. `approved`).
- **Moves** = one per action that changes the state (step 3).
- **Child entities** by §3.4. **Probe results** get their own table (§3.5).
- **From the task doc:** K.SUB and K.DONE confirm the subject and its endings; K.TYP gives the shape (§3.15). When one app screen serves several doc tasks, it is one subject: read every card.

```text
            Submit                  Decide (last step approved)       Activate (reaction)
  draft ───────────► submitted ───────────────────────────► approved ──────────────────► active
    ▲                    │ Decide (returned)
    └─── returned ◄──────┘          draft / returned ── SendBack ──► sent_back      draft ── Discard ──► discarded
```

### Step 3 · Action: every button, with its gates

```text
READ  B, P, C · K.CANT, K.EXC, K.WR, KR.NEV       RULE  one button = one action (§3.1–3.2); gates from C       WRITE  §6-E
```

**Gate classes** (each C row becomes exactly one):

| Class | From | Example |
|---|---|---|
| Input | required, format | "Still to fill", PAN format |
| Consistency | Two fields that must agree | GSTIN contains the PAN |
| Probe | A probe result that is missing, stale or bad | "Check the GSTIN on the portal", GSTIN cancelled |
| Uniqueness | Owner's key already exists | GSTIN already our vendor → **send-back** |
| Business | A rule with a parameter | > 45 credit days for 43B(h) |
| State | Allowed only from certain states | Submit only from draft / returned |
| Authority | Position (step 8) | The maker's position; not the maker for a decision (DF6) |

- **Warn rows are not gates.** They are returned in `checks`.
- **Send-back rows** block Submit and allow SendBack.
- **Gates run on Submit**, not on Save (DF12). **Uniqueness gates run again** in the action that writes the unique key (e.g. RegisterParty).
- **A probe with no button of its own** (e.g. the call-back) is recorded by the action whose button carries it (Submit).
- **A probe already satisfied by a linked master record** (Use) writes its result row with `source = master`; no new outside call is made.
- **Approver buttons are one action:** `Decide<Subject>` `{step, outcome: approved | returned, reason}`. In the same commit it:
  - records the step;
  - on `returned`, moves the subject to `returned` and sets the other requested steps of the round to `cancelled`;
  - on the last approval, moves the subject to `approved`.
- **The automatic ending** (e.g. go live) is an action, called by a reaction (step 5).
- **From the task doc:**
  - every K.CANT and K.EXC line is matched to a C row. A line with no C row becomes a gate when the app holds the data it needs (trace: its K id), else a gap;
  - every refusal rule of step 8 that needs a check is a gate (class Authority, `403`);
  - K.WR names are the doc's: listed in renames, never used.

### Step 4 · Event: what each action published

```text
READ  the actions of step 3 · K.SND, K.HO, KR.HAND        RULE  one event per action, name by §3.1        WRITE  §6-F
```
- **Payload:** `{event_id, event, version, occurred_at, legal_entity_id, cause: {invocation_id, action}, subject: {entity, id}, data: <ids + the facts changed>}`.
- **A listener reads anything else it needs** through the owner's query (a declared read). It never relies on fields the event does not carry.
- **Listeners:** from the task's "hands to", the notices (N), and step 5. An event may have no listener yet.
- **From the task doc:** every receiver in K.SND, K.HO and KR.HAND is a listener of the event that tells it (built here, or marked "not built"). It reads what it needs through the owner's query, with a read grant (step 8).

### Step 5 · Reaction: work the system does

```text
READ  N rows, "the system does…" text, effects after a decision · K.TRG, K.SND      RULE  below      WRITE  §6-G
```
- **System work is a reaction; judgement is a person's task.**
- **A reaction lives in the context that owns the fact it changes,** and calls **one action of its own context**.
  - Example: party master's `party-registration` listens to `PartyAccountRequestApproved` and calls `RegisterParty`. Finance never writes `party_master` tables.
- Each reaction runs under a **named automation**; its grant = exactly the actions it calls.
- Each runs **once per event**, is retryable, and a failure is visible (`platform.reaction_run` → the owner's queue).
- **Effects in several contexts form a chain:** each step's event starts the next reaction.
- **Chain order = data order.** A reaction that needs an id waits for the event that creates it. A typical master chain:
  1. subject approved;
  2. the master records the party;
  3. accounting opens the sub-ledger account;
  4. the module activates.
- **Notices and reminders:** every N row is `SendNotice`, called by `notice-sending` on the event that triggers it. There is no separate reminder action. A message to an outside party (e.g. the Udyam reminder) is a notice with `to_party_id`, or `to_address` before the party exists. A repeat is a timer `<Purpose>ReminderDue` whose event calls `SendNotice` again.
- **From the task doc:**
  - a trigger that is another role's event (K.TRG, KR.GET) becomes a reaction, or a list query for the holder;
  - a trigger that arrives on paper (the app says how) has no event;
  - a trigger the app does not handle (e.g. "the terms change") is another subject: listed in output U, not built here.

### Step 6 · Approval and timer

```text
READ  A (checker blocks), D (dates, limits) · K.HO, K.TRG, K.PAR, K.RUL       RULE  below       WRITE  §6-H
```
- **One approval step per checker block:** position, `covers` = the fields in that block, `covered_values` = their values at Submit.
- **States** are the platform's (`requested …`). The app's own word for a waiting step (e.g. "pending" / "Waiting") is a **display label**; list it in P.
- **On resubmit (round + 1):**
  - a step stays approved if its `covered_values` are unchanged;
  - steps that were returned, cancelled or changed are requested again.
- **A block with no fields** (e.g. tax tagging) is a pure approval. If it decides values the screen never shows, that is a gap.
- **Deadline + escalation:** from the app, else DF1.
- **Every number a rule uses is a parameter with an owner.** A number with no owner is a gap.
- **Every date or wait** (reminders, deadlines, due dates) is a `platform.timer` that publishes an event; a reaction acts on it.
- **From the task doc:**
  - **order of steps** by §2.5: the app's, else the doc's "first … then …", else parallel (DF18);
  - a **cadence** in K.TRG ("month end", "every quarter") is a timer `<Thing>RunDue` (§3.15);
  - **every K.PAR name has a parameter row**; its owner from K.RUL (✅ this role, 🟠 the AM), else DF8.

### Step 7 · Query: every list, tile and view

```text
READ  S rows · K.HELD, K.IND        RULE  one business question per query; name List/Get/Find + Object        WRITE  §6-I
```
- **Each S row gets one query**, its filter, authorisation and freshness (DF3).
- **Task lists** return `holder` for each row, worked out from the state:
  - draft / returned → the maker;
  - submitted → the open steps' positions;
  - approved → the automation;
  - terminal → none.
- **The subject view** returns `values`, `checks`, `holder`, `allows` (§3.7).
- **From the task doc:**
  - K.HELD must agree with the holder rule; a difference goes to U;
  - **each indicator (K.IND) is a measure on a list query** (`count`, `oldest_age`, `sum`) asked with `measure=`, id `IND-n`. No new endpoint. An indicator whose data the app does not hold is a gap.

### Step 8 · Authority: who may do what

```text
READ  who sees which button; A; step 5 · K.RUL, KR.NEV, not-this-role's       RULE  person = position; automation = grant       WRITE  §6-J
```
- **A matrix of action × principal.** Authority is computed at each call, never stored.
- **The app grants nothing;** it only hides what is not allowed.
- **Refusal rules (from the task doc), id `NEV-n`.** Every ❌ in K.RUL and every "Never" in KR.NEV that can happen in this task's actions becomes one of three things, and each gets a test (§6-R):
  - a **gate** (class Authority, `403`);
  - a rule shown to **hold by the design** (e.g. a value goes live only through its checker's approved step);
  - **declared** for another task, when it can only happen there: the facts that task will need are kept here.
- **Not this role's:** no grant, and a test that the call is refused. A role the doc says reads the result gets a read grant on the owner's query.

### Step 9 · History: one commit per action

```text
READ  steps 2–6 · K.EVD        RULE  state + receipt + trail + outbox in one transaction        WRITE  §6-K
```
- **For each action:** the rows it writes, and nothing else.
- **A committed record is never edited.** A correction is a new record or a new version.
- **From the task doc:** each scenario step in K.EVD becomes a seed row and a contract test (step 10).

### Step 10 · Assemble

- **DDL (§6-M):** every table from steps 1–2 + §3.6, with §3.9 constraints and indexes, in this order: `platform` → Foundation contexts → the other contexts in chain (data) order; inside each, parents before children. *(Onboarding: platform, party_master, accounting, finance.)*
- **Table map (§6-0):** every table placed by §3.14.
- **OpenAPI (§6-Q):** by §3.10.
- **Rule tests (§6-R):** one per gate id. Each lists the action, a passing case, a failing case, and the expected code and gate id.
- **Failure and outside calls (§6-S):** each chain step and each probe, with what happens when it fails (§3.11–3.12).
- **Production readiness (§6-T):** the §3.13 list applied: sensitive columns, masking, access log, metrics, retention, reference data.
- **API (§6-N):** every action and query, with request body, response and errors (gate ids).
- **Contract tests (§6-O):**
  - one per app scenario (each seeded paper form, each ending);
  - each lists the calls, events and rows expected;
  - every effect in the mock Backend tab is covered (§2.3).
  - one per evidence step (K.EVD).
- **Two sources (§6-U):**
  - the K table: id · fact · result (confirms · adds · differs · out of scope · gap · answered) · used in;
  - the differences: fact · app says · doc says · result;
  - the refusal rules and how each holds;
  - the open questions, answered or still open.

---

## 5. The Accounting context (team lead's design)

### 5.1 Every subject is one of three kinds

| Kind | Examples | On its ending action |
|---|---|---|
| **Master** | vendor, customer, item, bank | Owner records. **No accounting event.** May open a sub-ledger account |
| **Operational** | PR, PO, sales order | Records. No event. An open PO feeds `commitment` |
| **Financial** | GRN (perpetual), invoices, receipt, payment, payroll, depreciation, manual journal | Records + **one accounting event** |

### 5.2 Masters: sub-ledger account, not a GL account

```text
┌─────────────────────┐  PartyAccountRequestApproved  ┌──────────────────────────┐
│ finance             │ ────────────────────────────► │ party_master             │
│ DecidePartyAccount… │                               │ party-registration:      │
│ (last step)         │                               │ RegisterParty | AddParty │
└─────────────────────┘                               │ Role                     │
          ▲                                           └────────────┬─────────────┘
          │ SubledgerAccountOpened                                 │ PartyRegistered | PartyRoleAdded
┌─────────┴───────────┐                               ┌────────────▼─────────────┐
│ finance             │ ◄──────────────────────────── │ accounting               │
│ party-onboarding:   │                               │ subledger-opening:       │
│ ActivatePartyAccount│                               │ OpenSubledgerAccount     │
│ Request             │                               │ reads account_determin-  │
│ (writes party_      │                               │ ation (control, category)│
│ account + satellites│                               │ + the request (a query)  │
└─────────────────────┘                               └──────────────────────────┘
```
- **The app's "Under (header)"** is the control account. Its worked value must equal the determination; if the maker changes it, it must be an active control account for that side, and the change is covered by the AM's step.
- **No journal is written.** The control account balance does not change, and the sub-ledger still ties to it.

### 5.3 Financial subjects: event → rules → journal

```text
┌──────────────┐   accounting event    ┌───────────────────────────┐   lines   ┌──────────────────────────┐
│ module action │ ────────────────────► │ posting-engine (reaction) │ ────────► │ journal (append-only)    │
│ Approve…      │  amounts·tax·dims,    │ posting_rule + account_   │  per book │ → gl_balance · TB · FS   │
└──────────────┘  no accounts          │ determination             │           │ ⇅ sub-ledgers tie        │
                                        └─────────────┬─────────────┘           └──────────────────────────┘
                                                      │ cannot post → posting_exception → AE's queue
```

```yaml
rule: VENDOR_INVOICE_APPROVED / STAT / perpetual          # version, effective date
lines:
  - {dr: sum(lines.taxable), account: GRIR_CLEARING,                 when: line.grn}
  - {dr: line.taxable,       account: det(expense, line.item_group), when: not line.grn}
  - {dr: line.cgst,          account: det(input_cgst, line.gst_code)}
  - {dr: line.sgst,          account: det(input_sgst, line.gst_code)}
  - {cr: total - tds,        account: det(control, party),  subledger: AP, party: party}
  - {cr: tds.amount,         account: det(tds_payable, tds.section)}
```

- **For a financial subject, the output adds:** the event payload, a posting rule per book, the determination keys it needs, and a **preview gate** at Submit (a missing mapping stops Submit).
- **Rule and mapping changes are subjects** of their own (made by the AE, approved by the AM, versioned).
- **Periods:** open / soft / hard per module. A gate on every financial action: the module's period for `posting_date` is not hard-closed.

### 5.4 Accounting tables (built once)

```sql
accounting.account               (id, legal_entity_id, name, parent_id, type, is_postable, is_control)   -- the chart; read by this method, never written by a task
accounting.account_determination (key_type, key, legal_entity_id, book_id, account_id, valid_from, valid_to)
accounting.subledger_account     (id, legal_entity_id, subledger, party_id, control_account_id, name, valid_from, valid_to, state)
accounting.posting_rule          (id, event, legal_entity_id, book_id, inv_method, version, effective_from, lines jsonb)
accounting.accounting_event      (event_id PK, event, source_entity, source_id, payload jsonb, state, received_at)
accounting.journal_entry         (id, book_id, legal_entity_id, branch, source_entity, source_id, event_id, rule_version,
                                  document_date, posting_date, fy, period, kind, reverses_entry, memo, made_by, approved_by, posted_by)
accounting.journal_line          (entry_id, line_no, account_id, dr_txn, cr_txn, currency, dr_fn, cr_fn, subledger, party_id,
                                  item_id, asset_id, cost_centre, project, prod_code, tax_code, narration)
                                  -- append-only; Dr = Cr per entry; UNIQUE (event_id, book_id)
accounting.gl_balance · accounting.period_status (module, fy, period, status) · accounting.posting_exception · accounting.commitment
```

---

## 6. Output: the backend spec sheet (fixed sections)

Every run produces these sections, in this order, as tables. Every row carries its **trace** (inventory ids).

| § | Section | Columns |
|---|---|---|
| 0 | **Backend at a glance** (first, always) | exact counts (tables per context and per status · endpoints · rules per action · events · reactions + automations · approval steps · timers · parameters · accounting events · task-doc facts · differences · refusal rules · tests) + the **table map** (§3.14): table · schema · package · status · written by · purpose |
| A | Task card | id · name · starts when · done when · hands to |
| B | Inventory | id · element · app location; K id · fact · result |
| C | Contexts | context · owns · reads from others · trace |
| D | Entities | table · columns (name · type · null · check · FK) · state map · trace |
| E | Actions | action · context · endpoint · principal · from states → to state · gates (class · condition · gate id) · event · trace |
| F | Events | event · publisher · payload data · listeners |
| G | Reactions | automation · context · on event (+ condition) · calls · grant |
| H | Approvals, timers, parameters | step · position · covers · deadline · escalation / timer · event · due / parameter · value · owner |
| I | Queries | query · endpoint · question · filter · returns (incl. holder, allows) · authorised for · freshness · trace |
| J | Authority | action × principal |
| K | History | action · rows written in its one commit |
| L | Accounting | kind · accounting event or none · sub-ledger · posting rule · determination keys |
| M | DDL | `CREATE TABLE …` for every table |
| N | API | method · path · body · response · errors (gate ids) |
| O | Contract tests | scenario · calls · events · rows expected |
| P | Gaps, defaults, renames | what the app did not say · defaults used (DF#) · mock-log name → spec name |
| Q | OpenAPI | path of the OpenAPI 3.1 file · operation count · how it was checked |
| R | Rule tests | gate id · action · class · passing case · failing case · expected code |
| S | Failure and outside calls | chain step or probe · failure · what happens · who fixes |
| T | Production readiness | item · applied how (sensitive columns, masking, access log, metrics, retention, reference data) · open points |
| U | Two sources | K results (counts) · differences app ↔ doc (fact · app says · doc says · result) · refusal rules (id · rule · how it holds · test) · open questions |

---

## 7. Done and determinism check

- [ ] Every inventory id appears in at least one output row (rule 4).
- [ ] Every output row has a trace (rule 4).
- [ ] Every name follows §3.1–3.2; every type follows §3.3.
- [ ] Every fact has one owner; no action writes another context's table.
- [ ] Every action has gates, a principal, an event, an endpoint and a one-commit row list.
- [ ] Every automatic effect is a reaction with a named automation and a grant.
- [ ] Every number is a parameter with an owner; every wait is a timer.
- [ ] Every status shown is a state, with the same word.
- [ ] Every effect in the mock Backend tab is covered (renames in P).
- [ ] The kind is declared; a financial subject has an event, a rule per book and a preview gate.
- [ ] Every table has a schema, a package and a status (§3.14); section 0 totals match section M.
- [ ] Every Uniqueness gate has a `UNIQUE` index; every query filter has an index (§3.9).
- [ ] The OpenAPI file has one operation per action and query (§3.10).
- [ ] Every gate id has a rule test (§6-R).
- [ ] Every reaction and probe has a failure line (§6-S); every sensitive field is marked (§6-T).
- [ ] Every task-doc fact (K) has a result: used, out of scope, or a gap (rule 4).
- [ ] Every "Never" and ❌ rule is a gate, holds by the design, or is declared for another task; each has a test.
- [ ] Every hand-off is an approval step or a listener; every K.PAR name is a parameter; every K.IND is a measure or a gap.
- [ ] Every difference between the app and the task doc is in U with both texts and the result.
- [ ] **Determinism:** a second run by another person or AI, from the same app and task, gives the same sections C–N and U. Every difference is a missing rule; add it to §2.4–§5.

**Determinism runs so far:**

| Run | Date | How | Result | Rules added |
|---|---|---|---|---|
| 1 | 28-Oct | Two fresh AI agents, each given only this doc (rev 4), the onboarding app and task T7 / T12 / T17 | The same contexts, ~25 tables and the same actions in both. **About a dozen differences** (27 and 30 open choices listed) | Column names and clashes · id rule · timer events · verbs Use(null), Send, Mark, Escalate · one `Decide<Subject>` action · yes/no → boolean · code tables per side · result table + split rule · tenant column · owner of worked values · probe reuse and probes without a button · gates on Submit only · chain order (the §5.2 drawing was wrong) · notices to outside parties · approval rounds and `cancelled` · DF8–DF12 |
| 2 | 28-Oct | The same, with rev 4.1 | **The same 25 tables, identical columns in 19, the same 16 core actions.** Left: naming of links to a person and of list-table columns, escalation and reminder actions, two contradictions in this doc (approval event name, owner of the account name) | Event name on a state move · person links · child-table and code-table columns · state times · `EscalateApproval`, `MarkNotice` · worked-value owners by meaning · probe gate covers bad results · ok checks returned · Submit body · response codes · DDL order · notice to an address · DF6, DF9 |
| 3 | 28-Oct | Two runs on rev 4.2 | Both agents stalled with no output after 50 min and were stopped. **Not a result.** The example `02` was built from run 2 with the rev 4.2 rules applied | — |
| — | 29-Oct | Rev 5 and rev 6 | **Not yet run.** Rev 6 adds the task doc as a second input. Its facts are found by meaning, so a doc with another layout should give the same K table: the next run should test that too | — |

---

## 8. Role map and build order

**Each role brings two inputs:** its app and its task doc (input 19).

| Role | Its app's tasks (subjects) | Kind |
|---|---|---|
| **Accounts Executive** | party onboarding (**reference app**) · purchase invoice · manual journal · rule / mapping change · exception fix · recon | master · financial |
| **Accounts Manager** | module close; approves AE subjects | — |
| Procurement Officer | PR · PO | operational |
| Stores | GRN | financial (perpetual) |
| Billing · Collections · Payables · Payments | sales invoice · receipt · payment proposal · payment release | financial / operational |
| Credit Controller · Compliance Officer · Finance Controller | approval steps; credit hold · tax runs · period lock | — |

**Order:** platform tables (§3.6) → onboarding (this reference) → accounting core (§5.4) → purchase invoice → along the thread (GRN, payment, sales).

---

## 9. Decisions and open questions

| # | Item | Status |
|---|---|---|
| D1 | A party is a sub-ledger account under a control account | Adopted as interpretation (§2.3, §5.2). App unchanged |
| D2 | Posting after approval, as a reaction; failures to the exception queue | Proposed |
| D3 | Books: statutory first, `book_id` from day one | Proposed |
| D4 | Perpetual or periodic: per company | Team lead |
| D5 | Soft-close allows only AM-approved adjustments | Proposed |
| D6 | Tax determination changes: AM + Compliance Officer | Proposed |
| D7 | The app owns screen facts and wins on them; the task doc owns why · who · when · never (§2.5). Neither is changed by this method | **Decided** (inputs 12, 15, 19) |
| D8 | The one approval mechanism lives in `platform` (owned by the Accounting boundary team, per the deck) | Proposed |
| D9 | The task doc is a second input; its facts are found by meaning, not by layout (§2.4) | **Decided** (input 19) |

**Sources:** the role's task doc (`01_accounts_executive_tasks_and_responsibilities.md`) · team lead's design note (27-Oct) · `engine-concepts.pptx` (26-Oct) · Oct 1 Role-wise Work List · [SAP postings](https://learning.sap.com/learning-journeys/outlining-the-record-to-report-process-in-sap-s-4hana/explaining-the-basic-concepts-of-postings-and-documents_af02b1a9-7fdb-4f1a-88c9-f3121d7624f1) · [Oracle SLA](https://docs.oracle.com/cd/E26401_01/doc.122/e48829/T372621T464264.htm) · [ERPNext immutable ledger](https://docs.frappe.io/erpnext/immutable-ledger-in-erpnext) · [TigerBeetle](https://docs.tigerbeetle.com/coding/two-phase-transfers/)
