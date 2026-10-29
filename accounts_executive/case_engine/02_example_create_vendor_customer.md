# Example: set up a party account (T7 · T12 · T17), read off the app

**What this is:** the output of `01_task_to_backend_engine.md` **rev 6**, applied to its two inputs for one task: the fixed app `docs/accounts_executive/app/src/onboarding/` and the task doc `docs/accounts_executive/01_accounts_executive_tasks_and_responsibilities.md` (cards T7, T12, T17 and the role summary). Sections 0 and A–U are the spec sheet of §6.

**How it was made:** determinism run 2 (a fresh agent, given only the method and the app), then the rev 4.2, rev 5 and rev 6 rules applied (see the end). Date: 28-Oct-2026; rev 6 (the task doc read) 29-Oct-2026.

**Files:** this sheet · `02_onboarding_openapi.yaml` (the API as OpenAPI 3.1, section Q).

```text
┌──────────────────────┐ PartyAccountRequestApproved ┌──────────────────────────┐ PartyRegistered │ PartyRoleAdded ┌──────────────────────────┐
│ finance              │ ──────────────────────────► │ party_master             │ ─────────────────────────────► │ accounting               │
│ DecidePartyAccount-  │                             │ party-registration:      │                                │ subledger-opening:       │
│ Request (last step)  │                             │ RegisterParty | AddParty-│                                │ OpenSubledgerAccount     │
└──────────────────────┘                             │ Role                     │                                └────────────┬─────────────┘
          ▲                                          └──────────────────────────┘                                             │
          │ ActivatePartyAccountRequest (party-onboarding) ◄────────────── SubledgerAccountOpened ─────────────────────────────┘
          ▼
   PartyAccountRequestActivated → notices · Purchase / Sales / Payables listen          (a master: no accounting event, no journal)
```

## 0. Backend at a glance

### 0.1 Counts

| What | How many | Details in |
|---|---|---|
| **Tables** | **26** (platform 10 · party_master 6 · accounting 3 · finance 7) | 0.2 · D · M |
| **Fields (columns)** | **246** across the 26 tables (147 in the 14 built by this task) | 0.3 · D.2 · M |
| **Tables this task builds** | **14**: 11 NEW + 3 REPLACES an existing table | 0.2 |
| **Tables reused** | **12**: 11 SHARED (built once for every task) + 1 EXISTS (read only) | 0.2 |
| **API endpoints** | **35** (16 actions + 19 queries) · OpenAPI file: `02_onboarding_openapi.yaml` | E · I · N · Q |
| **Rules** | **78 stop rules + 8 warnings** = 86 · plus **6 refusal rules** from the task doc (5 tested here, 1 declared for the purchase voucher task) | E · R · U.3 |
| **Tests** | **91** = 78 gate + 8 warning + 5 refusal | R |
| **Events** | **19** (17 from actions + 2 from timers) | F |
| **Reactions** | **12**, under **5 named automations** | G |
| **Approval steps** | **6** (vendor 3 · customer 3) | H.1 |
| **Timers · parameters** | **2 · 7** | H.2 · H.3 |
| **Outside services** | **2** (GST portal · bank penny-drop) | S |
| **Sensitive columns** | **9** | T |
| **Accounting events** | **0** (a master writes no journal) | L |
| **Inputs read** | App: 30 screen parts (S) · 31 fields · 12 worked values · 35 check lines. Task doc: **52 facts** (T7 18 · T12 17 · T17 10 · role 7) | B |
| **Task-doc results** | 24 confirm · 11 differ · 7 add · 3 renamed · 3 gaps · 2 answered · 2 out of scope | B · K · U.1 |
| **App ↔ task-doc differences** | **8** (D1–D8): the app wins 6 · method names 1 · agreed and out of scope 1 | U.2 |
| **Indicators** | **2** from the task doc: IND-1 built as a measure on a list · IND-2 a gap (G15) | I · U |

### 0.2 Table map: how many, and where each goes

```text
 one PostgreSQL database (POC)                                                    legend: N = NEW · R = REPLACES · S = SHARED · E = EXISTS
┌────────────────────────────┐ ┌────────────────────────────┐ ┌────────────────────────────┐ ┌────────────────────────────┐
│ schema platform        (10)│ │ schema party_master     (6)│ │ schema accounting       (3)│ │ schema finance          (7)│
│ code: platform/            │ │ code: capabilities/        │ │ code: capabilities/        │ │ code: capabilities/        │
│                            │ │       party_master/        │ │       accounting/          │ │       finance/             │
│ S automation               │ │ N state_code               │ │ E account (chart)          │ │ N category_code            │
│ S parameter                │ │ N constitution_code        │ │ S account_determination    │ │ N party_account_request ◄──┼── the subject
│ S receipt                  │ │ N party                    │ │ R subledger_account        │ │ N gstin_check              │
│ S trail                    │ │ N party_gstin              │ │                            │ │ N bank_account_verification│
│ S outbox                   │ │ N party_phone              │ │                            │ │ R party_account            │
│ S reaction_run             │ │ N party_role               │ │                            │ │ R party_credit_limit       │
│ S approval                 │ │                            │ │                            │ │ N party_bank_account       │
│ S timer · S notice         │ │                            │ │                            │ │                            │
│ S access_log               │ │                            │ │                            │ │                            │
└────────────────────────────┘ └────────────────────────────┘ └────────────────────────────┘ └────────────────────────────┘
   built once, every task        Foundation: shared by every    team lead's engine: GL,        the AE's AP / AR module
   reuses them                   legal entity (workspace_id)    sub-ledgers, determination
```

| # | Table | Code package | Status | Rows written by | Purpose |
|---|---|---|---|---|---|
| 1 | `platform.automation` | `platform` | SHARED | migration (seed) | Named automations and their grants |
| 2 | `platform.parameter` | `platform` | SHARED | migration (seed) | The 7 limits, each with an owner |
| 3 | `platform.receipt` | `platform` | SHARED | every action | One row per call: who, under what, outcome |
| 4 | `platform.trail` | `platform` | SHARED | every action | What changed on each record (edit log) |
| 5 | `platform.outbox` | `platform` | SHARED | every action | Events waiting to be delivered |
| 6 | `platform.reaction_run` | `platform` | SHARED | the dispatcher | Each reaction run once per event; retries, failures |
| 7 | `platform.approval` | `platform` | SHARED | Submit, Decide, Escalate | The one approval mechanism: steps per request |
| 8 | `platform.timer` | `platform` | SHARED | Submit, Decide, SendNotice | Deadlines and reminders |
| 9 | `platform.notice` | `platform` | SHARED | SendNotice, MarkNotice | Bell notices and outside messages |
| 10 | `platform.access_log` | `platform` | SHARED | unmasked reads | Who saw PAN / bank details in full |
| 11 | `party_master.state_code` | `capabilities/party_master` | NEW | migration (seed) | Indian states and GST codes |
| 12 | `party_master.constitution_code` | `capabilities/party_master` | NEW | migration (seed) | Company, firm, individual … |
| 13 | `party_master.party` | `capabilities/party_master` | NEW | RegisterParty | Who the party is (one per GSTIN/PAN) |
| 14 | `party_master.party_gstin` | `capabilities/party_master` | NEW | RegisterParty | The party's GSTINs |
| 15 | `party_master.party_phone` | `capabilities/party_master` | NEW | RegisterParty | The party's phones |
| 16 | `party_master.party_role` | `capabilities/party_master` | NEW | RegisterParty, AddPartyRole | Supplier / customer of our company |
| 17 | `accounting.account` | `capabilities/accounting` | EXISTS | — (read only) | The chart: control accounts ("Under (header)") |
| 18 | `accounting.account_determination` | `capabilities/accounting` | SHARED | migration (seed); later a mapping-change task | Category → control account |
| 19 | `accounting.subledger_account` | `capabilities/accounting` | REPLACES `accounting.account` party leaves + `accounting.party` | OpenSubledgerAccount | The party's AP / AR account (`ACC-…`) |
| 20 | `finance.category_code` | `capabilities/finance` | NEW | migration (seed) | Creditor / debtor categories (+ 43B(h), TDS hints) |
| 21 | `finance.party_account_request` | `capabilities/finance` | NEW | Open, Save, Use, Submit, Decide, SendBack, Discard, Activate | **The subject:** one onboarding from a paper form |
| 22 | `finance.gstin_check` | `capabilities/finance` | NEW | CheckGstin, UseParty | GST portal results |
| 23 | `finance.bank_account_verification` | `capabilities/finance` | NEW | VerifyBankAccount, Submit | Penny-drop and call-back results |
| 24 | `finance.party_account` | `capabilities/finance` | REPLACES `accounting_txn.party_terms` + `party_classification` + `party_compliance_status` | ActivatePartyAccountRequest | The account's terms, category, MSME, billing |
| 25 | `finance.party_credit_limit` | `capabilities/finance` | REPLACES `accounting_txn.party_terms.credit_limit` | ActivatePartyAccountRequest | Credit limit, versioned (customer) |
| 26 | `finance.party_bank_account` | `capabilities/finance` | NEW | ActivatePartyAccountRequest | Bank details, versioned (vendor) |

**Totals:** NEW 11 · REPLACES 3 · SHARED 11 · EXISTS 1 = **26**. The existing tables named under REPLACES are the ones the app's Backend tab marks "Finance (existing)" (aikyat-finance today).

### 0.3 Fields in each table

**26 = tables, not fields.** Each table below has its own fields (columns). Total: **246 fields across the 26 tables**; the 14 tables this task builds have **147** of them. Field types, null rules and checks: D.2 and M.

| # | Table | Status | Fields | Field names (task fields first · *+ standard fields*) |
|---|---|---|---|---|
| 1 | `platform.automation` | SHARED | **4** | `name`, `context`, `grant` · *+ legal_entity_id* |
| 2 | `platform.parameter` | SHARED | **6** | `key`, `value`, `unit`, `owner_position`, `valid_from` · *+ legal_entity_id* |
| 3 | `platform.receipt` | SHARED | **9** | `invocation_id`, `action`, `principal`, `position_or_grant`, `request_key`, `rules_version`, `outcome`, `at` · *+ legal_entity_id* |
| 4 | `platform.trail` | SHARED | **8** | `entity`, `entity_id`, `invocation_id`, `diff`, `reason`, `at` · *+ legal_entity_id, id* |
| 5 | `platform.outbox` | SHARED | **10** | `event_id`, `event`, `entity`, `entity_id`, `invocation_id`, `payload`, `at`, `delivered_at` · *+ legal_entity_id, version* |
| 6 | `platform.reaction_run` | SHARED | **7** | `event_id`, `reaction`, `invocation_id`, `attempts`, `last_error` · *+ legal_entity_id, state* |
| 7 | `platform.approval` | SHARED | **14** | `entity`, `entity_id`, `round`, `step`, `position`, `covers`, `covered_values`, `deadline_at`, `decided_by`, `decided_at`, `reason` · *+ legal_entity_id, id, state* |
| 8 | `platform.timer` | SHARED | **7** | `event`, `entity`, `entity_id`, `due_at` · *+ legal_entity_id, id, state* |
| 9 | `platform.notice` | SHARED | **13** | `to_position`, `to_party_id`, `to_address`, `channel`, `entity`, `entity_id`, `tone`, `title`, `body`, `at`, `read_at` · *+ legal_entity_id, id* |
| 10 | `platform.access_log` | SHARED | **7** | `principal`, `entity`, `entity_id`, `fields`, `at` · *+ legal_entity_id, id* |
| 11 | `party_master.state_code` | NEW | **4** | `key`, `label`, `active`, `attributes` |
| 12 | `party_master.constitution_code` | NEW | **3** | `key`, `label`, `active` |
| 13 | `party_master.party` | NEW | **19** | `legal_name`, `trade_name`, `pan`, `address_line`, `city`, `state_code`, `pincode`, `contact_person`, `email`, `constitution`, `resident` · *+ id, workspace_id, state, version, created_at, created_by, updated_at, updated_by* |
| 14 | `party_master.party_gstin` | NEW | **8** | `party_id`, `gstin`, `state_code`, `status` · *+ id, workspace_id, created_at, created_by_invocation* |
| 15 | `party_master.party_phone` | NEW | **6** | `party_id`, `phone` · *+ id, workspace_id, created_at, created_by_invocation* |
| 16 | `party_master.party_role` | NEW | **11** | `party_id`, `type`, `since`, `entered_by_person_id`, `form_from_person_id`, `form_no` · *+ id, workspace_id, legal_entity_id, created_at, created_by_invocation* |
| 17 | `accounting.account` | EXISTS | **7** | `name`, `parent_id`, `type`, `is_postable`, `is_control` · *+ id, legal_entity_id* |
| 18 | `accounting.account_determination` | SHARED | **7** | `key_type`, `key`, `book_id`, `account_id`, `valid_from`, `valid_to` · *+ legal_entity_id* |
| 19 | `accounting.subledger_account` | REPLACES | **14** | `subledger`, `party_id`, `control_account_id`, `name`, `valid_from`, `valid_to` · *+ id, legal_entity_id, state, version, created_at, created_by, updated_at, updated_by* |
| 20 | `finance.category_code` | NEW | **5** | `key`, `label`, `active`, `side`, `attributes` |
| 21 | `finance.party_account_request` | NEW | **20** | `side`, `from_person_id`, `form_no`, `party_id`, `values`, `origins`, `round`, `submitted_at`, `activated_at`, `sent_back_reason`, `sent_back_at`, `subledger_account_id` · *+ id, legal_entity_id, state, version, created_at, created_by, updated_at, updated_by* |
| 22 | `finance.gstin_check` | NEW | **8** | `party_account_request_id`, `input_key`, `result`, `detail`, `checked_at`, `source` · *+ id, legal_entity_id* |
| 23 | `finance.bank_account_verification` | NEW | **8** | `party_account_request_id`, `method`, `input_key`, `result`, `detail`, `checked_at` · *+ id, legal_entity_id* |
| 24 | `finance.party_account` | REPLACES | **23** | `subledger_account_id`, `party_id`, `party_account_request_id`, `side`, `category`, `related_party`, `credit_days`, `msme_status`, `msme_category`, `udyam`, `sec43bh`, `currency`, `bill_by_bill`, `po_rule`, `delivery`, `invoice_format` · *+ legal_entity_id, state, version, created_at, created_by, updated_at, updated_by* |
| 25 | `finance.party_credit_limit` | REPLACES | **7** | `subledger_account_id`, `credit_limit`, `valid_from`, `valid_to` · *+ id, legal_entity_id, created_by_invocation* |
| 26 | `finance.party_bank_account` | NEW | **11** | `subledger_account_id`, `bank_account_no`, `ifsc`, `beneficiary`, `call_back_number`, `call_back_person`, `valid_from`, `valid_to` · *+ id, legal_entity_id, created_by_invocation* |
| | **Total** | | **246** | |

Standard fields (01 §3.2) are the tenant column (`legal_entity_id` or `workspace_id`), `id`, and on an entity `state`, `version`, `created_at/by`, `updated_at/by`; a child row has `created_at`, `created_by_invocation`.

### 0.4 Endpoints

| Kind | Endpoints |
|---|---|
| Finance actions (10) | open · save · use-party · check-gstin · verify-bank-account · submit · decide · send-back · discard · activate |
| Party master actions (2) | register party · add role |
| Accounting actions (1) | open sub-ledger account |
| Platform actions (3) | send notice · mark notice · escalate approval |
| Queries (19) | finance 7 · party_master 4 · accounting 4 · hr 1 · platform 3 |

### 0.5 Rules by action

| Action | Rules | Action | Rules |
|---|---|---|---|
| Submit | 27 | Register party | 4 |
| Warnings (returned, not blocking) | 8 | Add role | 4 |
| Open | 5 | Activate | 3 |
| Decide | 5 | Send back | 3 |
| Open sub-ledger account | 5 | Use party | 3 |
| Check GSTIN | 4 | Discard · Notice · Mark · Escalate | 2 each |
| Verify bank account | 4 | Save | 3 |

**Parameters (7):** msmed_max_credit_days 45 · penny_drop_pass_pct 80 · gst_name_match_pct 80 · udyam_reminder_days 7 · approval_deadline_hours 48 · usual_vendor_credit_days 45 · usual_customer_credit_days 30 (owner: Accounts Manager).

**Read from the app:** 30 screen parts · 31 fields · 12 worked values · 35 check lines. **Read from the task doc:** 52 facts (section B · K).

---

Conventions used throughout:
- Positions: `accounts_executive` (AE), `accounts_manager` (AM), `finance_controller` (FC), `credit_controller` (CC), `compliance_officer` (CO), `procurement_officer`, `contracts_services_procurement_officer`, `sales_executive`.
- Persons are the app's actor keys (`teja`, `rajan`, `usha`, `farid`, `venkat`, `ravi`, `kiran`, `arun`).
- Paths below are shown without the host; every action call carries `Idempotency-Key`; the legal entity comes from the session (§3.7).

---

## A. Task card

| id | name | starts when | done when | hands to | trace |
|---|---|---|---|---|---|
| T7 · T12 · T17 | Set up a party account (vendor / customer onboarding) | Procurement (Ravi, Kiran) or Sales (Arun) hands the AE a **paper form** (with GST certificate, PAN, cancelled cheque); the AE presses "New from a paper form" → "Open it" | Terminal state `active` (party in the master + sub-ledger account under its control account), `sent_back` (form returned to whoever handed it over; nothing created), or `discarded` (opened by mistake) | Checkers: AM (party, account, terms, MSME / billing), FC (bank, payable), CC (credit limit, receivable), CO (GST / TDS / TCS tagging). On `active`: the maker is told; Purchase can post vouchers / Payables gets the MSME clock (payable); Sales can confirm orders / Billing reads the instructions (receivable); Payments flags new bank details. On `sent_back`: the person who handed the form over | S7, S19, B1, B2, T1, N2, N6, N7, N8, N9 |

**Read with the task doc (rev 6):**

| Item | App says | Task doc says | Result |
|---|---|---|---|
| Tasks | One screen, "Set up a party account" | T7 vendor finance fields · T12 customer finance fields · T17 Udyam data, all R2 | One subject (D6) |
| Starts when | A paper form is handed over; "New from a paper form" | The Procurement Officer proposes a vendor · a customer is approved · the Credit Controller recommends · terms change. As needed | The app (D1); changes are another subject (D8) |
| Done when | `active` · `sent_back` · `discarded` | Saved and sent for checking (the maker's part) | Both: end states from the app; the holder moves at Submit |
| Hands to | AM, FC, CC, CO; notices | AM, FC, CC; Billing Executive, Payables Executive, the CO's MSME register | Union (F, H.1) |
| Type | Full-screen workspace: list · form · checklist | Make (T7, T12) · Record (T17) → form on the item | Make (01 §3.15) |
| Indicators | KPIs Needs me · With checkers · Activated · Vendors without Udyam | Vendor proposals waiting (age) · recommendations waiting | IND-1 added; IND-2 a gap (G15) |

---

## B. Inventory

### S · screens, tabs, lists, tiles, sheets

App menu as of 29-Oct: Dashboard · Tasks · Rules · Forms · C&C. The onboarding screens are unchanged; S21 and S23–S27 moved under the new menu and S30 was added. The only backend effect is S30, a count on ListPartyAccountRequests (DF11).

| id | element | app location |
|---|---|---|
| S1 | KPI "Needs me" (count of draft / returned) | `DashboardScreen.tsx` KpiCard |
| S2 | KPI "With checkers" (count of submitted) | `DashboardScreen.tsx` |
| S3 | KPI "Activated" (count of active) | `DashboardScreen.tsx` |
| S4 | KPI "Vendors without Udyam" (payable accounts, MSME unknown or yes without Udyam; names listed) | `DashboardScreen.tsx` |
| S5 | Tile "Needs me" list (title, returned reason or "Form X from Y", opened ago) | `DashboardScreen.tsx` |
| S6 | Tile "Recent" (first 5 notices, "same as the bell") | `DashboardScreen.tsx` |
| S7 | Tile "How a new vendor or customer reaches you" (FLOW 5 steps + callout "No group ledger to pick") | `DashboardScreen.tsx` |
| S8 | Rail group "Needs me" (draft, returned; newest first; name · side · form · from · when) | `OnboardingScreen.tsx` |
| S9 | Rail group "With checkers" (submitted) | `OnboardingScreen.tsx` |
| S10 | Rail group "Done" (active, sent_back) | `OnboardingScreen.tsx` |
| S11 | Request header (id, side, form no, from, opened, title, status pill, PAN, GSTIN + portal status, city/state, phone, party) | `RequestHeader` |
| S12 | Sections 1 Party details · 2 Finance details · 3 Worked out by the system (value · why · origin · Undo / Edit) | `RequestWorkspace`, `FieldRow`, `WorkedTable` |
| S13 | Section 4 Tax tagging (computed lines) | `RequestWorkspace` + `taxTagging` |
| S14 | Checkers section (block → checker, Waiting / Approved / Returned, decided at, reason) | `RequestWorkspace` |
| S15 | History (time · who · text) | `RequestWorkspace` |
| S16 | Checklist side panel (entries ✓ / missing, "To fix before submit", "Warnings", Submit / Save / Return / Discard) | `Checklist` |
| S17 | Progress steps (read-only view) | `stepsOf`, `StatusSteps` |
| S18 | Callouts: "This form cannot be set up", "Use P-xxxx", "Returned to you", "Form returned to …", "Active since …" | `RequestWorkspace` |
| S19 | Dialog "New from a paper form" | `NewDialog` |
| S20 | Paper panel (DEMO) | `PaperPanel` |
| S21 | "Vendors & customers" list (filter All / Vendors / Customers; account, side, under, category, terms, MSME, bank, active since) | Forms › Vendors & customers · `PartiesScreen.tsx` |
| S22 | Party account sheet (Party identity block, Finance section, "Change something?" callout) | `PartiesScreen.tsx`, `IdentityBlock` |
| S23 | Rules › Onboarding checks: check list (stop / warn) | `ChecksScreen.tsx` CHECKS |
| S24 | Checks screen: who checks which part | `ChecksScreen.tsx` + `routesFor` |
| S25 | Checks screen: parameters | `ChecksScreen.tsx` PARAMS |
| S26 | Rules › Backend view (log + tables) | `BackendScreen.tsx` |
| S27 | Notification bell + Tasks menu badge | `App.tsx` |
| S28 | Profile: can / cannot | `Profile.tsx` |
| S29 | Demo panel (DEMO) | `DemoPanel.tsx` |
| S30 | Tasks page: card "Onboarding: create a ledger" (badge = needs me; "n needs you · m with checkers") | `tasks/TasksHome.tsx` |

### F · fields typed

| id | key | label | kind / unit / options | required-when · visible-when · pattern | sides | group |
|---|---|---|---|---|---|---|
| F1 | legalName | Legal name | text | always | both | party |
| F2 | tradeName | Trade name | text | – | both | party |
| F3 | pan | PAN | text | resident ≠ non_resident · `^[A-Z]{5}[0-9]{4}[A-Z]$` (C1) | both | party |
| F4 | gstin | GSTIN | text | – · `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$` (C2) | both | party |
| F5 | addressLine | Address | text | always | both | party |
| F6 | city | City | text | always | both | party |
| F7 | pincode | PIN code | text | resident ≠ non_resident · `^\d{6}$` (C5) | both | party |
| F8 | contactPerson | Contact person | text | – | both | party |
| F9 | phone | Phone | text | always | both | party |
| F10 | email | Email | text | side = receivable | both | party |
| F11 | category | Category | select, 20 (payable) / 16 (receivable) options by side | always | both | finance |
| F12 | relatedParty | Related party? | select yes / no | always | both | finance |
| F13 | creditDays | Credit days | number, days | always | both | finance |
| F14 | creditLimit | Credit limit | number, ₹ | always | receivable | finance |
| F15 | msmeStatus | MSME? | select yes / no / unknown | always | payable | finance |
| F16 | msmeCategory | MSME category | select micro / small / medium | msmeStatus = yes · visible msmeStatus = yes | payable | finance |
| F17 | udyam | Udyam number | text | – · visible msmeStatus = yes · `^UDYAM-[A-Z]{2}-\d{2}-\d{7}$` (C25) | payable | finance |
| F18 | bankAccountNo | Bank account number | text | always | payable | finance |
| F19 | ifsc | IFSC | text | always · `^[A-Z]{4}0[A-Z0-9]{6}$` (C28) | payable | finance |
| F20 | beneficiary | Beneficiary name | text | always | payable | finance |
| F21 | callBackNumber | Call-back: number you called | select, options built at run time (phone on the form, or `email`) | penny-drop name_mismatch (visible + required) | payable | finance |
| F22 | callBackPerson | Call-back: who confirmed | text | penny-drop name_mismatch | payable | finance |
| F23 | poRule | PO reference | select every_invoice / none | always | receivable | finance |
| F24 | delivery | Send invoices by | select email / portal / with_goods / courier | always | receivable | finance |
| F25 | invoiceFormat | Invoice format note | text | – | receivable | finance |
| F26 | side | The form is for a | payable / receivable | always (dialog) | – | dialog |
| F27 | from | Handed over by | person, options by side (payable: ravi, kiran; receivable: arun) | always | – | dialog |
| F28 | formNo | Form number | text, upper-cased | always (non-blank) | – | dialog |
| F29 | paper | Which paper is on your desk? (DEMO) | select | – | – | mock |
| F30 | reason (checker return) | Your comment | text | required to return | – | dialog |
| F31 | reason (send-back) | Your comment | text | required to send back | – | dialog |

### W · worked-out values

| id | key | source | rule |
|---|---|---|---|
| W1 | state (select, 9 states) | gstin | valid GSTIN → state whose GST code = first 2 digits |
| W2 | accountName (text) | legalName (+ tradeName, + other-side account of a used party) | tradeName or legalName; if the used party already has an account on the other side: `<base> (vendor)` / `<base> (customer)` |
| W3 | under (select, 5 payable / 4 receivable headers) | category | `underFor(side, category)` |
| W4 | constitution (select, 8) | pan | PAN 4th letter: C company, F partnership, P individual, H other, T trust_society, G government, A other |
| W5 | resident (select resident / non_resident) | pan, gstin | valid PAN or GSTIN → resident |
| W6 | currency (select INR / USD / EUR / GBP) | – | INR |
| W7 | billByBill (switch) | – | true |
| W8 | sec43bh (select yes / no) | category, msmeStatus | CA table SEC_43BH: applies → yes; not_applicable → no; if_msme → msmeStatus yes/no else blank; verify → blank |
| W9 | tax tagging lines (display) | side, gstin, state, category | TDS by category, GST intra / inter / RCM, ITC / TCS / e-invoice lines |
| W10 | party values on Use | the used party | `partyValues(p)` overwrite party keys; party keys locked |
| W11 | follow / origins | – | worked value follows its source until changed by the maker; origin worked / changed / waits / typed / empty |
| W12 | msmeStatus ≠ yes | msmeStatus | clears msmeCategory and udyam |

### C · check lines (`checksOf`, plus ChecksScreen)

| id | condition | level | message |
|---|---|---|---|
| C1 | pan present and not PAN format | stop | PAN is not valid |
| C2 | gstin present and not GSTIN format | stop | GSTIN is not valid |
| C3 | valid gstin, valid pan, gstin[2..12] ≠ pan | stop | GSTIN does not belong to this PAN |
| C4 | valid gstin, state set, state ≠ state of gstin | stop | State does not match the GSTIN |
| C5 | pincode present, not 6 digits | stop | PIN code must be 6 digits |
| C6 | no gstin, valid pan | warn | No GSTIN: an unregistered party |
| C7 | valid gstin, no portal check | stop | Check the GSTIN on the GST portal |
| C8 | portal check for another GSTIN | stop | GSTIN changed after the portal check: check it again |
| C9 | portal status cancelled | stop + send-back | GSTIN … is cancelled on the GST portal |
| C10 | portal status suspended | warn | GSTIN … is suspended |
| C11 | portal status active | ok | GSTIN active on the GST portal |
| C12 | portal name word match < 0.8 | warn | Name on the GST portal is "…" |
| C13 | used party already has an account on this side | stop + send-back | Already set up: … is our vendor / customer |
| C14 | a party is used | ok | Uses party … from the master |
| C15 | used party has an account on the other side | ok | Also our customer / vendor |
| C16 | (no party used) GSTIN belongs to a master party that has an account on this side | stop + send-back | Already set up: GSTIN … is … |
| C17 | (no party used) GSTIN belongs to a master party with no account on this side | stop + use party | GSTIN … is already in the party master: use that party |
| C18 | (no party used, no GSTIN hit) another party has the same PAN | warn + use party | Same PAN as … |
| C19 | accountName equals (case-insensitive) another account's name | stop | Account name "…" already exists |
| C20 | a required field is empty (worked fields waiting for their source excluded) | stop | Still to fill: … |
| C21 | payable, category goods_non_msme, msmeStatus yes | stop | Category says Non-MSME, but MSME = Yes |
| C22 | payable, category goods_msme, msmeStatus no | stop | Category says MSME, but MSME = No |
| C23 | payable, msmeStatus unknown | warn | MSME not known yet (a reminder goes to the vendor) |
| C24 | payable, msmeStatus yes, no udyam | warn | Udyam number not received yet (a reminder goes to the vendor) |
| C25 | udyam present, wrong format | stop | Udyam number is not in the UDYAM-XX-00-0000000 format |
| C26 | payable, sec43bh yes, creditDays > 45 | stop | … credit days for an MSME vendor |
| C27 | bankAccountNo used by an account of another party | stop + send-back | Bank account already used by … |
| C28 | ifsc present, wrong format | stop | IFSC is not valid |
| C29 | bank no + valid IFSC, no penny-drop | stop | Run the penny-drop |
| C30 | penny-drop for other account / IFSC | stop | Bank details changed after the penny-drop: run it again |
| C31 | penny-drop pass | ok | Penny-drop passed … |
| C32 | penny-drop name_mismatch | warn | Penny-drop name mismatch … (call-back required) |
| C33 | name_mismatch and callBackNumber = email | stop | Call-back number came from an email with the bank details |
| C34 | receivable, currency ≠ INR, category domestic* | warn | Domestic customer billed in a foreign currency? |
| C35 | the maker approves their own request | stop | (ChecksScreen; maker–checker C-07) |

### P · probes

| id | probe | service | input | result |
|---|---|---|---|---|
| P1 | "Check the GSTIN on the GST portal" | GST portal search | gstin | status active / suspended / cancelled, name at GST, state |
| P2 | "Run penny-drop" | Bank penny-drop (₹1 credit) | bankAccountNo, ifsc | pass / name_mismatch, name at bank, match % (pass ≥ 80) |
| P3 | Call-back (no button; recorded on Submit) | person (phone) | callBackNumber, callBackPerson | pass |

### B · buttons

| id | label | who sees it / when enabled | store action |
|---|---|---|---|
| B1 | New from a paper form | AE, always | opens S19 |
| B2 | Open it | AE; form number non-blank | `createRequest` |
| B3 | (typing in a field) | AE; draft / returned; party keys locked when a party is used | `setValue` |
| B4 | Save draft | AE; when there are unsaved changes | `saveDraft` |
| B5 | Undo (worked row) · Edit / Done | AE; Undo on a changed worked value | `useSuggestion` |
| B6 | Use P-xxxx | AE; on a C17 / C18 row, no party used | `useParty` |
| B7 | Not this party | AE; party used, editable | `unlinkParty` |
| B8 | Check the GSTIN on the GST portal / again | AE; editable, no party used; GSTIN valid | `checkGstin` |
| B9 | Run penny-drop / again | AE; payable, editable; account no + valid IFSC | `runPennyDrop` |
| B10 | Submit for checking / Resubmit | AE; no stop rows | `submit` |
| B11 | Return the form to X (+ dialog "Return the form") | AE; draft / returned; destructive when a send-back row exists | `sendBack` |
| B12 | Opened by mistake: discard | AE; draft, never submitted | `discard` |
| B13 | {checker} approves (mock) | the step's checker; step pending | `decide(approve)` |
| B14 | returns (+ dialog "Return") (mock) | the step's checker; step pending; reason required | `decide(return)` |
| B15 | open a notice (bell / Recent) | receiver | `openNotice` |
| B16 | Mark all read | receiver | `markAllRead` |
| B17 | Show / Hide the paper · Type it all in for me (mock) | AE | `typeFromPaper` |
| B18 | Reset the demo (mock) | – | `reset` |
| B19 | Vendors & customers filter, row click | any | local |
| B20 | Navigation (KPI clicks, Open Onboarding, tabs, rail toggle, deep link) | any | `navigate` |
| B21 | Backend tab filter / table pick (mock) | – | local |
| B22 | Dismiss toast | – | `dismissToast` |

### T · statuses shown

| id | status | words |
|---|---|---|
| T1 | request | draft "Needs me" · submitted "With checkers" · returned "Returned" · active "Active" · sent_back "Form returned" |
| T2 | checker step | pending "Waiting" · approved "Approved" · returned "Returned" |
| T3 | GSTIN portal | active · suspended · cancelled · "not checked" · "Out of date" |
| T4 | penny-drop | pass · name_mismatch · "Out of date" |
| T5 | field origin | Worked out · Changed by you · Waiting · Typed · To type |
| T6 | account pills | MSME: category / "Yes · no Udyam" / "Not known" / No; bank "· new"; 43B(h): Applies / Does not apply / Not confirmed |
| T7 | progress step | done · current · todo |
| T8 | party role / party | supplier · customer; party status active (Backend tab) |
| T9 | notice | tone info / success / warning / critical; read / unread |

### A · checker blocks (`routesFor`)

| id | side | position (checker) | step | fields covered |
|---|---|---|---|---|
| A1 | payable | 1 · AM (Rajan) | party "Party details, account, terms, MSME" | legalName, tradeName, pan, gstin, addressLine, city, state, pincode, contactPerson, phone, email, accountName, under, category, constitution, resident, relatedParty, creditDays, billByBill, currency, msmeStatus, msmeCategory, udyam, sec43bh |
| A2 | payable | 2 · FC (Usha) | bank "Bank details" | bankAccountNo, ifsc, beneficiary, callBackNumber, callBackPerson |
| A3 | payable | 3 · CO (Venkat) | tax "GST / TDS tagging" | (none) |
| A4 | receivable | 1 · AM (Rajan) | party "Party details, account, terms, billing" | the 20 base keys of A1 (legalName … currency) + poRule, delivery, invoiceFormat |
| A5 | receivable | 2 · CC (Farid) | credit_limit "Credit limit" | creditLimit |
| A6 | receivable | 3 · CO (Venkat) | tax "GST / TCS tagging" | (none) |

### N · notices, reminders, "the system does …"

| id | trigger | receiver | text |
|---|---|---|---|
| N1 | a checker returns a part | maker | critical "Returned by X: <title>", body = reason |
| N2 | request goes active | maker | success "Vendor/Customer active: <legal name>", "<ACC> under <header>. Purchase can now post vouchers / Sales can now confirm orders" |
| N3 | some parts approved, one still waiting (seed N-1) | maker | info "<name> (vendor): waiting on Usha" |
| N4 | submit with MSME unknown, or MSME yes without Udyam | the vendor (email / phone) | "Mail: Udyam reminder to the vendor … reminder again in 7 days" |
| N5 | toasts after actions | the actor | Draft saved · Sent to … · GSTIN active / cancelled · Penny-drop passed / mismatch · Form returned · Using P-… |
| N6 | send-back | person who handed the form over | "They get the paper back with your comment (and see it in the system)" |
| N7 | active | Purchase / Payables (payable), Sales / Billing (receivable) | "Purchase can post vouchers; Payables gets the MSME clock" / "Sales can confirm orders; Billing reads the instructions" |
| N8 | active with bank details | Payments | flag "new bank details" on the next payment proposal |
| N9 | FLOW text | – | System works out state, constitution, header, 43B(h); finds the party; stops what is wrong · System creates the party (or adds a role), then the account under its header: active |
| N10 | ChecksScreen note | – | AM never checks bank details; whether tax tagging must finish before go-live is open (Q8) |
| N11 | Dashboard callout | – | The AE never creates a header; the AM owns the chart of accounts |
| N12 | PartiesScreen callout | – | A change opens a new request of kind "change" (not built) |

### D · dates, waits, limits

| id | item | value | who sets it (app) |
|---|---|---|---|
| D1 | Usual vendor credit days | 45 | not stated |
| D2 | Usual customer credit days | 30 | not stated |
| D3 | MSMED Act maximum (43B(h)) | 45 days | not stated |
| D4 | Penny-drop pass mark | 80 % name match | not stated |
| D5 | Udyam reminder | every 7 days until answered | not stated |
| D6 | GST portal name match threshold (C12) | 0.8 | not stated (code only) |
| D7 | Bank "· new" pill | bankSince ≥ 2026-09-15 (fixed date) | not stated |
| D8 | Mock clock (START, +1/2/5/15 min ticks) | – | mock |
| D9 | Id numbering | REQ- from 0101, P- from 0140, ACC-{2200 / 1300}{n} | mock |
| D10 | TDS 194Q threshold in tax-tagging text | ₹50 lakh | display words |
| D11 | Approval deadline | (absent) | – |

### L · mock Backend log and tables

| id | mock line(s) |
|---|---|
| L1 | `POST /api/v1/legal-entities/LE-1/party-account-requests` · `INSERT accounting_txn.party_account_request` |
| L2 | `PATCH …/party-account-requests/{id}` · `UPDATE accounting_txn.party_account_request` (draft_values) |
| L3 | `GET /api/v1/workspaces/WS-1/parties/{id}` · `PATCH …/{id} {party_id}` |
| L4 | `GET /parties?gstin=…` (seed) |
| L5 | `POST …/{id}/gstin-checks` · "GST portal: search GSTIN" |
| L6 | `POST …/{id}/bank-verifications {penny_drop}` · "Bank penny-drop API" · `INSERT accounting_txn.bank_verification` |
| L7 | `POST …/{id}/bank-verifications {call_back}` · `INSERT accounting_txn.bank_verification` (call_back) |
| L8 | `POST …/{id}/submit` · `INSERT accounting_txn.party_account_change ×n` · event `finance.party_account.submitted` · "Mail: Udyam reminder" |
| L9 | `POST /party-account-changes/{id}/approve|return` · `UPDATE accounting_txn.party_account_change` · event `finance.party_account.returned` |
| L10 | `INSERT party_master.party` · `party_tax_id ×n` · `party_location · party_contact` · event `party.created` |
| L11 | `INSERT party_master.party_role` · event `party.role.added` |
| L12 | `POST /api/v1/gl/accounts (internal)` · `INSERT accounting.account` (leaf) · `INSERT accounting.party` |
| L13 | `PUT …/ledger-profiles/{acc} (internal)` · `UPSERT party_terms / party_classification / party_compliance_status / account_tax_profile` |
| L14 | `INSERT accounting_txn.party_bank_account` |
| L15 | `INSERT accounting_txn.party_billing_instruction` |
| L16 | `UPDATE accounting_txn.party_account_request` (active) · event `finance.party_account.activated` |
| L17 | event `finance.party_bank.changed` |
| L18 | `POST …/{id}/send-back` · `UPDATE … sent_back` · event `finance.party_account.sent_back` |
| L19 | `DELETE …/{id}` (discard) |
| L20 | Backend "Tables now": party (id, party_kind, legal_name, trade_name, status) · party_tax_id (party_id, scheme, value, state_code, gst_status) · party_location (party_id, kind, address_lines, city, state_code, postal_code) · party_contact (party_id, name, purpose, email, phone) · party_role (party_id, legal_entity_id, role, entered_by, form_from, form_no, valid_from) · party_account_request (id, party_id, side, kind, status, form_no, form_from, made_by, submitted_at, account_id) · party_account_change (id, request_id, block, checker_role, status, decided_at, reason) · bank_verification (request_id, method, result, name_match_pct, done_at) · accounting.account (id, name, parent, type, is_postable) · accounting.party (account_id, party_id, bank_details) · party_terms (account_id, credit_period_days, bill_by_bill, credit_limit, currency) · party_classification (party_category, is_related_party) · party_compliance_status (msme_status, msme_category, udyam_number, sec_43b_h_applies) · party_bank_account (account_id, bank_account_no, since, until) |

### K · task-doc facts (rev 6)

From `01_accounts_executive_tasks_and_responsibilities.md`: the cards of T7, T12 and T17, their rows in the task list, the role summary (§2), §0 changes 8 and 10, §9 and the open questions. Found by meaning (01 §2.4). Tag = the doc's own Fact / Proposal.

| id | the doc says | tag | result | detail | used in |
|---|---|---|---|---|---|
| K7.SRV | R2: no vendor used with wrong or missing finance fields | Proposal | **Confirms** | The subject's outcome; indicators below | A, I |
| K7.TRG | The Procurement Officer proposes a new vendor; terms, ledger or bank details change. As needed | Proposal | **Differs** | D1 (paper form); the changes are another subject (D8) | A, U.2 |
| K7.SUB | One vendor's finance fields (credit terms, ledger mapping, bank details) | Proposal | **Differs** | D6: one subject with T12, T17 and the party's identity | D.1, U.2 |
| K7.REQ | Identity in Business Core (name, PAN, GSTIN, address), not edited here | Proposal | **Differs** | D2 for a new party; holds for a party in the master: NEV-2 (SAV-3) | C, E, U.3 |
| K7.SEE | The proposal · duplicate bank check · penny-drop / name match · MSME status | Proposal | **Confirms** | C27, P2, F15 | E |
| K7.DONE | Saved and sent for checking; bank details only with penny-drop or call-back evidence | Proposal | **Confirms** | Holder moves at Submit; SUB-20, SUB-21, SUB-22 | E, I |
| K7.WR | `VendorFinance.Save` | Proposal | **Renamed** | D7; P.3 | P.3 |
| K7.HO | AM for terms and ledger · FC for bank details (the AM does not check bank details) | Fact | **Confirms** | A1, A2; the app adds the CO step (D3) | H.1 |
| K7.HELD | Proposed → Needs me · Sent → Waiting on others | Proposal | **Confirms** | Holder rule (I) | I |
| K7.EXC | Bank account used by another vendor · penny-drop name mismatch | Proposal | **Confirms** | SUB-18 (send-back), WRN-07 | E |
| K7.CANT | Fails penny-drop or belongs to another vendor · no ledger · a bank change with no evidence | Proposal | **Confirms** | 3 of 4: SUB-20/21, SUB-18, SUB-13/SUB-26; "a bank change" is another subject (D8) | E |
| K7.FILL | Credit days entered, usual terms pre-filled · ledger from the chart · bank + IFSC · call-back evidence | Proposal | **Differs** | Fields confirm (F13, W3, F18–F22); the pre-fill is D4 | I, H.3 |
| K7.PAR | Usual payment terms · MSMED Act maximum days | Proposal | **Confirms** | usual_vendor_credit_days, msmed_max_credit_days | H.3 |
| K7.RUL | ❌ change bank details without the FC · ❌ edit a vendor and then approve its voucher (C-07) | Fact | **Adds** | NEV-3, NEV-6 | U.3, R.2 |
| K7.IND | Vendor proposals waiting (age) | Proposal | **Adds** | IND-1: a measure on ListPartyAccountRequests | I |
| K7.TYP | Make → form on the item | Proposal | **Confirms** | 01 §3.15 Make | D |
| K7.EVD | §11.1, §12.1, §22.1; scenario A1-17 (Vendor H proposed 07-Oct, approved by Rajan 08-Oct); C-07 refused | Fact | **Confirms** | O6 (Malnad Cocoa = Vendor H); C-07 → NEV-6 | O, U.3 |
| K7.ASK | Who does the bank-detail call-back: the AE or the FC? (KQ7) | — | **Answered** | By the app: the AE records it (F21, F22); the FC checks it (A2) | U.4 |
| K12.SRV | R2: every customer billed and given credit on the right terms | Proposal | **Confirms** | The subject's outcome | A |
| K12.TRG | A new customer is approved · the CC recommends a new limit · credit days, ledger or billing instructions change | Proposal | **Differs** | D1 (paper form); the recommendation and the changes are another subject (D8) | A, U.2 |
| K12.SUB | One customer's finance fields (credit days, ledger, billing instructions, credit limit) | Proposal | **Differs** | D6; the fields confirm (F13, W3, F14, F23–F25) | D.1 |
| K12.REQ | Identity in Business Core | Proposal | **Differs** | As K7.REQ: D2, NEV-2 | C, U.3 |
| K12.SEE | Current fields · the CC's recommendation and its reason | Proposal | **Gap** | G15: no recommendation in the app | P.1 |
| K12.DONE | Saved and sent for checking | Proposal | **Confirms** | Holder moves at Submit | I |
| K12.WR | `CustomerFinance.Save` · `CreditLimit.Edit` | Proposal | **Renamed** | D7; P.3 | P.3 |
| K12.HO | CC first for a credit-limit edit, then the AM confirms · other fields: the AM | Proposal | **Differs** | The checkers confirm (A4, A5); the order and the AM's confirm are D5 | H.1, U.2 |
| K12.SND | Billing instructions reach the Billing Executive, who applies them but cannot change them | Fact | **Adds** | A listener (not built), a read grant, NEV-5 | F, J, U.3 |
| K12.HELD | Recommendation arrived → Needs me · Sent → Waiting · Objected → Needs me | Proposal | **Confirms** | "Objected" = returned | I |
| K12.EXC | New limit differs from the recommendation · billing instructions missing | Proposal | **Confirms** | Billing missing = SUB-13; the recommendation half is G15 | E, P.1 |
| K12.CANT | The new limit equals the current one | Proposal | **Out of scope** | A change subject (D8) | U.2 |
| K12.RUL | ❌ change a limit the CC has not recommended or checked | Proposal | **Adds** | NEV-4 | U.3, R.2 |
| K12.IND | Recommendations waiting to be entered | Proposal | **Gap** | G15 (IND-2) | I, P.1 |
| K12.TYP | Make → form on the item (a limit edit is close to Record) | Proposal | **Confirms** | 01 §3.15 Make | D |
| K12.EVD | §11.3, §10, §12.3; CC T4/T5 (C-01, C-02 recommended 12-Oct); C-13 refused (Billing cannot edit finance fields) | Fact | **Adds** | C-13 → NEV-5 test; C-01 / C-02 are change subjects (D8) | U.3, R.2 |
| K12.FILL | Customer · field · new value pre-filled from the recommendation · note | Proposal | **Out of scope** | A change subject (D8) | U.2 |
| K17.SRV | R2 | Proposal | **Confirms** | — | A |
| K17.TRG | A vendor gives or changes its Udyam number · has not answered. As needed | Proposal | **Confirms** | "Not answered" = the Udyam reminder (N4, UdyamReminderDue); a change is another subject (D8) | G, H.2 |
| K17.SUB | One vendor's MSME data on its AR/AP record | Proposal | **Differs** | D6: on the same request as T7 | D.1 |
| K17.SEE | Udyam number format and status · category (micro, small, medium) | Proposal | **Confirms** | SUB-16, F15, F16 | E |
| K17.DONE | Saved and sent · or a reminder sent | Proposal | **Confirms** | WRN-05, WRN-06 + N4 | G |
| K17.WR | `Udyam.Save` | Proposal | **Renamed** | D7; P.3 | P.3 |
| K17.HO | The AM · feeds the CO's MSME register and the Payables Executive's MSME due dates | Fact | **Adds** | The AM step confirms (A1 covers MSME); 2 listeners (not built), read grants | F, H.1, J |
| K17.TYP | Record → form on the item | Proposal | **Differs** | D6: merged into the Make subject | D |
| K17.EVD | §11.4, §12.4, §14.1, §21.4 | Fact | **Confirms** | — | — |
| K17.ASK | Part of T7? Who checks the Udyam status? (KQ8) | — | **Gap** | First half answered by the app (one screen); second half G16 | P.1, U.4 |
| KR.GET | Gets work from: the Procurement Officer (new vendors) · the Credit Controller (credit-limit recommendations) | Fact | **Differs** | D1 | U.2 |
| KR.HAND | Hands work to: AM · FC (bank details) · CO (MSME register) · Billing Executive (billing instructions) · CC (credit-limit edits) | Fact | **Confirms** | The checkers (H.1) and the listeners (F) | F, H.1 |
| KR.NEV | Never: approves its own work · edits party identity · sets credit limits alone (+ 4 that cannot happen in this task) | Fact | **Adds** | NEV-1, NEV-2, NEV-4 | U.3, R.2 |
| KR.NOT | Party links and merges are Business Core's work | Fact | **Confirms** | No link or merge action here | E |
| KR.CHG8 | The CO owns the MSME register and Udyam validity (§0 change 8) | Fact | **Confirms** | The CO listener; G16 | F, P.1 |
| KR.CHG10 | Bank-detail changes are checked by the FC with penny-drop / call-back evidence; other fields by the AM (§0 change 10) | Fact | **Confirms** | A1, A2, SUB-20–22 | H.1 |
| KQ12 | Every "Checked by" goes through the one approval mechanism | — | **Answered** | By the method: `platform.approval` (01 D8) | H.1, U.4 |

**52 facts:** T7 18 · T12 17 · T17 10 · role 7. Results: 24 confirm · 11 differ · 7 add · 3 renamed · 3 gaps · 2 answered · 2 out of scope.

---

## C. Contexts

| context | owns | reads from others (declared queries) | trace |
|---|---|---|---|
| `party_master` (Foundation, tenant `workspace_id`) | Who the party is: legal name, trade name, PAN, GSTINs (+ GST state, portal status), address (line, city, state, PIN), contact person, phones, email; worked constitution (source PAN) and resident status (source PAN / GSTIN) and state (source GSTIN); party roles (supplier / customer per legal entity, entered by, form from, form no); code lists `state_code`, `constitution_code` | finance `GetPartyAccountRequest` (party-registration reads the approved values) | F1–F10, W1, W4, W5, W10, T8, L10, L11, L20 |
| `finance` (module, tenant `legal_entity_id`) | The onboarding request (subject) with its values, origins, round; probe results (GSTIN check, bank verification incl. call-back); the result `party_account` (category, related party, credit days, MSME status / category, Udyam, 43B(h), currency, bill by bill, PO rule, delivery, invoice format); versioned credit limit; versioned bank account (+ call-back); code list `category_code` (with side, 43B(h) rule, TDS hint) | party_master `FindParty`, `GetParty`; accounting `ListSubledgerAccounts`, `FindAccountDetermination`, `ListControlAccounts`; hr `ListPersons`; platform `ListParameters` | F11–F28, F31, W2(rule), W6–W9, W11, W12, P1–P3, C1–C34, S1–S22, L1–L9, L13–L19 |
| `accounting` (module, tenant `legal_entity_id`) | Chart (`account`, read only here), `account_determination` (control account per category), `subledger_account` (the party account "as it shows in the books": name, AP / AR, control account = "Under (header)") | finance `GetPartyAccountRequest` (subledger-opening reads side, account name, under, category) | W2, W3, C19, N11, L12, §2.3, §5.2 |
| `platform` (machinery) | approval, receipt, trail, outbox, reaction_run, timer, parameter, notice, automation | finance `GetPartyAccount` (stop condition of the Udyam reminder); hr (position of a person, for notices) | A1–A6, D1–D6, D11, N1–N6, S6, S25, S27, F30, B15, B16 |
| `hr` (Foundation; not built here) | persons and their positions | – | F27, S19 (declared identifier `*_person_id`) |

- **Task doc (K7.REQ, KR.NEV):** "Business Core" in the doc is `party_master` (input 4). A party already in the master is read-only for this subject: Save refuses a party key while a party is used (SAV-3, NEV-2).

---

## D. Entities

### D.1 Subject state map: `finance.party_account_request`

States: `draft`, `submitted`, `returned`, `active`, `sent_back` (app words, T1) + `approved` (transient) + `discarded` (DF4).

```text
               Open                     Submit                    Decide (last step approved)          Activate (reaction)
   (none) ──────────► draft ─────────────────────► submitted ─────────────────────────────► approved ──────────────────► active
                       │  ▲                         │   │ Decide (approved, not last) ↺
                       │  │       Submit            │   │
                       │  └──── returned ◄──────────┘ Decide (returned)
                       │           │
            Discard    │           │ SendBack
  discarded ◄──────────┤           ▼
   (round 0 only)      └──────► sent_back
                       SendBack
   Save · UseParty · CheckGstin · VerifyBankAccount: draft → draft, returned → returned
```

| from | action | to | trace |
|---|---|---|---|
| – | OpenPartyAccountRequest | draft | B2 |
| draft / returned | SavePartyAccountRequest, UseParty, CheckGstin, VerifyBankAccount | (unchanged) | B3–B9 |
| draft / returned | SubmitPartyAccountRequest | submitted | B10 |
| submitted | DecidePartyAccountRequest (approved, other steps still requested) | submitted | B13 |
| submitted | DecidePartyAccountRequest (approved, last open step) | approved | B13 |
| submitted | DecidePartyAccountRequest (returned) | returned | B14 |
| approved | ActivatePartyAccountRequest | active | N9 |
| draft / returned | SendBackPartyAccountRequest | sent_back | B11 |
| draft (round = 0) | DiscardPartyAccountRequest | discarded | B12 |

### D.2 Tables (columns: name · type · null · check · FK)

**`party_master.state_code`** (code list, F/W1 > 6 options) — trace W1, C4

| column | type | null | check / FK |
|---|---|---|---|
| key | text | PK | e.g. `KA` |
| label | text | not null | "Karnataka (29)" |
| active | boolean | not null default true | |
| attributes | jsonb | not null default '{}' | `{gst_code}` (§3.5) |

**`party_master.constitution_code`** — trace W4: key PK text · label text not null · active boolean not null default true.

**`party_master.party`** (entity with a life; result of RegisterParty) — trace F1–F8, F10, W1, W4, W5, L10, L20

| column | type | null | check / FK |
|---|---|---|---|
| id | text | PK | `^P-[0-9]{4,}$` |
| workspace_id | text | not null | |
| state | text | not null default 'active' | IN ('active') (T8) |
| version | integer | not null default 1 | ≥ 1 |
| created_at, updated_at | timestamptz | not null | |
| created_by, updated_by | text | not null | principal |
| legal_name | text | not null | (F1) |
| trade_name | text | null | (F2) |
| pan | text | null | `^[A-Z]{5}[0-9]{4}[A-Z]$` (F3, C1) |
| address_line | text | not null | (F5) |
| city | text | not null | (F6) |
| state_code | text | null | FK party_master.state_code(key) (W1; field `state` clashes with standard `state`, select → `_code`) |
| pincode | text | null | `^[0-9]{6}$` (F7, C5) |
| contact_person | text | null | (F8) |
| email | text | null | (F10) |
| constitution | text | not null | FK party_master.constitution_code(key) (W4) |
| resident | text | not null | IN ('resident','non_resident') (W5) |

**`party_master.party_gstin`** (app list `gstins[]`) — trace F4, W1, P1, L10

| column | type | null | check / FK |
|---|---|---|---|
| id | bigint identity | PK | |
| workspace_id | text | not null | |
| party_id | text | not null | FK party_master.party(id) |
| gstin | text | not null | GSTIN pattern; UNIQUE (workspace_id, gstin) |
| created_at | timestamptz | not null | |
| created_by_invocation | text | not null | |
| state_code | text | not null | FK party_master.state_code(key) |
| status | text | not null | IN ('active','suspended','cancelled') (T3) |

**`party_master.party_phone`** (app list `phones[]`) — trace F9: id bigint identity PK · workspace_id text not null · party_id text not null FK party · phone text not null · created_at · created_by_invocation · UNIQUE (party_id, phone).

**`party_master.party_role`** (app list `roles[]`) — trace T8, F27, L11

| column | type | null | check / FK |
|---|---|---|---|
| id | bigint identity | PK | |
| workspace_id | text | not null | |
| party_id | text | not null | FK party_master.party(id) |
| legal_entity_id | text | not null | declared identifier ("of our company") |
| type | text | not null | IN ('supplier','customer') |
| since | date | not null | |
| entered_by_person_id | text | not null | declared (hr) |
| form_from_person_id | text | null | declared (hr) |
| form_no | text | null | |
| created_at | timestamptz | not null | |
| created_by_invocation | text | not null | |
| | | | UNIQUE (party_id, legal_entity_id, type) |

**`finance.category_code`** (F11, > 6 options, differs by side → one table with `side`) — trace F11, W3, W8, W9

| column | type | null | check |
|---|---|---|---|
| key | text | PK | |
| label | text | not null | |
| active | boolean | not null default true | |
| side | text | not null | IN ('payable','receivable') |
| attributes | jsonb | not null default '{}' | `{sec43bh_rule, sec43bh_words, tds_hint}` (§3.5) |

**`finance.party_account_request`** (the subject) — trace S8–S18, T1, F26–F28, F31, L1, L2, L16, L18, L20

| column | type | null | check / FK |
|---|---|---|---|
| id | text | PK | `^REQ-[0-9]{4,}$` |
| legal_entity_id | text | not null | |
| state | text | not null default 'draft' | IN ('draft','submitted','returned','approved','active','sent_back','discarded') |
| version | integer | not null default 1 | |
| created_at, updated_at | timestamptz | not null | created_at = "opened" (arrivedAt) |
| created_by, updated_by | text | not null | created_by = the maker |
| side | text | not null | IN ('payable','receivable') (F26) |
| from_person_id | text | not null | declared (hr) (F27) |
| form_no | text | not null | `<> ''` (F28) |
| party_id | text | null | declared (party_master) |
| values | jsonb | not null default '{}' | field values, keys = app field keys (§3.4) |
| origins | jsonb | not null default '{}' | key → typed / worked / changed |
| round | integer | not null default 0 | ≥ 0 (approval round) |
| submitted_at | timestamptz | null | |
| activated_at | timestamptz | null | |
| sent_back_reason | text | null | (F31); CHECK state <> 'sent_back' OR not null |
| sent_back_at | timestamptz | null | |
| subledger_account_id | text | null | declared (accounting) |

**`finance.gstin_check`** (probe result P1) — trace P1, C7–C12, T3, L5

| column | type | null | check / FK |
|---|---|---|---|
| id | bigint identity | PK | |
| legal_entity_id | text | not null | |
| party_account_request_id | text | not null | FK finance.party_account_request(id) |
| input_key | text | not null | the GSTIN |
| result | text | not null | IN ('active','suspended','cancelled') |
| detail | jsonb | not null | {name_at_gst, state_code} |
| checked_at | timestamptz | not null | |
| source | text | not null default 'portal' | IN ('portal','master') (§4 step 3, Use) |

**`finance.bank_account_verification`** (probe results P2, P3) — trace P2, P3, C29–C33, T4, L6, L7

| column | type | null | check / FK |
|---|---|---|---|
| id | bigint identity | PK | |
| legal_entity_id | text | not null | |
| party_account_request_id | text | not null | FK finance.party_account_request(id) |
| method | text | not null | IN ('penny_drop','call_back') |
| input_key | text | not null | `<bankAccountNo>|<ifsc>` |
| result | text | not null | IN ('pass','name_mismatch') |
| detail | jsonb | not null | penny_drop {name_at_bank, match_pct}; call_back {number, person} |
| checked_at | timestamptz | not null | |

**`finance.party_account`** (result table, app `Account`) — trace F11–F13, F15–F17, F23–F25, W6–W8, S21, S22, L13, L15

| column | type | null | check / FK |
|---|---|---|---|
| subledger_account_id | text | PK | `^ACC-[0-9]+$`, declared (accounting) |
| legal_entity_id | text | not null | |
| state | text | not null default 'active' | IN ('active') |
| version | integer | not null default 1 | |
| created_at, updated_at | timestamptz | not null | created_at = "Active since" |
| created_by, updated_by | text | not null | |
| party_id | text | not null | declared (party_master) |
| party_account_request_id | text | not null | FK finance.party_account_request(id), unique |
| side | text | not null | IN ('payable','receivable') |
| category | text | not null | FK finance.category_code(key) |
| related_party | boolean | not null | (F12 yes / no) |
| credit_days | integer | not null | ≥ 0 |
| msme_status | text | null | IN ('yes','no','unknown') (payable; gate) |
| msme_category | text | null | IN ('micro','small','medium') |
| udyam | text | null | `^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$` |
| sec43bh | boolean | null | (payable; gate) |
| currency | text | not null | IN ('INR','USD','EUR','GBP') |
| bill_by_bill | boolean | not null default true | (switch) |
| po_rule | text | null | IN ('every_invoice','none') (receivable; gate) |
| delivery | text | null | IN ('email','portal','with_goods','courier') (receivable; gate) |
| invoice_format | text | null | |

**`finance.party_credit_limit`** (versioned; CC block A5) — trace F14, A5, L13: id bigint identity PK · legal_entity_id text not null · subledger_account_id text not null FK finance.party_account · credit_limit numeric(18,2) not null ≥ 0 · valid_from timestamptz not null · valid_to timestamptz null · created_by_invocation text not null · one open version per account.

**`finance.party_bank_account`** (versioned; FC block A2) — trace F18–F22, A2, T6, L14, L17

| column | type | null | check / FK |
|---|---|---|---|
| id | bigint identity | PK | |
| legal_entity_id | text | not null | |
| subledger_account_id | text | not null | FK finance.party_account |
| bank_account_no | text | not null | |
| ifsc | text | not null | `^[A-Z]{4}0[A-Z0-9]{6}$` |
| beneficiary | text | not null | |
| call_back_number | text | null | (run-time options → no CHECK) |
| call_back_person | text | null | |
| valid_from | timestamptz | not null | "since" |
| valid_to | timestamptz | null | "until" |
| created_by_invocation | text | not null | |

**`accounting.account`** (chart; read only by this task) — trace W3, N11, L12: id bigint identity PK · legal_entity_id · name · parent_id FK self · type · is_postable · is_control.

**`accounting.account_determination`** — trace W3, §5.2: key_type · key · legal_entity_id · book_id · account_id FK accounting.account · valid_from · valid_to · PK (legal_entity_id, book_id, key_type, key, valid_from).

**`accounting.subledger_account`** (entity with a life) — trace W2, W3, C19, L12

| column | type | null | check / FK |
|---|---|---|---|
| id | text | PK | `^ACC-[0-9]+$` |
| legal_entity_id | text | not null | |
| state | text | not null default 'active' | IN ('active') |
| version | integer | not null default 1 | |
| created_at, created_by, updated_at, updated_by | | not null | |
| subledger | text | not null | IN ('AP','AR') |
| party_id | text | not null | declared (party_master) |
| control_account_id | bigint | not null | FK accounting.account(id) |
| name | text | not null | unique per legal entity, case-insensitive (C19) |
| valid_from | date | not null | |
| valid_to | date | null | |

**Platform tables (§3.6)** — trace A1–A6, D11, N1–N6, L8, L9, S26: `platform.approval`, `receipt`, `trail`, `outbox`, `reaction_run`, `timer`, `parameter`, `notice`, `automation` (full DDL in M).

---

## E. Actions

Gate ids are listed in full under each action. Warnings (not gates) are returned in `checks`: WRN-01 C6 · WRN-02 C10 · WRN-03 C12 · WRN-04 C18 · WRN-05 C23 · WRN-06 C24 · WRN-07 C32 · WRN-08 C34. OK lines: OK-01 C11 · OK-02 C14 · OK-03 C15 · OK-04 C31. Refusal rules from the task doc (NEV-1 … NEV-6): U.3.

| # | action | context | endpoint | principal | from → to | gates (class · condition · id) | event | trace |
|---|---|---|---|---|---|---|---|---|
| 1 | OpenPartyAccountRequest | finance | `POST /api/v1/finance/party-account-requests` | AE | – → draft | Input · side ∈ payable/receivable · OPN-1; Input · form_no non-blank · OPN-2; Input · from_person_id given · OPN-3; Consistency · from person's position is allowed for the side (payable: procurement_officer, contracts_services_procurement_officer; receivable: sales_executive) · OPN-4; Authority · position AE · OPN-5 | PartyAccountRequestOpened | B1, B2, F26–F28, S19, W6, W7, L1 |
| 2 | SavePartyAccountRequest | finance | `PATCH /api/v1/finance/party-account-requests/{id}` | AE | draft → draft; returned → returned | State · draft / returned · SAV-1; Authority · position AE · SAV-2; Authority · no party key (F1–F10 + state) in the body while a party is used: a party in the master is never edited here (NEV-2) · SAV-3. Not blocked by checks (DF12): returns them. The app locks those keys (W10); msmeStatus ≠ yes clears msmeCategory / udyam (W12); worked values follow (W11) | PartyAccountRequestSaved | B3, B4, B5, B17, W1–W8, W11, W12, L2, K7.REQ, KR.NEV |
| 3 | UseParty | finance | `POST /api/v1/finance/party-account-requests/{id}/use-party` | AE | draft / returned → same | State · draft / returned · USE-1; Authority · AE · USE-2; Input · party_id exists in the master (GetParty) when not null · USE-3. Writes party values (W10); with a party GSTIN writes a `gstin_check` row `source = master` (no outside call); `party_id: null` un-links | PartyUsed | B6, B7, W10, C14, C17, C18, S18, L3, L4 |
| 4 | CheckGstin | finance | `POST /api/v1/finance/party-account-requests/{id}/check-gstin` | AE | draft / returned → same | State · draft / returned · GST-1; Authority · AE · GST-2; Input · GSTIN valid format (C2) · GST-3; Consistency · no party used (party_id null) · GST-4 | GstinChecked | B8, P1, T3, L5 |
| 5 | VerifyBankAccount | finance | `POST /api/v1/finance/party-account-requests/{id}/verify-bank-account` | AE | draft / returned → same | State · draft / returned · BNK-1; Authority · AE · BNK-2; Input · side = payable · BNK-3; Input · bankAccountNo non-blank and IFSC valid (C28) · BNK-4. Result pass when match % ≥ `penny_drop_pass_pct` | BankAccountVerified | B9, P2, D4, T4, L6 |
| 6 | SubmitPartyAccountRequest | finance | `POST /api/v1/finance/party-account-requests/{id}/submit` | AE | draft / returned → submitted | Input · PAN format · SUB-01 (C1); Input · GSTIN format · SUB-02 (C2); Consistency · GSTIN contains PAN · SUB-03 (C3); Consistency · state = state of GSTIN · SUB-04 (C4); Input · PIN 6 digits · SUB-05 (C5); Probe · GSTIN checked · SUB-06 (C7); Probe · GSTIN check is for the current GSTIN · SUB-07 (C8); Probe · GSTIN not cancelled, **send-back** · SUB-08 (C9); Uniqueness · used party has no account on this side, **send-back** · SUB-09 (C13); Uniqueness · GSTIN's master party has no account on this side, **send-back** · SUB-10 (C16); Uniqueness · GSTIN not in the master unless that party is used · SUB-11 (C17); Uniqueness · account name unique in the books (ListSubledgerAccounts) · SUB-12 (C19); Input · required / required-when fields filled · SUB-13 (C20); Consistency · not (goods_non_msme and MSME yes) · SUB-14 (C21); Consistency · not (goods_msme and MSME no) · SUB-15 (C22); Input · Udyam format · SUB-16 (C25); Business · sec43bh yes ⇒ credit_days ≤ `msmed_max_credit_days` · SUB-17 (C26); Uniqueness · bank account not used by another party, **send-back** · SUB-18 (C27); Input · IFSC format · SUB-19 (C28); Probe · penny-drop run · SUB-20 (C29); Probe · penny-drop is for the current account / IFSC · SUB-21 (C30); Probe · call-back number not from the email · SUB-22 (C33); State · draft / returned · SUB-23; Authority · AE · SUB-24; Consistency · category belongs to the side · SUB-25; Consistency · `under` is an active control account for the side (§5.2) · SUB-26; Input · call-back number is one of the run-time options · SUB-27. On name_mismatch records the call-back probe (P3). Writes round + 1 approval steps (§H) and their deadline timers | PartyAccountRequestSubmitted | B10, C1–C34, P3, A1–A6, D3, L7, L8 |
| 7 | DecidePartyAccountRequest | finance | `POST /api/v1/finance/party-account-requests/{id}/decide` | the step's position (AM / FC / CC / CO) | submitted → submitted / approved / returned | State · request submitted and the step `requested` in the current round · DEC-1; Authority · caller holds the step's position · DEC-2; Authority · caller is not the maker (C35, NEV-1) · DEC-3; Input · outcome ∈ approved / returned · DEC-4; Input · reason required when returned (DF5, F30) · DEC-5. Same commit: records the step, cancels its timer; on returned → request `returned`, other requested steps `cancelled` (+ timers cancelled); on last approval → request `approved` | PartyAccountRequestDecided (step approved, others open) · PartyAccountRequestApproved (last step) · PartyAccountRequestReturned | B13, B14, F30, A1–A6, T2, C35, L9 |
| 8 | SendBackPartyAccountRequest | finance | `POST /api/v1/finance/party-account-requests/{id}/send-back` | AE | draft / returned → sent_back | State · draft / returned · SBK-1; Authority · AE · SBK-2; Input · reason non-blank · SBK-3 | PartyAccountRequestSentBack | B11, F31, C9, C13, C16, C27, S18, L18 |
| 9 | DiscardPartyAccountRequest | finance | `POST /api/v1/finance/party-account-requests/{id}/discard` | AE | draft (round 0) → discarded | State · draft and round = 0 (never submitted) · DSC-1; Authority · AE · DSC-2 | PartyAccountRequestDiscarded | B12, L19 |
| 10 | RegisterParty | party_master | `POST /api/v1/party-master/parties` | automation `party-registration` | – → party active | State · source request is `approved` (GetPartyAccountRequest) · REG-1; Uniqueness · GSTIN not in `party_gstin` (re-run of C16 / C17) · REG-2; Input · legal name, address, city, constitution, resident present · REG-3; Authority · grant · REG-4. Writes party + gstin + phone + first role | PartyRegistered | N9, L10, L11, W1, W4, W5 |
| 11 | AddPartyRole | party_master | `POST /api/v1/party-master/parties/{id}/add-role` | automation `party-registration` | party active → active | Input · party exists · ROL-1; Uniqueness · no role of this type for this legal entity (re-run of C13) · ROL-2; State · source request `approved` · ROL-3; Authority · grant · ROL-4 | PartyRoleAdded | N9, L11, T8 |
| 12 | OpenSubledgerAccount | accounting | `POST /api/v1/accounting/subledger-accounts` | automation `subledger-opening` | – → active | State · source request `approved` · SLA-1; Uniqueness · name unique per legal entity (re-run of C19) · SLA-2; Uniqueness · no active sub-ledger account for (party, AP / AR) (re-run of C13) · SLA-3; Consistency · control account = determination (control, category, STAT) or an active control account for the side · SLA-4; Authority · grant · SLA-5 | SubledgerAccountOpened | W2, W3, L12 |
| 13 | ActivatePartyAccountRequest | finance | `POST /api/v1/finance/party-account-requests/{id}/activate` | automation `party-onboarding` | approved → active | State · approved · ACT-1; Uniqueness · bank account not used by another party (re-run of C27) · ACT-2; Authority · grant · ACT-3. Writes party_account, credit limit (receivable), bank account (payable), Udyam reminder timer (payable, MSME unknown or yes without Udyam) | PartyAccountRequestActivated | N2, N4, N7, N8, L13–L17 |
| 14 | SendNotice | platform | `POST /api/v1/platform/notices` | automation `notice-sending` | – → notice | Input · a receiver (to_position or to_party_id) and channel · NTC-1; Authority · grant · NTC-2. For a `UdyamReminderDue` notice: writes the next timer while the account's MSME stays unanswered (GetPartyAccount) | NoticeSent | N1–N4, N6, S6, S27 |
| 15 | MarkNotice | platform | `POST /api/v1/platform/notices/{id}/mark` | the notice's receiver | unread → read | State · not yet read · MRK-1; Authority · caller is the receiver · MRK-2 | NoticeMarked | B15, B16, T9 |
| 16 | EscalateApproval | platform | `POST /api/v1/platform/approvals/{id}/escalate` | automation `approval-escalating` | approval requested → requested (position = AM) | State · approval `requested` and `deadline_at` passed · ESC-1; Authority · grant · ESC-2 | ApprovalEscalated | D11 (DF1, DF9) |

---

## F. Events

Envelope (all): `{event_id, event, version: 1, occurred_at, legal_entity_id, cause: {invocation_id, action}, subject: {entity, id}, data}`.

| event | publisher | payload data | listeners |
|---|---|---|---|
| PartyAccountRequestOpened | finance | {id, side, from_person_id, form_no} | none yet |
| PartyAccountRequestSaved | finance | {id, changed_keys[]} | none yet |
| PartyUsed | finance | {id, party_id \| null} | none yet |
| GstinChecked | finance | {id, gstin, result, source} | none yet |
| BankAccountVerified | finance | {id, method: penny_drop, result, match_pct} | none yet |
| PartyAccountRequestSubmitted | finance | {id, round, steps: [{approval_id, step, position}], call_back_recorded: bool} | none yet (checkers read their queue) |
| PartyAccountRequestDecided | finance | {id, round, step, outcome: approved} (a step approved, others still open) | `notice-sending` (N3) |
| PartyAccountRequestApproved | finance | {id, round, party_id \| null, side} (the last step approved) | `party-registration` |
| PartyAccountRequestReturned | finance | {id, round, step, reason} | `notice-sending` (N1) |
| PartyAccountRequestSentBack | finance | {id, from_person_id, form_no, reason} | `notice-sending` (N6) |
| PartyAccountRequestDiscarded | finance | {id} | none |
| PartyRegistered | party_master | {party_id, request_id, role_type, legal_entity_id} | `subledger-opening` |
| PartyRoleAdded | party_master | {party_id, request_id, role_type, legal_entity_id} | `subledger-opening` |
| SubledgerAccountOpened | accounting | {subledger_account_id, party_id, subledger, control_account_id, name, request_id} | `party-onboarding` |
| PartyAccountRequestActivated | finance | {id, subledger_account_id, party_id, side, bank_account_added: bool} | `notice-sending` (N2); Purchase / Payables Executive (MSME due dates, K17.HO) / Sales / Billing Executive (applies the billing instructions, K12.SND) (N7, not built); Payments (N8 when bank_account_added, not built); the Compliance Officer's MSME register (K17.HO, KR.CHG8, not built) |
| NoticeSent | platform | {notice_id, to_position \| to_party_id, channel, entity, entity_id} | none |
| NoticeMarked | platform | {notice_id} | none |
| ApprovalDeadlineReached (timer) | platform timer | {approval_id, entity, entity_id, step} | `approval-escalating` |
| ApprovalEscalated | platform | {approval_id, entity, entity_id, step, to_position} | `notice-sending` (notice to AM) |
| UdyamReminderDue (timer) | platform timer | {entity: finance.party_account_request, entity_id: request id} | `notice-sending` (N4 repeat) |

---

## G. Reactions

| automation | context | on event (+ condition) | calls | grant | trace |
|---|---|---|---|---|---|
| party-registration | party_master | PartyAccountRequestApproved, `party_id` null | RegisterParty | [RegisterParty, AddPartyRole] | N9, L10 |
| party-registration | party_master | PartyAccountRequestApproved, `party_id` not null | AddPartyRole | (same) | N9, L11 |
| subledger-opening | accounting | PartyRegistered or PartyRoleAdded, with `request_id` | OpenSubledgerAccount | [OpenSubledgerAccount] | L12 |
| party-onboarding | finance | SubledgerAccountOpened, with `request_id` | ActivatePartyAccountRequest | [ActivatePartyAccountRequest] | L13–L17 |
| notice-sending | platform | PartyAccountRequestReturned | SendNotice → maker, in-app, critical (N1, DF2) | [SendNotice] | N1 |
| notice-sending | platform | PartyAccountRequestDecided | SendNotice → maker, in-app, info "waiting on …" | (same) | N3 |
| notice-sending | platform | PartyAccountRequestActivated | SendNotice → maker, in-app, success (N2, DF2) | (same) | N2 |
| notice-sending | platform | PartyAccountRequestSubmitted, payable and (MSME unknown, or MSME yes without Udyam) | SendNotice → to_address (the form's email or phone), Udyam reminder (N4); writes timer UdyamReminderDue | (same) | N4 |
| notice-sending | platform | UdyamReminderDue | SendNotice → to_party_id once the party exists, else to_address (N4); writes the next timer while unanswered | (same) | N4, D5 |
| notice-sending | platform | PartyAccountRequestSentBack | SendNotice → the person who handed the form over, in-app (N6) | (same) | N6 |
| approval-escalating | platform | ApprovalDeadlineReached | EscalateApproval | [EscalateApproval] | DF1 |
| notice-sending | platform | ApprovalEscalated | SendNotice → AM, in-app, warning (DF9) | (same) | DF9 |

Chain (data order): PartyAccountRequestApproved → RegisterParty | AddPartyRole → OpenSubledgerAccount → ActivatePartyAccountRequest. Each run is once per event, retryable; failures stay in `platform.reaction_run` (state `failed`) and surface in the owning context's queue; the request stays `approved` (holder = the automation).

---

## H. Approvals, timers, parameters

### H.1 Approval steps (one per checker block)

| side | step | position | covers | deadline | escalation / timer | trace |
|---|---|---|---|---|---|---|
| payable | party | accounts_manager | A1 keys (24) | `approval_deadline_hours` (48 h, DF1) | ApprovalDeadlineReached → EscalateApproval → AM; an AM step → FC (DF9) | A1, K7.HO, K17.HO |
| payable | bank | finance_controller | bankAccountNo, ifsc, beneficiary, callBackNumber, callBackPerson | 48 h | same | A2, N10, K7.HO, KR.CHG10 |
| payable | tax | compliance_officer | [] (pure approval) | 48 h | same | A3, W9 |
| receivable | party | accounts_manager | A4 keys (23) | 48 h | same | A4, K12.HO |
| receivable | credit_limit | credit_controller | creditLimit | 48 h | same | A5, K12.HO |
| receivable | tax | compliance_officer | [] | 48 h | same | A6, W9 |

- `covered_values` = the values of `covers` at Submit. States: `requested · approved · returned · cancelled · expired`; app "pending" / "Waiting" is the display label of `requested`.
- Resubmit (round + 1): a block whose previous step was approved and whose `covered_values` are unchanged (empty covers are always unchanged) is inserted already `approved` (decided_by / decided_at carried over); all others `requested` with a new deadline timer.
- The request becomes `approved` when every step of the current round is `approved`.
- **Order (01 §2.5):** all steps of a round wait at once, as the app shows them. The task doc's "the Credit Controller first, then the Accounts Manager confirms" (K12.HO) is difference D5.

### H.2 Timers

| timer event | entity | due | written by | cancelled by | reaction |
|---|---|---|---|---|---|
| ApprovalDeadlineReached | platform.approval (one per requested step) | submitted_at + approval_deadline_hours | SubmitPartyAccountRequest | DecidePartyAccountRequest (the step decided, or other steps cancelled on return) | approval-escalating |
| UdyamReminderDue | finance.party_account_request | submitted_at + udyam_reminder_days, then every udyam_reminder_days | SendNotice (each send writes the next) | none here (stops when MSME answered; change requests not built) | notice-sending |

### H.3 Parameters

| parameter | value | unit | owner | used by | trace |
|---|---|---|---|---|---|
| msmed_max_credit_days | 45 | days | accounts_manager (DF8) | SUB-17 | D3, C26, K7.PAR |
| penny_drop_pass_pct | 80 | pct | accounts_manager (DF8) | VerifyBankAccount result | D4, P2 |
| gst_name_match_pct | 80 | pct | accounts_manager (DF8) | WRN-03 | D6, C12 |
| udyam_reminder_days | 7 | days | accounts_manager (DF8) | UdyamReminderDue | D5, N4 |
| approval_deadline_hours | 48 | hours | accounts_manager (DF1) | approval timers | D11 |
| usual_vendor_credit_days | 45 | days | accounts_manager (DF8) | `suggestions.creditDays` for a vendor (D4) | D1, K7.PAR, K7.FILL |
| usual_customer_credit_days | 30 | days | accounts_manager (DF8) | no rule (G6: the task doc's T12 is silent) | D2 |

---

## I. Queries

Freshness for all: as of now (DF3). Counts: the list query with `count=true` (DF11).

| query | endpoint | question | filter | returns | authorised for | trace |
|---|---|---|---|---|---|---|
| ListPartyAccountRequests | `GET /api/v1/finance/party-account-requests` | Which onboarding requests are there, and who holds each? | `group=needs_me` (draft, returned) · `with_checkers` (submitted, approved) · `done` (active, sent_back) · `state=` · `side=` · `count=true` · `measure=oldest_age` (IND-1); discarded excluded; sorted created_at desc | rows {id, side, state, title (legal name or "New vendor · form X"), form_no, from_person_id, created_at, submitted_at, activated_at, sent_back_at, returned_reason, holder}; with `measure`: {count, oldest_age_hours} | AE, AM | S1, S2, S3, S5, S8, S9, S10, S27 (badge), S30, K7.IND |
| GetPartyAccountRequest | `GET /api/v1/finance/party-account-requests/{id}` | What is in this request, what blocks it, who holds it, what may I do? | id | {id, state, version, side, from_person_id, form_no, party_id, round, values, origins, suggestions {key: {value, why}} (the worked values, plus `creditDays` for a vendor = usual_vendor_credit_days, "usual terms": D4), checks [{id, level stop/warn/ok, title, detail, send_back, use_party_id}], probes {gstin, bank[]}, approvals [{id, step, position, state, deadline_at, decided_by, decided_at, reason}], tax_tagging [lines], history (trail), holder, allows [{action, allowed, why_not[]}]} | AE; step positions (AM, FC, CC, CO); automations party-registration, subledger-opening, party-onboarding | S11–S18, W1–W12, T1–T5, T7 |
| FindParty | `GET /api/v1/party-master/parties?gstin=&pan=` | Is this party already in the master? | gstin, pan | [{id, legal_name, pan, city, gstins[], roles[]}] | AE; finance (checks) | S18, C13–C18, L4 |
| GetParty | `GET /api/v1/party-master/parties/{id}` | Who is this party? | id | party + gstins + phones + roles | AE, AM, FC, CC, CO; finance | S22, B6, W10, L3 |
| ListPartyAccounts | `GET /api/v1/finance/party-accounts` | Which party accounts are active? | `side=` · `udyam_missing=true` (payable, msme unknown or yes without udyam) · `count=true` | rows {subledger_account_id, party_id, side, name, control_account (read from accounting), category, credit_days, credit_limit (current), msme_status, msme_category, udyam, sec43bh, bank_last4, bank_since, created_at} | AE, AM, FC, CC, CO | S4, S21, T6 |
| GetPartyAccount | `GET /api/v1/finance/party-accounts/{subledger_account_id}` | What are this account's finance facts? | id | the row above + current bank / credit limit versions | AE, AM, FC, CC, CO; billing_executive (billing fields, K12.SND); payables_executive (MSME fields, K17.HO); notice-sending | S22, T6 |
| ListSubledgerAccounts | `GET /api/v1/accounting/subledger-accounts` | Which party accounts are in the books? | `party_id=` · `name=` (case-insensitive) · `subledger=` | [{id, party_id, subledger, control_account_id, control_account_name, name, valid_from}] | finance; AE | W2, C15, C19 |
| FindAccountDetermination | `GET /api/v1/accounting/account-determinations?key_type=control&key=` | Which control account does this category go under? | key_type, key, book STAT | {account_id, account_name} | finance | W3 |
| ListControlAccounts | `GET /api/v1/accounting/accounts?is_control=true&side=` | Which headers may a party account sit under? | side | [{id, name}] | AE, finance | W3, SUB-26, N11 |
| ListCategoryCodes | `GET /api/v1/finance/category-codes?side=` | Which categories exist for this side? | side, active | [{key, label, attributes}] | AE | F11, W8, W9 |
| ListStateCodes | `GET /api/v1/party-master/state-codes` | Which states? | active | [{key, label, attributes}] | AE | W1 |
| ListConstitutionCodes | `GET /api/v1/party-master/constitution-codes` | Which constitutions? | active | [{key, label}] | AE | W4 |
| ListPersons (hr, declared) | `GET /api/v1/hr/persons?position=` | Who may hand over a form for this side? | position | [{person_id, name, position}] | AE | F27, S19 |
| ListNotices | `GET /api/v1/platform/notices` | What has been sent to me? | to = caller; `unread=true`; `limit=` | [{id, tone, title, body, entity, entity_id, at, read_at}] | the receiver | S6, S27, T9 |
| ListParameters | `GET /api/v1/platform/parameters` | Which numbers do the rules use? | – | [{key, value, unit, owner_position, valid_from}] | any position | S25, D1–D6 |
| ListPartyAccountRequestGates | `GET /api/v1/finance/party-account-request-gates` | What stops or warns a submit? | – | [{id, class, level, when, why}] | any position | S23 |
| ListPartyAccountRequestRoutes | `GET /api/v1/finance/party-account-request-routes` | Which checker gets which part? | `side=` | [{step, position, covers[]}] | any position | S24 |
| GetAuthority | `GET /api/v1/platform/authority` | What may I do in this app? | caller's position | [{action, allowed}] | caller | S28 |

Holder (from state): draft / returned → the maker (created_by); submitted → the positions of the `requested` steps; approved → the automation next in the chain; active / sent_back / discarded → none. It agrees with the task doc (K7.HELD, K12.HELD; "objected" = returned).

**Indicators (task doc, K.IND):**
- **IND-1 "Vendor proposals waiting (age)"** (K7.IND): `GET /api/v1/finance/party-account-requests?group=needs_me&side=payable&count=true&measure=oldest_age` → `{count, oldest_age_hours}`. No new endpoint; the existing index `(legal_entity_id, state, created_at)` serves it.
- **IND-2 "Recommendations waiting to be entered"** (K12.IND): the app holds no recommendation, so it is a gap (G15).

---

## J. Authority (computed per call; the app only hides)

| action | AE | AM | FC | CC | CO | party-registration | subledger-opening | party-onboarding | notice-sending | approval-escalating | receiver |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OpenPartyAccountRequest | ✓ | | | | | | | | | | |
| SavePartyAccountRequest | ✓ | | | | | | | | | | |
| UseParty | ✓ | | | | | | | | | | |
| CheckGstin | ✓ | | | | | | | | | | |
| VerifyBankAccount | ✓ | | | | | | | | | | |
| SubmitPartyAccountRequest | ✓ | | | | | | | | | | |
| DecidePartyAccountRequest | ✗ (DF6) | ✓ party step | ✓ bank step | ✓ credit_limit step | ✓ tax step | | | | | | |
| SendBackPartyAccountRequest | ✓ | | | | | | | | | | |
| DiscardPartyAccountRequest | ✓ | | | | | | | | | | |
| RegisterParty | | | | | | ✓ | | | | | |
| AddPartyRole | | | | | | ✓ | | | | | |
| OpenSubledgerAccount | | | | | | | ✓ | | | | |
| ActivatePartyAccountRequest | | | | | | | | ✓ | | | |
| SendNotice | | | | | | | | | ✓ | | |
| MarkNotice | | | | | | | | | | | ✓ (own notice) |
| EscalateApproval | | | | | | | | | | ✓ | |

Procurement Officer, Contracts & Services Procurement Officer, Sales Executive: no actions (they receive N6). Trace: B1–B16, A1–A6, C35, S28.

**From the task doc (rev 6):** the Billing Executive and the Payables Executive have no actions, only a read grant on GetPartyAccount (K12.SND, K17.HO). The refusal rules NEV-1 … NEV-6, and how each holds: U.3.

---

## K. History (one commit per action)

| action | rows written in its one commit |
|---|---|
| OpenPartyAccountRequest | INSERT finance.party_account_request (draft, values = worked currency / billByBill, origins) · INSERT platform.receipt · INSERT platform.trail · INSERT platform.outbox (PartyAccountRequestOpened) |
| SavePartyAccountRequest | UPDATE finance.party_account_request (values, origins, version + 1) · receipt · trail (diff of values) · outbox (Saved) |
| UseParty | UPDATE party_account_request (party_id, values, origins) · INSERT finance.gstin_check (source master, if the party has a GSTIN) · receipt · trail · outbox (PartyUsed) |
| CheckGstin | INSERT finance.gstin_check (source portal) · receipt (outcome holds the portal answer) · trail · outbox (GstinChecked) |
| VerifyBankAccount | INSERT finance.bank_account_verification (penny_drop) · receipt · trail · outbox (BankAccountVerified) |
| SubmitPartyAccountRequest | UPDATE party_account_request (submitted, round + 1, submitted_at) · INSERT finance.bank_account_verification (call_back, if name_mismatch) · INSERT platform.approval × steps (round + 1) · INSERT platform.timer × requested steps (ApprovalDeadlineReached) · receipt · trail · outbox (Submitted) |
| DecidePartyAccountRequest | UPDATE platform.approval (the step: approved / returned, decided_by, decided_at, reason) · UPDATE platform.timer (that step: cancelled) · [returned: UPDATE other requested approvals → cancelled, their timers → cancelled, UPDATE request → returned] · [last approval: UPDATE request → approved] · receipt · trail · outbox (Decided, Approved or Returned) |
| SendBackPartyAccountRequest | UPDATE party_account_request (sent_back, sent_back_reason, sent_back_at) · receipt · trail · outbox (SentBack) |
| DiscardPartyAccountRequest | UPDATE party_account_request (discarded) · receipt · trail · outbox (Discarded) |
| RegisterParty | INSERT party_master.party · INSERT party_gstin (if GSTIN) · INSERT party_phone · INSERT party_role · receipt · trail · outbox (PartyRegistered) · UPDATE platform.reaction_run (done) |
| AddPartyRole | INSERT party_master.party_role · receipt · trail · outbox (PartyRoleAdded) · reaction_run |
| OpenSubledgerAccount | INSERT accounting.subledger_account · receipt · trail · outbox (SubledgerAccountOpened) · reaction_run |
| ActivatePartyAccountRequest | INSERT finance.party_account · INSERT finance.party_credit_limit (receivable) · INSERT finance.party_bank_account (payable) · UPDATE party_account_request (active, party_id, subledger_account_id, activated_at) · INSERT platform.timer (UdyamReminderDue, if udyam_pending) · receipt · trail · outbox (Activated) · reaction_run |
| SendNotice | INSERT platform.notice · [UdyamReminderDue: UPDATE fired timer, INSERT next timer] · receipt · trail · outbox (NoticeSent) · reaction_run |
| MarkNotice | UPDATE platform.notice (read_at) · receipt · trail · outbox (NoticeMarked) |
| EscalateApproval | UPDATE platform.approval (position = accounts_manager) · UPDATE platform.timer (fired) · receipt · trail · outbox (ApprovalEscalated) · reaction_run |

Committed rows are never edited except state / version moves of entities with a life; versioned facts get new versions; trail, receipt, outbox, probe rows are append-only.

---

## L. Accounting

| kind | accounting event | sub-ledger | posting rule | determination keys | trace |
|---|---|---|---|---|---|
| **Master** (§5.1) | **none**; no journal; control-account balance unchanged | `accounting.subledger_account`: AP (payable) / AR (receivable), under the control account ("Under (header)") | none | `(key_type = control, key = <category key>, book STAT, legal_entity_id)` → control account; one row per category (20 payable + 16 receivable), mapping as `underFor`: payable goods_msme / goods_non_msme → Trade Payables › Goods; capital_goods → › Capital Goods; related_party → › Related Parties; international_import → › Import; others → › Services & Expenses; receivable export_goods / export_services / sez_unit / deemed_export → Trade Receivables › Export & SEZ; related_party_* → › Related Parties; domestic_b2b_regular / dealer_distributor / domestic_b2g → › Domestic; others → › Other | W3, N11, L12, §5.2, DF7 |

No preview gate (not a financial subject). No period gate.

---

## M. DDL

```sql
-- =====================================================================
-- platform (§3.6)
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE platform.automation (
  legal_entity_id text NOT NULL,
  name     text PRIMARY KEY CHECK (name ~ '^[a-z]+(-[a-z]+)*$'),
  context  text NOT NULL,
  "grant"  text[] NOT NULL
);

CREATE TABLE platform.parameter (
  legal_entity_id text NOT NULL,
  key            text PRIMARY KEY,
  value          numeric NOT NULL,
  unit           text,
  owner_position text NOT NULL,
  valid_from     date NOT NULL DEFAULT current_date
);

CREATE TABLE platform.receipt (
  legal_entity_id text NOT NULL,
  invocation_id     text PRIMARY KEY,
  action            text NOT NULL,
  principal         text NOT NULL,
  position_or_grant text NOT NULL,
  request_key       text NOT NULL,
  rules_version     text NOT NULL,
  outcome           jsonb NOT NULL,
  at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.trail (
  legal_entity_id text NOT NULL,
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity        text NOT NULL,
  entity_id     text NOT NULL,
  invocation_id text NOT NULL REFERENCES platform.receipt (invocation_id),
  diff          jsonb NOT NULL,
  reason        text,
  at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trail_entity_ix ON platform.trail (entity, entity_id, at);

CREATE TABLE platform.outbox (
  legal_entity_id text NOT NULL,
  event_id      uuid PRIMARY KEY,
  event         text NOT NULL,
  version       integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  entity        text NOT NULL,
  entity_id     text NOT NULL,
  invocation_id text REFERENCES platform.receipt (invocation_id),   -- NULL only for timer-published events
  payload       jsonb NOT NULL,
  at            timestamptz NOT NULL DEFAULT now(),
  delivered_at  timestamptz
);
CREATE INDEX outbox_undelivered_ix ON platform.outbox (at) WHERE delivered_at IS NULL;

CREATE TABLE platform.reaction_run (
  legal_entity_id text NOT NULL,
  event_id      uuid NOT NULL REFERENCES platform.outbox (event_id),
  reaction      text NOT NULL,
  invocation_id text,
  state         text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'done', 'failed')),
  attempts      integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error    text,
  PRIMARY KEY (event_id, reaction)
);

CREATE TABLE platform.approval (
  legal_entity_id text NOT NULL,
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity         text NOT NULL,
  entity_id      text NOT NULL,
  round          integer NOT NULL CHECK (round >= 1),
  step           text NOT NULL,
  position       text NOT NULL,
  covers         text[] NOT NULL DEFAULT '{}',
  covered_values jsonb NOT NULL DEFAULT '{}',
  state          text NOT NULL DEFAULT 'requested'
                 CHECK (state IN ('requested', 'approved', 'returned', 'cancelled', 'expired')),
  deadline_at    timestamptz,
  decided_by     text,
  decided_at     timestamptz,
  reason         text,
  UNIQUE (entity, entity_id, round, step),
  CHECK (state <> 'returned' OR reason IS NOT NULL),
  CHECK (state NOT IN ('approved', 'returned') OR (decided_by IS NOT NULL AND decided_at IS NOT NULL))
);
CREATE INDEX approval_inbox_ix ON platform.approval (legal_entity_id, position, state);

CREATE TABLE platform.timer (
  legal_entity_id text NOT NULL,
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event     text NOT NULL,
  entity    text NOT NULL,
  entity_id text NOT NULL,
  due_at    timestamptz NOT NULL,
  state     text NOT NULL DEFAULT 'scheduled' CHECK (state IN ('scheduled', 'fired', 'cancelled'))
);
CREATE INDEX timer_due_ix ON platform.timer (due_at) WHERE state = 'scheduled';

CREATE TABLE platform.notice (
  legal_entity_id text NOT NULL,
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  to_position text,
  to_party_id text,
  to_address  text,
  channel     text NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
  entity      text,
  entity_id   text,
  tone        text NOT NULL CHECK (tone IN ('info', 'success', 'warning', 'critical')),
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  at          timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz,
  CHECK (to_position IS NOT NULL OR to_party_id IS NOT NULL OR to_address IS NOT NULL),
  CHECK ((to_position IS NOT NULL AND channel = 'in_app') OR ((to_party_id IS NOT NULL OR to_address IS NOT NULL) AND channel IN ('email', 'sms')))
);
CREATE INDEX notice_inbox_ix ON platform.notice (legal_entity_id, to_position, read_at);

CREATE TABLE platform.access_log (                -- unmasked reads of sensitive data (01 §3.13)
  legal_entity_id text NOT NULL,
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  principal text NOT NULL,
  entity    text NOT NULL,
  entity_id text NOT NULL,
  fields    text[] NOT NULL,
  at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_log_entity_ix ON platform.access_log (entity, entity_id, at);

-- =====================================================================
-- party_master (Foundation; tenant workspace_id)
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS party_master;

CREATE TABLE party_master.state_code (
  key      text PRIMARY KEY,
  label    text NOT NULL,
  active   boolean NOT NULL DEFAULT true,
  attributes jsonb NOT NULL DEFAULT '{}'   -- {gst_code}
);

CREATE TABLE party_master.constitution_code (
  key    text PRIMARY KEY,
  label  text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE party_master.party (
  id             text PRIMARY KEY CHECK (id ~ '^P-[0-9]{4,}$'),
  workspace_id   text NOT NULL,
  state          text NOT NULL DEFAULT 'active' CHECK (state IN ('active')),
  version        integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     text NOT NULL,
  legal_name     text NOT NULL,
  trade_name     text,
  pan            text CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  address_line   text NOT NULL,
  city           text NOT NULL,
  state_code     text REFERENCES party_master.state_code (key),
  pincode        text CHECK (pincode ~ '^[0-9]{6}$'),
  contact_person text,
  email          text,
  constitution   text NOT NULL REFERENCES party_master.constitution_code (key),
  resident       text NOT NULL CHECK (resident IN ('resident', 'non_resident'))
);
CREATE INDEX party_pan_ix ON party_master.party (workspace_id, pan);

CREATE TABLE party_master.party_gstin (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id text NOT NULL,
  party_id     text NOT NULL REFERENCES party_master.party (id),
  gstin        text NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  state_code   text NOT NULL REFERENCES party_master.state_code (key),
  status       text NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by_invocation text NOT NULL,
  UNIQUE (workspace_id, gstin)
);
CREATE INDEX party_gstin_party_ix ON party_master.party_gstin (party_id);

CREATE TABLE party_master.party_phone (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id text NOT NULL,
  party_id     text NOT NULL REFERENCES party_master.party (id),
  phone        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by_invocation text NOT NULL,
  UNIQUE (party_id, phone)
);

CREATE TABLE party_master.party_role (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id         text NOT NULL,
  party_id             text NOT NULL REFERENCES party_master.party (id),
  legal_entity_id      text NOT NULL,          -- declared identifier
  type                 text NOT NULL CHECK (type IN ('supplier', 'customer')),
  since                date NOT NULL,
  entered_by_person_id text NOT NULL,          -- declared identifier (hr)
  form_from_person_id  text,                   -- declared identifier (hr)
  form_no              text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by_invocation text NOT NULL,
  UNIQUE (party_id, legal_entity_id, type)
);

-- =====================================================================
-- accounting (module; tenant legal_entity_id) — tables this task uses (§5.4)
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS accounting;

CREATE TABLE accounting.account (                       -- the chart; read by this task, never written
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legal_entity_id text NOT NULL,
  name            text NOT NULL,
  parent_id       bigint REFERENCES accounting.account (id),
  type            text NOT NULL,
  is_postable     boolean NOT NULL,
  is_control      boolean NOT NULL DEFAULT false,
  UNIQUE (legal_entity_id, name)
);

CREATE TABLE accounting.account_determination (
  key_type        text NOT NULL,
  key             text NOT NULL,
  legal_entity_id text NOT NULL,
  book_id         text NOT NULL DEFAULT 'STAT',
  account_id      bigint NOT NULL REFERENCES accounting.account (id),
  valid_from      date NOT NULL,
  valid_to        date,
  PRIMARY KEY (legal_entity_id, book_id, key_type, key, valid_from),
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE TABLE accounting.subledger_account (
  id                 text PRIMARY KEY CHECK (id ~ '^ACC-[0-9]+$'),
  legal_entity_id    text NOT NULL,
  state              text NOT NULL DEFAULT 'active' CHECK (state IN ('active')),
  version            integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         text NOT NULL,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         text NOT NULL,
  subledger          text NOT NULL CHECK (subledger IN ('AP', 'AR')),
  party_id           text NOT NULL,           -- declared identifier (party_master)
  control_account_id bigint NOT NULL REFERENCES accounting.account (id),
  name               text NOT NULL,
  valid_from         date NOT NULL,
  valid_to           date
);
CREATE UNIQUE INDEX subledger_account_name_ux ON accounting.subledger_account (legal_entity_id, lower(name));
CREATE UNIQUE INDEX subledger_account_party_ux ON accounting.subledger_account (legal_entity_id, party_id, subledger) WHERE valid_to IS NULL;

-- =====================================================================
-- seed: automations and parameters
-- =====================================================================
INSERT INTO platform.automation (name, context, "grant") VALUES
  ('party-registration',  'party_master', ARRAY['RegisterParty', 'AddPartyRole']),
  ('subledger-opening',   'accounting',   ARRAY['OpenSubledgerAccount']),
  ('party-onboarding',    'finance',      ARRAY['ActivatePartyAccountRequest']),
  ('notice-sending',      'platform',     ARRAY['SendNotice']),
  ('approval-escalating', 'platform',     ARRAY['EscalateApproval']);

INSERT INTO platform.parameter (key, value, unit, owner_position) VALUES
  ('msmed_max_credit_days',      45, 'days',  'accounts_manager'),
  ('penny_drop_pass_pct',        80, 'pct',   'accounts_manager'),
  ('gst_name_match_pct',         80, 'pct',   'accounts_manager'),
  ('udyam_reminder_days',         7, 'days',  'accounts_manager'),
  ('approval_deadline_hours',    48, 'hours', 'accounts_manager'),
  ('usual_vendor_credit_days',   45, 'days',  'accounts_manager'),
  ('usual_customer_credit_days', 30, 'days',  'accounts_manager');

-- =====================================================================
-- finance (module; tenant legal_entity_id)
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS finance;

CREATE TABLE finance.category_code (
  key           text PRIMARY KEY,
  label         text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  side          text NOT NULL CHECK (side IN ('payable', 'receivable')),
  attributes    jsonb NOT NULL DEFAULT '{}'   -- {sec43bh_rule, sec43bh_words, tds_hint}
);

CREATE TABLE finance.party_account_request (
  id                   text PRIMARY KEY CHECK (id ~ '^REQ-[0-9]{4,}$'),
  legal_entity_id      text NOT NULL,
  state                text NOT NULL DEFAULT 'draft'
                       CHECK (state IN ('draft', 'submitted', 'returned', 'approved', 'active', 'sent_back', 'discarded')),
  version              integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           text NOT NULL,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           text NOT NULL,
  side                 text NOT NULL CHECK (side IN ('payable', 'receivable')),
  from_person_id       text NOT NULL,          -- declared identifier (hr)
  form_no              text NOT NULL CHECK (btrim(form_no) <> ''),
  party_id             text,                   -- declared identifier (party_master)
  "values"             jsonb NOT NULL DEFAULT '{}',
  origins              jsonb NOT NULL DEFAULT '{}',
  round                integer NOT NULL DEFAULT 0 CHECK (round >= 0),
  submitted_at         timestamptz,
  activated_at         timestamptz,
  sent_back_reason     text,
  sent_back_at         timestamptz,
  subledger_account_id text,                   -- declared identifier (accounting)
  CHECK (state <> 'sent_back' OR (sent_back_reason IS NOT NULL AND sent_back_at IS NOT NULL)),
  CHECK (state <> 'active' OR (party_id IS NOT NULL AND subledger_account_id IS NOT NULL AND activated_at IS NOT NULL)),
  CHECK (state <> 'discarded' OR round = 0)
);
CREATE INDEX party_account_request_state_ix ON finance.party_account_request (legal_entity_id, state, created_at DESC);

CREATE TABLE finance.gstin_check (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legal_entity_id          text NOT NULL,
  party_account_request_id text NOT NULL REFERENCES finance.party_account_request (id),
  input_key                text NOT NULL,
  result                   text NOT NULL CHECK (result IN ('active', 'suspended', 'cancelled')),
  detail                   jsonb NOT NULL,
  checked_at               timestamptz NOT NULL DEFAULT now(),
  source                   text NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'master'))
);
CREATE INDEX gstin_check_req_ix ON finance.gstin_check (party_account_request_id, checked_at DESC);

CREATE TABLE finance.bank_account_verification (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legal_entity_id          text NOT NULL,
  party_account_request_id text NOT NULL REFERENCES finance.party_account_request (id),
  method                   text NOT NULL CHECK (method IN ('penny_drop', 'call_back')),
  input_key                text NOT NULL,
  result                   text NOT NULL CHECK (result IN ('pass', 'name_mismatch')),
  detail                   jsonb NOT NULL,
  checked_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (method = 'penny_drop' OR result = 'pass')
);
CREATE INDEX bank_account_verification_req_ix ON finance.bank_account_verification (party_account_request_id, method, checked_at DESC);

CREATE TABLE finance.party_account (
  subledger_account_id     text PRIMARY KEY CHECK (subledger_account_id ~ '^ACC-[0-9]+$'),  -- declared (accounting)
  legal_entity_id          text NOT NULL,
  state                    text NOT NULL DEFAULT 'active' CHECK (state IN ('active')),
  version                  integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at               timestamptz NOT NULL DEFAULT now(),
  created_by               text NOT NULL,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               text NOT NULL,
  party_id                 text NOT NULL,      -- declared identifier (party_master)
  party_account_request_id text NOT NULL UNIQUE REFERENCES finance.party_account_request (id),
  side                     text NOT NULL CHECK (side IN ('payable', 'receivable')),
  category                 text NOT NULL REFERENCES finance.category_code (key),
  related_party            boolean NOT NULL,
  credit_days              integer NOT NULL CHECK (credit_days >= 0),
  msme_status              text CHECK (msme_status IN ('yes', 'no', 'unknown')),
  msme_category            text CHECK (msme_category IN ('micro', 'small', 'medium')),
  udyam                    text CHECK (udyam ~ '^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$'),
  sec43bh                  boolean,
  currency                 text NOT NULL CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP')),
  bill_by_bill             boolean NOT NULL DEFAULT true,
  po_rule                  text CHECK (po_rule IN ('every_invoice', 'none')),
  delivery                 text CHECK (delivery IN ('email', 'portal', 'with_goods', 'courier')),
  invoice_format           text
);
CREATE UNIQUE INDEX party_account_party_side_ux ON finance.party_account (legal_entity_id, party_id, side);
CREATE INDEX party_account_side_ix ON finance.party_account (legal_entity_id, side);

CREATE TABLE finance.party_credit_limit (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legal_entity_id       text NOT NULL,
  subledger_account_id  text NOT NULL REFERENCES finance.party_account (subledger_account_id),
  credit_limit          numeric(18,2) NOT NULL CHECK (credit_limit >= 0),
  valid_from            timestamptz NOT NULL,
  valid_to              timestamptz,
  created_by_invocation text NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);
CREATE UNIQUE INDEX party_credit_limit_open_ux ON finance.party_credit_limit (subledger_account_id) WHERE valid_to IS NULL;

CREATE TABLE finance.party_bank_account (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legal_entity_id       text NOT NULL,
  subledger_account_id  text NOT NULL REFERENCES finance.party_account (subledger_account_id),
  bank_account_no       text NOT NULL,
  ifsc                  text NOT NULL CHECK (ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  beneficiary           text NOT NULL,
  call_back_number      text,
  call_back_person      text,
  valid_from            timestamptz NOT NULL,
  valid_to              timestamptz,
  created_by_invocation text NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  CHECK ((call_back_number IS NULL) = (call_back_person IS NULL))
);
CREATE UNIQUE INDEX party_bank_account_open_ux ON finance.party_bank_account (subledger_account_id) WHERE valid_to IS NULL;
CREATE INDEX party_bank_account_no_ix ON finance.party_bank_account (legal_entity_id, bank_account_no) WHERE valid_to IS NULL;
```

Not created by this task (accounting core, §5.4, unused by a master subject): `posting_rule`, `accounting_event`, `journal_entry`, `journal_line`, `gl_balance`, `period_status`, `posting_exception`, `commitment`.

---

### M.2 Constraints and indexes (01 §3.9)

| Rule | Where in the DDL |
|---|---|
| Uniqueness gates → `UNIQUE` | GSTIN per workspace (`party_gstin`) · role per party and company (`party_role`) · sub-ledger name, case-insensitive, and one open account per party and side (`subledger_account`) · one account per party and side (`party_account`) · one open bank and credit-limit version (`party_bank_account`, `party_credit_limit`) · approval step per round (`approval`) · reaction once per event (`reaction_run` PK) |
| Query filters → indexes | request lists `(legal_entity_id, state, created_at)` · approver inbox `(legal_entity_id, position, state)` · notices `(legal_entity_id, to_position, read_at)` · PAN search · bank account search · account lists by side · probe results by request |
| Delete | No `ON DELETE CASCADE` anywhere (default = restrict). Nothing is deleted: Discard is a state (DF4) |
| Migrations | 4, in order: `platform` → `party_master` → `accounting` → `finance`. Seed data in the same migrations: automations (5), parameters (7), state codes, constitution codes, categories, account determination (category → control account), owned by the Accounts Manager |

---

## N. API

Common: base `/api/v1`; headers `Authorization`, `Idempotency-Key` (every action). Errors: `422 {errors: [{gate, class, message, send_back?, use_party_id?}]}` for Input / Consistency / Probe / Uniqueness / Business gates; `409 {errors:[{gate}]}` for State gates and version conflicts; `403 {errors:[{gate}]}` for Authority; `404` unknown id. A repeated idempotency key returns the recorded outcome (200 / 201 as first time). Action responses return `{invocation_id, event_id, subject: <GET view>}` unless stated.

### N.1 Actions

| method | path | body | response | errors (gate ids) |
|---|---|---|---|---|
| POST | `/finance/party-account-requests` | `{side, from_person_id, form_no}` | 201 `{invocation_id, event_id, subject}` (state draft, id REQ-…) | OPN-1, OPN-2, OPN-3, OPN-4, OPN-5 |
| PATCH | `/finance/party-account-requests/{id}` | `{version, values: {<field key>: value \| null, …}}` | 200 `{…, subject}` (checks re-run and returned) | SAV-1, SAV-2, SAV-3, 409 version |
| POST | `/finance/party-account-requests/{id}/use-party` | `{party_id: "P-0088" \| null}` | 200 | USE-1, USE-2, USE-3 |
| POST | `/finance/party-account-requests/{id}/check-gstin` | `{}` (uses values.gstin) | 200 `{…, probe: {result, name_at_gst, state_code, checked_at}}` | GST-1, GST-2, GST-3, GST-4; 502 portal unavailable |
| POST | `/finance/party-account-requests/{id}/verify-bank-account` | `{}` (uses values.bankAccountNo, values.ifsc) | 200 `{…, probe: {result, name_at_bank, match_pct, checked_at}}` | BNK-1, BNK-2, BNK-3, BNK-4; 502 bank unavailable |
| POST | `/finance/party-account-requests/{id}/submit` | `{version}` | 200 `{…, round, steps: [{approval_id, step, position, state, deadline_at}]}` | SUB-01 … SUB-27 |
| POST | `/finance/party-account-requests/{id}/decide` | `{step, outcome: "approved" \| "returned", reason?}` | 200 `{…, step_state, request_state}` | DEC-1, DEC-2, DEC-3, DEC-4, DEC-5 |
| POST | `/finance/party-account-requests/{id}/send-back` | `{reason}` | 200 | SBK-1, SBK-2, SBK-3 |
| POST | `/finance/party-account-requests/{id}/discard` | `{}` | 200 | DSC-1, DSC-2 |
| POST | `/finance/party-account-requests/{id}/activate` | `{subledger_account_id, party_id}` (from SubledgerAccountOpened) | 200 | ACT-1, ACT-2, ACT-3 |
| POST | `/party-master/parties` | `{legal_name, trade_name?, pan?, gstin?: {value, state_code, status}, address_line, city, state_code?, pincode?, contact_person?, email?, phone, constitution, resident, role: {type, since, entered_by_person_id, form_from_person_id, form_no}, source: {entity: "finance.party_account_request", id}}` | 201 `{invocation_id, event_id, party_id}` | REG-1, REG-2, REG-3, REG-4 |
| POST | `/party-master/parties/{id}/add-role` | `{type, since, entered_by_person_id, form_from_person_id, form_no, source: {entity, id}}` | 200 `{invocation_id, event_id, party_role_id}` | ROL-1, ROL-2, ROL-3, ROL-4 |
| POST | `/accounting/subledger-accounts` | `{party_id, subledger: "AP" \| "AR", name, control_account_id, source: {entity: "finance.party_account_request", id}}` | 201 `{invocation_id, event_id, subledger_account_id}` | SLA-1, SLA-2, SLA-3, SLA-4, SLA-5 |
| POST | `/platform/notices` | `{to_position? , to_party_id?, channel, entity, entity_id, tone, title, body}` | 201 `{invocation_id, event_id, notice_id}` | NTC-1, NTC-2 |
| POST | `/platform/notices/{id}/mark` | `{read: true}` | 200 `{invocation_id, event_id, read_at}` | MRK-1, MRK-2 |
| POST | `/platform/approvals/{id}/escalate` | `{}` | 200 `{invocation_id, event_id, position}` | ESC-1, ESC-2 |

### N.2 Queries

| method | path | params | response | errors |
|---|---|---|---|---|
| GET | `/finance/party-account-requests` | `group`, `state`, `side`, `count`, `measure`, `limit`, `after` | `{rows: [...], count?, oldest_age_hours?}` (see §I) | 403 |
| GET | `/finance/party-account-requests/{id}` | – | subject view: `{id, state, version, side, from_person_id, form_no, party_id, round, values, origins, suggestions, checks, probes, approvals, tax_tagging, history, holder, allows}` | 403, 404 |
| GET | `/finance/party-accounts` | `side`, `udyam_missing`, `count`, `limit`, `after` | `{rows, count?}` | 403 |
| GET | `/finance/party-accounts/{subledger_account_id}` | – | account view (finance facts + current bank / credit-limit version + name, control account from accounting) | 403, 404 |
| GET | `/finance/category-codes` | `side`, `active` | `[{key, label, attributes}]` | – |
| GET | `/finance/party-account-request-gates` | – | `[{id, class, level, when, why}]` | – |
| GET | `/finance/party-account-request-routes` | `side` | `[{step, position, covers}]` | – |
| GET | `/party-master/parties` | `gstin`, `pan` | `[{id, legal_name, pan, city, gstins, roles}]` | 403 |
| GET | `/party-master/parties/{id}` | – | `{id, legal_name, trade_name, pan, gstins, address_line, city, state_code, pincode, contact_person, email, phones, constitution, resident, roles}` | 403, 404 |
| GET | `/party-master/state-codes` | `active` | `[{key, label, attributes}]` | – |
| GET | `/party-master/constitution-codes` | `active` | `[{key, label}]` | – |
| GET | `/accounting/subledger-accounts` | `party_id`, `name`, `subledger` | `[{id, party_id, subledger, control_account_id, control_account_name, name, valid_from}]` | 403 |
| GET | `/accounting/subledger-accounts/{id}` | – | one row | 403, 404 |
| GET | `/accounting/account-determinations` | `key_type`, `key`, `book_id=STAT` | `{account_id, account_name}` | 404 (no mapping) |
| GET | `/accounting/accounts` | `is_control=true`, `side` | `[{id, name}]` | – |
| GET | `/hr/persons` | `position` | `[{person_id, name, position}]` (declared, hr) | – |
| GET | `/platform/notices` | `unread`, `limit` | `[{id, tone, title, body, entity, entity_id, at, read_at}]` | – |
| GET | `/platform/parameters` | – | `[{key, value, unit, owner_position, valid_from}]` | – |
| GET | `/platform/authority` | – | `[{action, allowed}]` | – |

---

## O. Contract tests

Fixtures: chart headers + control determinations (§L), category / state / constitution codes, parameters (§M seed), parties P-0011…P-0042, P-0088 and accounts ACC-2101…ACC-1206 as in `seed.ts`, requests REQ-0100 (submitted; party and tax approved; bank requested) and REQ-0101 (draft, party details typed). Mock services: GST portal (GSTIN with letters 3–4 `ZZ` → cancelled; a master GSTIN keeps its status; else active), bank (account starting `7777` → name "SRI RAMA ENTERPRISES").

| # | scenario | calls | events | rows expected |
|---|---|---|---|---|
| O1 | Malnad (REQ-0101) worked values | GET REQ-0101 | – | values.state = KA; constitution = partnership; accountName = "Malnad Cocoa Traders"; checks contain SUB-13 "Still to fill: Category · Related party · Credit days · MSME · Bank account number · IFSC · Beneficiary name" and SUB-06 |
| O2 | Copying mistakes | PATCH legalName "… LLP" → accountName follows; PATCH pan AAHFM0000B → SUB-03; PATCH pan back, state TN → SUB-04 | Saved ×3 | trail rows ×3; request still draft |
| O3 | Category drives header and 43B(h) | PATCH category goods_msme | Saved | values.under = control account "Trade Payables › Goods"; sec43bh = yes |
| O4 | Malnad stops | PATCH (paper values) · check-gstin · verify-bank-account · PATCH category goods_non_msme → SUB-14 · PATCH goods_msme, creditDays 60 → SUB-17 · PATCH bankAccountNo 50100012345678 → SUB-18 (send_back) · submit → 422 | Saved, GstinChecked, BankAccountVerified | gstin_check (portal, active); bank_account_verification (penny_drop, pass, 100) |
| O5 | Penny-drop mismatch and call-back | as O4 ready · PATCH bankAccountNo 777700001234 → SUB-21 · verify-bank-account → name_mismatch · PATCH callBackNumber email, callBackPerson → SUB-22 · PATCH callBackNumber "+91 98450 00000" → no stops · submit | BankAccountVerified ×2, Submitted (call_back_recorded true) | bank_account_verification penny_drop name_mismatch + call_back pass; approval ×3 round 1 |
| O6 | Malnad happy path, new party | ready · submit · decide party (AM) · decide bank (FC) · decide tax (CO) | Submitted; Decided ×2, Approved; PartyRegistered; SubledgerAccountOpened; PartyAccountRequestActivated; NoticeSent ×2 (maker N2; party N4, since MSME = yes with no Udyam → udyam_pending true) | approval ×3 approved; timers cancelled ×3; party P-… (Malnad, partnership, resident), party_gstin 29AAHFM0000A1Z5 KA active, party_phone, party_role supplier (form_from ravi, VRF-0107); subledger_account AP under Trade Payables › Goods; party_account (goods_msme, msme yes micro, sec43bh true, credit 30); party_bank_account; request active; timer UdyamReminderDue; notices to maker and to party |
| O7 | Return and resubmit | ready · submit · decide party approved · decide bank returned "Cancelled cheque does not match the account" · PATCH beneficiary · submit | Returned → NoticeSent (N1); Submitted round 2 | round-1 tax step cancelled; request returned then submitted; round 2: party approved (carried), bank requested, tax requested (round-1 tax was cancelled) |
| O8 | Coastal Bakes (CRF-0019) customer | open {receivable, arun, CRF-0019} · PATCH paper values · check-gstin · submit · decide ×3 (AM, CC, CO) | Opened, Saved, GstinChecked, Submitted, Decided ×2, Approved, PartyRegistered, SubledgerAccountOpened, Activated, NoticeSent | checks: WRN-04 with use_party_id P-0088; under = Trade Receivables › Domestic; constitution company; steps party / credit_limit / tax; party_credit_limit 400000.00; party_account po_rule every_invoice, delivery email |
| O9 | Sri Lakshmi (Mysuru) CRF-0020 sent back | open · PATCH paper values · GET → SUB-10 send_back "Already set up: GSTIN 29AAKFS0000S1Z2 is Sri Lakshmi Distributors (P-0031)" · send-back {reason} | Opened, Saved, SentBack, NoticeSent (to arun, N6) | request sent_back with reason; no party, no account rows |
| O10 | Use P-0088 locks party details | open · PATCH paper values · use-party P-0088 · PATCH legalName "Something else" → 403 SAV-3 (NEV-2) | PartyUsed | values.legalName = "Coastal Bakes & Confectioners" (unchanged: the refused call writes nothing); no gstin_check (P-0088 has no GSTIN) |
| O11 | Healthy Bite REQ-0100 (used party P-0042) | GET (OK-03 "Also our customer"; accountName "Healthy Bite Foods (vendor)") · decide bank (FC) | Approved → PartyRoleAdded (no PartyRegistered) → SubledgerAccountOpened → Activated | party count unchanged; party_role supplier added to P-0042; second account (AP) for P-0042 |
| O12 | GSTIN cancelled | PATCH gstin 29ZZ… (with matching PAN) · check-gstin → cancelled · submit | GstinChecked | submit 422 SUB-08 (send_back); send-back allowed |
| O13 | Discard | open · discard; then discard after a submit → 409 DSC-1 | Opened, Discarded | request discarded (row kept) |
| O14 | Maker may not decide | AE calls decide | – | 403 DEC-3 |
| O15 | Approval deadline | submit; clock + 48 h | ApprovalDeadlineReached → ApprovalEscalated → NoticeSent (AM) | approval.position = accounts_manager; timer fired |
| O16 | Udyam reminder repeat | after O6; clock + 7 days | UdyamReminderDue → NoticeSent (email to party) | new timer due + 7 days |
| O17 | Idempotency | repeat submit with same key | none new | same outcome, one receipt |
| O18 | Mock-log coverage | O1–O16 together | – | every L1–L19 effect produced under its spec name (§P renames) |

---

## P. Gaps, defaults, renames

### P.1 Gaps (what the app did not say)

| # | gap | trace |
|---|---|---|
| G1 | Tax tagging (CO step) decides values the screen never shows (TDS section, GST / RCM type, ITC, TCS, e-invoice); the mock writes `account_tax_profile`. Pure approval here; no table | A3, A6, W9, D10, L13 |
| G2 | Whether tax tagging must finish before go-live is open in the app (Q8); the app waits for all steps, so does this spec. The task doc is silent too (D3) | N10 |
| G3 | Party kind (organization / person) is not on any screen | L20 |
| G4 | Where the "Handed over by" list comes from (app hard-codes FORM_FROM); spec reads hr persons by position. The task doc names the Procurement Officer for vendors (KR.GET), not who hands over a customer form | F27, KR.GET |
| G5 | Bank "· new" pill uses a fixed date (2026-09-15), no parameter, no owner | D7, T6 |
| G6 | **Half closed (rev 6):** usual vendor credit days are now the credit-days suggestion for a vendor (K7.FILL, D4). Usual customer credit days are still used by no rule: the task doc's T12 is silent | D1, D2 |
| G7 | Change requests (kind "change") are announced but not built; Udyam reminders therefore never stop through an action here. The task doc confirms these changes start T7, T12, T17 again (D8) | N12, N4, K7.TRG, K12.TRG, K17.TRG |
| G8 | Id numbering for P- and ACC- (mock: P- from 0140; ACC-{2200 / 1300}{count}) | D9 |
| G9 | GST portal and bank penny-drop service contracts (timeouts, errors) not in the app | P1, P2 |
| G10 | Udyam reminder: sent at Submit as in the app, to the form's address (`to_address`), since the party does not exist yet | N4, L8 |
| G11 | Escalation of the AM's own step goes to the AM (DF9): no real move up | DF1, DF9 |
| G12 | Static content (FLOW tile, callouts, Profile texts) has no data source | S7, S28, N9, N11 |
| G13 | Mock-only items with no backend: paper forms and "Type it all in for me", DEMO panel, Reset, clock ticks, toasts, Backend tab, deep links | F29, S20, S26, S29, B17, B18, B20–B22, D8, N5 |
| G14 | Where the "Who checks what" routes and the gate catalogue are stored (app: code) | S23, S24 |
| G15 | The task doc's credit-limit **recommendation** (Credit Controller → AE) has no record in the app: the AE types the limit from the paper form and Farid's step stands in. So "new limit differs from the recommendation" (K12.EXC) and the indicator "recommendations waiting" (IND-2) cannot be built | K12.SEE, K12.EXC, K12.IND |
| G16 | Who checks the Udyam status: the Compliance Officer, or does it only own the register built from it? (KQ8) | K17.ASK, KR.CHG8 |

### P.2 Defaults used

| DF | where |
|---|---|
| DF1 | approval_deadline_hours = 48, owner AM; ApprovalDeadlineReached → EscalateApproval |
| DF2 | notices to the maker on return (N1) and on activation (N2) |
| DF3 | all queries fresh as of now |
| DF4 | Discard sets `discarded`; the app's DELETE is not used |
| DF5 | reason required on return; none on approval |
| DF6 | any Accounts Executive may act on a draft. (The other half, "the maker may not decide", is no longer a default: the app (C35) and the task doc (NEV-1) both say it) |
| DF7 | currency default INR; determination book STAT |
| DF8 | owners of msmed_max_credit_days, penny_drop_pass_pct, gst_name_match_pct, udyam_reminder_days, usual_*_credit_days = AM |
| DF9 | escalation to the AM |
| DF10 | mock-only columns dropped: party.party_kind; party_location.kind ('registered'); party_contact.purpose ('primary'); party_account_request.kind ('onboard'); party_account_request.made_by (= created_by); accounting.account.type for party leaves; accounting.party.bank_details; party_account_change.checker_role (→ position); party.address.country; bank_verification.name_match_pct (→ detail.match_pct); party_tax_id.scheme |
| DF11 | KPI counts (S1–S4), the Tasks badge (S27) and the Tasks card (S30) = list query with count=true |
| DF12 | Save returns checks, never blocked by them |

### P.3 Renames (mock → spec)

| mock | spec |
|---|---|
| `/api/v1/legal-entities/LE-1/party-account-requests…` | `/api/v1/finance/party-account-requests…` (legal entity from session) |
| `/api/v1/workspaces/WS-1/parties/{id}`, `GET /parties?gstin=` | `GET /api/v1/party-master/parties/{id}` (GetParty), `GET /api/v1/party-master/parties?gstin=&pan=` (FindParty) |
| `PATCH …/{id} {party_id}` | `POST …/{id}/use-party` (UseParty) |
| `POST …/gstin-checks`, "GST portal: search GSTIN" | `POST …/{id}/check-gstin` → `finance.gstin_check` |
| `POST …/bank-verifications {penny_drop}`, "Bank penny-drop API" | `POST …/{id}/verify-bank-account` → `finance.bank_account_verification` (penny_drop) |
| `POST …/bank-verifications {call_back}` | recorded inside `POST …/{id}/submit` → `finance.bank_account_verification` (call_back) |
| `accounting_txn.party_account_request` | `finance.party_account_request` (draft_values → `values` + `origins`) |
| `accounting_txn.party_account_change`, `POST /party-account-changes/{id}/approve|return` | `platform.approval`, `POST …/party-account-requests/{id}/decide` |
| `accounting_txn.bank_verification` | `finance.bank_account_verification` |
| `DELETE …/{id}` | `POST …/{id}/discard` |
| `party_master.party_tax_id` (PAN, GSTIN rows) | `party_master.party.pan` + `party_master.party_gstin` |
| `party_master.party_location` | columns on `party_master.party` (address_line, city, state_code, pincode) |
| `party_master.party_contact` | `party_master.party` (contact_person, email) + `party_master.party_phone` |
| `party.created`, `party.role.added` | `PartyRegistered`, `PartyRoleAdded` |
| `POST /api/v1/gl/accounts (internal)`, `INSERT accounting.account` (leaf), `accounting.party` | `POST /api/v1/accounting/subledger-accounts` → `accounting.subledger_account` (not a GL account, §2.3 / §5.2) |
| `PUT …/ledger-profiles/{acc}`; `party_terms`, `party_classification`, `party_compliance_status`, `party_billing_instruction` | `finance.party_account` columns (credit_days, bill_by_bill, currency, category, related_party, msme_status, msme_category, udyam, sec43bh, po_rule, delivery, invoice_format) |
| `party_terms.credit_limit` | `finance.party_credit_limit` (versioned) |
| `accounting_txn.party_bank_account` (since / until) | `finance.party_bank_account` (valid_from / valid_to) |
| `finance.party_account.submitted / returned / activated / sent_back` | `PartyAccountRequestSubmitted` / `PartyAccountRequestReturned` / `PartyAccountRequestActivated` / `PartyAccountRequestSentBack` |
| `finance.party_bank.changed` | `PartyAccountRequestActivated.data.bank_account_added` |
| "Mail: Udyam reminder to the vendor" | `SendNotice` (to_address, email) by `notice-sending` on `PartyAccountRequestSubmitted` + timer `UdyamReminderDue` |
| actor "System" | automations `party-registration`, `subledger-opening`, `party-onboarding`, `notice-sending`, `approval-escalating` |
| status "pending" / label "Waiting" | approval state `requested` (display label) |
| request labels "Needs me", "With checkers", "Form returned" | states draft, submitted, sent_back (display labels) |
| Account `under` (header name) | `control_account_id` (displayed by name) |
| Account `accountId` (ACC-…) | `accounting.subledger_account.id` = `finance.party_account.subledger_account_id` |
| `request.from` (ActorKey) | `from_person_id`; role `enteredBy` / `formFrom` → `entered_by_person_id` / `form_from_person_id` |
| `VendorFinance.Save` (task doc T7) | `SavePartyAccountRequest` + `SubmitPartyAccountRequest` (payable) |
| `CustomerFinance.Save`, `CreditLimit.Edit` (task doc T12) | `SavePartyAccountRequest` + `SubmitPartyAccountRequest` (receivable); the limit lives in `finance.party_credit_limit` |
| `Udyam.Save` (task doc T17) | `SavePartyAccountRequest` (msmeStatus, msmeCategory, udyam) |
| "Business Core" (task doc) | `party_master` (input 4) |

### P.4 UNDECIDED (choices the method did not dictate)

1. UNDECIDED: penny-drop action verb and name: `VerifyBankAccount` (Check / Verify both allowed).
2. UNDECIDED: the penny-drop and call-back share one probe table `finance.bank_account_verification` with a `method` column, rather than one table per probe.
3. UNDECIDED: call-back number / person are stored as columns of `finance.party_bank_account` (bank block) as well as in the probe row.
4. UNDECIDED: keys inside `values`, `origins`, `covers`, `covered_values` are the app's field keys (camelCase), mapped to columns at activation.
5. UNDECIDED: `values.under` holds the control account id (bigint), shown by name; `accounting.account.id` is bigint (no app-shown id).
6. **Decided by the task doc (rev 6):** Save with a party key while a party is used is refused (`403 SAV-3`), not ignored: the role never edits a party in the master (KR.NEV, NEV-2).
7. UNDECIDED: CheckGstin is refused when a party is used (GST-4), following the hidden button.
8. UNDECIDED: notice receivers stored in `to_position` hold the person's id for the maker / form-from person (the column is named position).
9. UNDECIDED: N3 ("waiting on …" after a partial approval) is a notice on every non-last approval, inferred from the seed notice only.
10. UNDECIDED: Resubmit inserts a full round of steps, carrying unchanged approved ones as `approved` (instead of keeping old-round rows).
11. UNDECIDED: "Mark all read" = MarkNotice called once per unread notice (no bulk action).
12. UNDECIDED: `approved` (transient) is listed under "With checkers" in ListPartyAccountRequests.
13. UNDECIDED: child tables of party_master (`party_gstin`, `party_phone`, `party_role`) carry `workspace_id`; `party_role` carries `legal_entity_id`.
14. UNDECIDED: queries for S23 / S24 / S28 (`ListPartyAccountRequestGates`, `ListPartyAccountRequestRoutes`, `GetAuthority`) serve engine configuration; S7 gets no query.
15. UNDECIDED: the request's source id travels to party_master and accounting only in the action body / event data (`source`, `request_id`), not stored in their tables.
16. UNDECIDED: `"values"` must be quoted in SQL (reserved word); `"grant"` likewise.

**Determinism self-check (§7):** every inventory id is traced in A–P; every action has gates, principal, event, endpoint and commit list; every number is a parameter (D7 is a gap); every status word is a state or a display label; the kind is master with no accounting event. Rev 6: every task-doc fact has a result (B · K, U.1).

---


---

## Q. OpenAPI

| Item | Value |
|---|---|
| File | `case_engine/02_onboarding_openapi.yaml` (OpenAPI 3.1) |
| Operations | **35** = 16 actions + 19 queries; `operationId` = the action / query name |
| Shared parts | `Idempotency-Key` header on every action · `Error` body `{errors: [{gate, class, message, field?, send_back?, use_id?}]}` · `ActionResult` `{invocation_id, event_id, subject}` |
| Rules per action | `x-gates` on each action lists the gate ids it can return |
| Checked | The file parses as YAML and has one operation per row of N. Request bodies list property names only; their types are the DDL columns (M) |

---

## R. Rule tests (one per gate)

Every test uses the fake outside services (S.2). **Fail** = the call returns the code and gate id; nothing is written. **Pass** = the gate does not appear.

### R.1 Gate tests

| Gate | Action | Class | Pass case | Fail case | Fail returns |
|---|---|---|---|---|---|
| OPN-1 | OpenPartyAccountRequest | Input | side ∈ payable/receivable holds | side ∈ payable/receivable fails | 422 + `OPN-1` |
| OPN-2 | OpenPartyAccountRequest | Input | form_no non-blank holds | form_no non-blank fails | 422 + `OPN-2` |
| OPN-3 | OpenPartyAccountRequest | Input | from_person_id given holds | from_person_id given fails | 422 + `OPN-3` |
| OPN-4 | OpenPartyAccountRequest | Consistency | the from person's position is allowed for the side (payable: procurement_officer, contracts_services_procurement_officer; receivable: sales_executive) holds | the same fails | 422 + `OPN-4` |
| OPN-5 | OpenPartyAccountRequest | Authority | position AE holds | position AE fails | 403 + `OPN-5` |
| SAV-1 | SavePartyAccountRequest | State | draft / returned holds | draft / returned fails | 409 + `SAV-1` |
| SAV-2 | SavePartyAccountRequest | Authority | position AE holds | position AE fails | 403 + `SAV-2` |
| SAV-3 | SavePartyAccountRequest | Authority | no party key in the body while a party is used holds | a party key (e.g. legalName) sent while party_id is set fails | 403 + `SAV-3` |
| USE-1 | UseParty | State | draft / returned holds | draft / returned fails | 409 + `USE-1` |
| USE-2 | UseParty | Authority | AE holds | AE fails | 403 + `USE-2` |
| USE-3 | UseParty | Input | party_id exists in the master (GetParty) when not null holds | party_id exists in the master (GetParty) when not null fails | 422 + `USE-3` |
| GST-1 | CheckGstin | State | draft / returned holds | draft / returned fails | 409 + `GST-1` |
| GST-2 | CheckGstin | Authority | AE holds | AE fails | 403 + `GST-2` |
| GST-3 | CheckGstin | Input | GSTIN valid format holds | GSTIN valid format fails (C2) | 422 + `GST-3` |
| GST-4 | CheckGstin | Consistency | no party used (party_id null) holds | no party used (party_id null) fails | 422 + `GST-4` |
| BNK-1 | VerifyBankAccount | State | draft / returned holds | draft / returned fails | 409 + `BNK-1` |
| BNK-2 | VerifyBankAccount | Authority | AE holds | AE fails | 403 + `BNK-2` |
| BNK-3 | VerifyBankAccount | Input | side = payable holds | side = payable fails | 422 + `BNK-3` |
| BNK-4 | VerifyBankAccount | Input | bankAccountNo non-blank and IFSC valid holds | bankAccountNo non-blank and IFSC valid fails (C28) | 422 + `BNK-4` |
| SUB-01 | SubmitPartyAccountRequest | Input | PAN format holds | PAN format fails (C1) | 422 + `SUB-01` |
| SUB-02 | SubmitPartyAccountRequest | Input | GSTIN format holds | GSTIN format fails (C2) | 422 + `SUB-02` |
| SUB-03 | SubmitPartyAccountRequest | Consistency | GSTIN contains PAN holds | GSTIN contains PAN fails (C3) | 422 + `SUB-03` |
| SUB-04 | SubmitPartyAccountRequest | Consistency | state = state of GSTIN holds | state = state of GSTIN fails (C4) | 422 + `SUB-04` |
| SUB-05 | SubmitPartyAccountRequest | Input | PIN 6 digits holds | PIN 6 digits fails (C5) | 422 + `SUB-05` |
| SUB-06 | SubmitPartyAccountRequest | Probe | GSTIN checked holds | GSTIN checked fails (C7) | 422 + `SUB-06` |
| SUB-07 | SubmitPartyAccountRequest | Probe | GSTIN check is for the current GSTIN holds | GSTIN check is for the current GSTIN fails (C8) | 422 + `SUB-07` |
| SUB-08 | SubmitPartyAccountRequest | Probe | GSTIN not cancelled holds | GSTIN not cancelled fails (C9) | 422 + `SUB-08`, `send_back: true` |
| SUB-09 | SubmitPartyAccountRequest | Uniqueness | used party has no account on this side holds | used party has no account on this side fails (C13) | 422 + `SUB-09`, `send_back: true` |
| SUB-10 | SubmitPartyAccountRequest | Uniqueness | GSTIN's master party has no account on this side holds | GSTIN's master party has no account on this side fails (C16) | 422 + `SUB-10`, `send_back: true` |
| SUB-11 | SubmitPartyAccountRequest | Uniqueness | GSTIN not in the master unless that party is used holds | GSTIN not in the master unless that party is used fails (C17) | 422 + `SUB-11` |
| SUB-12 | SubmitPartyAccountRequest | Uniqueness | account name unique in the books (ListSubledgerAccounts) holds | account name unique in the books (ListSubledgerAccounts) fails (C19) | 422 + `SUB-12` |
| SUB-13 | SubmitPartyAccountRequest | Input | required / required-when fields filled holds | required / required-when fields filled fails (C20) | 422 + `SUB-13` |
| SUB-14 | SubmitPartyAccountRequest | Consistency | not (goods_non_msme and MSME yes) holds | not (goods_non_msme and MSME yes) fails (C21) | 422 + `SUB-14` |
| SUB-15 | SubmitPartyAccountRequest | Consistency | not (goods_msme and MSME no) holds | not (goods_msme and MSME no) fails (C22) | 422 + `SUB-15` |
| SUB-16 | SubmitPartyAccountRequest | Input | Udyam format holds | Udyam format fails (C25) | 422 + `SUB-16` |
| SUB-17 | SubmitPartyAccountRequest | Business | sec43bh yes ⇒ credit_days ≤ `msmed_max_credit_days` holds | sec43bh yes ⇒ credit_days ≤ `msmed_max_credit_days` fails (C26) | 422 + `SUB-17` |
| SUB-18 | SubmitPartyAccountRequest | Uniqueness | bank account not used by another party holds | bank account not used by another party fails (C27) | 422 + `SUB-18`, `send_back: true` |
| SUB-19 | SubmitPartyAccountRequest | Input | IFSC format holds | IFSC format fails (C28) | 422 + `SUB-19` |
| SUB-20 | SubmitPartyAccountRequest | Probe | penny-drop run holds | penny-drop run fails (C29) | 422 + `SUB-20` |
| SUB-21 | SubmitPartyAccountRequest | Probe | penny-drop is for the current account / IFSC holds | penny-drop is for the current account / IFSC fails (C30) | 422 + `SUB-21` |
| SUB-22 | SubmitPartyAccountRequest | Probe | call-back number not from the email holds | call-back number not from the email fails (C33) | 422 + `SUB-22` |
| SUB-23 | SubmitPartyAccountRequest | State | draft / returned holds | draft / returned fails | 409 + `SUB-23` |
| SUB-24 | SubmitPartyAccountRequest | Authority | AE holds | AE fails | 403 + `SUB-24` |
| SUB-25 | SubmitPartyAccountRequest | Consistency | category belongs to the side holds | category belongs to the side fails | 422 + `SUB-25` |
| SUB-26 | SubmitPartyAccountRequest | Consistency | `under` is an active control account for the side (§5.2) holds | `under` is an active control account for the side (§5.2) fails | 422 + `SUB-26` |
| SUB-27 | SubmitPartyAccountRequest | Input | call-back number is one of the run-time options holds | call-back number is one of the run-time options fails | 422 + `SUB-27` |
| DEC-1 | DecidePartyAccountRequest | State | request submitted and the step `requested` in the current round holds | request submitted and the step `requested` in the current round fails | 409 + `DEC-1` |
| DEC-2 | DecidePartyAccountRequest | Authority | caller holds the step's position holds | caller holds the step's position fails | 403 + `DEC-2` |
| DEC-3 | DecidePartyAccountRequest | Authority | caller is not the maker (DF6, C35) holds | caller is not the maker (DF6, C35) fails | 403 + `DEC-3` |
| DEC-4 | DecidePartyAccountRequest | Input | outcome ∈ approved / returned holds | outcome ∈ approved / returned fails | 422 + `DEC-4` |
| DEC-5 | DecidePartyAccountRequest | Input | reason required when returned (DF5, F30) holds | reason required when returned (DF5, F30) fails | 422 + `DEC-5` |
| SBK-1 | SendBackPartyAccountRequest | State | draft / returned holds | draft / returned fails | 409 + `SBK-1` |
| SBK-2 | SendBackPartyAccountRequest | Authority | AE holds | AE fails | 403 + `SBK-2` |
| SBK-3 | SendBackPartyAccountRequest | Input | reason non-blank holds | reason non-blank fails | 422 + `SBK-3` |
| DSC-1 | DiscardPartyAccountRequest | State | draft and round = 0 (never submitted) holds | draft and round = 0 (never submitted) fails | 409 + `DSC-1` |
| DSC-2 | DiscardPartyAccountRequest | Authority | AE holds | AE fails | 403 + `DSC-2` |
| REG-1 | RegisterParty | State | source request is `approved` (GetPartyAccountRequest) holds | source request is `approved` (GetPartyAccountRequest) fails | 409 + `REG-1` |
| REG-2 | RegisterParty | Uniqueness | GSTIN not in `party_gstin` (re-run of C16 / C17) holds | GSTIN not in `party_gstin` (re-run of C16 / C17) fails | 422 + `REG-2` |
| REG-3 | RegisterParty | Input | legal name, address, city, constitution, resident present holds | legal name, address, city, constitution, resident present fails | 422 + `REG-3` |
| REG-4 | RegisterParty | Authority | grant holds | grant fails | 403 + `REG-4` |
| ROL-1 | AddPartyRole | Input | party exists holds | party exists fails | 422 + `ROL-1` |
| ROL-2 | AddPartyRole | Uniqueness | no role of this type for this legal entity (re-run of C13) holds | no role of this type for this legal entity (re-run of C13) fails | 422 + `ROL-2` |
| ROL-3 | AddPartyRole | State | source request `approved` holds | source request `approved` fails | 409 + `ROL-3` |
| ROL-4 | AddPartyRole | Authority | grant holds | grant fails | 403 + `ROL-4` |
| SLA-1 | OpenSubledgerAccount | State | source request `approved` holds | source request `approved` fails | 409 + `SLA-1` |
| SLA-2 | OpenSubledgerAccount | Uniqueness | name unique per legal entity (re-run of C19) holds | name unique per legal entity (re-run of C19) fails | 422 + `SLA-2` |
| SLA-3 | OpenSubledgerAccount | Uniqueness | no active sub-ledger account for (party, AP / AR) (re-run of C13) holds | no active sub-ledger account for (party, AP / AR) (re-run of C13) fails | 422 + `SLA-3` |
| SLA-4 | OpenSubledgerAccount | Consistency | control account = determination (control, category, STAT) or an active control account for the side holds | control account = determination (control, category, STAT) or an active control account for the side fails | 422 + `SLA-4` |
| SLA-5 | OpenSubledgerAccount | Authority | grant holds | grant fails | 403 + `SLA-5` |
| ACT-1 | ActivatePartyAccountRequest | State | approved holds | approved fails | 409 + `ACT-1` |
| ACT-2 | ActivatePartyAccountRequest | Uniqueness | bank account not used by another party (re-run of C27) holds | bank account not used by another party (re-run of C27) fails | 422 + `ACT-2` |
| ACT-3 | ActivatePartyAccountRequest | Authority | grant holds | grant fails | 403 + `ACT-3` |
| NTC-1 | SendNotice | Input | a receiver (to_position or to_party_id) and channel holds | a receiver (to_position or to_party_id) and channel fails | 422 + `NTC-1` |
| NTC-2 | SendNotice | Authority | grant holds | grant fails | 403 + `NTC-2` |
| MRK-1 | MarkNotice | State | not yet read holds | not yet read fails | 409 + `MRK-1` |
| MRK-2 | MarkNotice | Authority | caller is the receiver holds | caller is the receiver fails | 403 + `MRK-2` |
| ESC-1 | EscalateApproval | State | approval `requested` and `deadline_at` passed holds | approval `requested` and `deadline_at` passed fails | 409 + `ESC-1` |
| ESC-2 | EscalateApproval | Authority | grant holds | grant fails | 403 + `ESC-2` |

**Warnings (8)** never block. Each test checks that the warning appears in `checks` and the call still succeeds: WRN-01 (C6) · WRN-02 (C10) · WRN-03 (C12) · WRN-04 (C18) · WRN-05 (C23) · WRN-06 (C24) · WRN-07 (C32) · WRN-08 (C34).

**Total:** 78 gate tests + 8 warning tests (R.1) + 5 refusal tests (R.2) = **91**.

### R.2 Refusal tests (task doc, U.3)

| Test | Refusal rule | Case | Expected |
|---|---|---|---|
| NEV-1 | The maker never approves its own work | Teja (AE, the maker) calls Decide on her own request's party step | 403 `DEC-3`; nothing written |
| NEV-2 | A party in the master is never edited here | After UseParty P-0088, PATCH `{values: {legalName: "Something else"}}` | 403 `SAV-3`; values unchanged |
| NEV-3 | Bank details never go live without the FC | (a) AM and CO approve, the FC step is still requested. (b) The FC approved in round 1, the request comes back, the AE changes the IFSC and resubmits | (a) no `party_bank_account` row, request stays `submitted`. (b) the bank step is `requested` again in round 2 |
| NEV-4 | A credit limit never goes live without the CC | (a) AM and CO approve, the CC step is still requested. (b) creditLimit changed after the CC approved, then resubmitted | (a) no `party_credit_limit` row. (b) the credit_limit step is `requested` again |
| NEV-5 | The Billing Executive never changes billing instructions | A billing_executive principal calls Save (poRule) and Decide | 403 `SAV-2` and `DEC-2`; GetPartyAccount works (read grant) |

**NEV-6** (C-07, "edit a vendor and then approve its voucher") cannot happen in this task. It is **declared** for the purchase voucher task (T1), which will read `finance.party_account.updated_by` and the request's `created_by` to refuse that approver.

---

## S. Failure handling and outside calls

### S.1 The activation chain

| Step | Runs as | If it fails | Who fixes | Then |
|---|---|---|---|---|
| Decide (last step) | the checker | Nothing written; the checker gets the error | the checker | Calls again |
| RegisterParty / AddPartyRole | `party-registration` | Retried 5× (DF13), then `failed`; request stays `approved`, held by `party-registration` | the Accounts Executive (party master queue): e.g. a GSTIN registered meanwhile (REG-2) | Retry continues from this step |
| OpenSubledgerAccount | `subledger-opening` | Same; the party exists already and is not undone | the Accounts Executive (accounting queue): e.g. name taken (SLA-2), no control account (SLA-4) | Retry continues from this step |
| ActivatePartyAccountRequest | `party-onboarding` | Same; the party and sub-ledger account stay | the Accounts Executive (finance queue): e.g. bank account now used elsewhere (ACT-2) | Retry, or a new action to correct; never a delete |
| Chain stuck > 2 h | — | Notice to the Accounts Manager (DF15) | — | — |
| SendNotice | `notice-sending` | Retried; a failed email does not change the request | the Accounts Executive | Retry |
| Approval past its deadline | `approval-escalating` | Step moves to the Accounts Manager (a step already with the AM: to the Finance Controller) | — | — |

### S.2 Outside services

| Service | Called by | Adapter in | Timeout · retry | If down | Audit | Fake for tests |
|---|---|---|---|---|---|---|
| GST portal (GSTIN search) | CheckGstin | `capabilities/finance` | 10 s · 2 retries on network error | `502`; no `gstin_check` row; request unchanged | masked request + response in `gstin_check.detail` | GSTIN starting `29ZZ` → cancelled; a GSTIN in the party master → its stored status; else active, name = legal name |
| Bank penny-drop (₹1 credit) | VerifyBankAccount | `capabilities/finance` | 10 s · 2 retries on network error | `502`; no verification row | masked in `bank_account_verification.detail` | account starting `7777` → name SRI RAMA ENTERPRISES (mismatch); else the legal name, 100% |
| Call-back | Submit (recorded) | — (a person calls) | — | — | number + person in the verification row | — |

Credentials for both services sit in the secret store, never in tables or code.

---

## T. Production readiness

| Item | Applied how | Open |
|---|---|---|
| **Sensitive columns (9)** | `party.pan` · `party.email` · `party_phone.phone` · `party_bank_account.bank_account_no` · `party_bank_account.call_back_number` · `party_account_request.values` (holds all of these while open) · `party_account_request.origins` · `gstin_check.detail` · `bank_account_verification.detail` | Aadhaar is not collected today |
| Encryption | The 9 columns are encrypted at rest | Key management choice |
| Masking | API shows the last 4 of PAN, bank account and phone, unless the caller's position has `view_sensitive` (Finance Controller for bank, Accounts Manager for PAN) | Who else gets `view_sensitive` |
| Access log | A full read writes `platform.access_log` | — |
| Monitoring | Per action: calls, time, failures by gate id. Per reaction: lag, failed runs. Per probe: time, errors, 502s. `invocation_id` in every log line | Dashboard tool |
| Performance | Action p95 < 500 ms without probes; list p95 < 300 ms (DF17) | Load test |
| Retention | receipt, trail, outbox, approval: 8 years · notices: 1 year · probe details: 8 years | Legal confirmation |
| Reference data | Seeded by migration (M.2); later changes through a mapping-change task approved by the Accounts Manager | That task is not built yet |
| Environments | Same 4 migrations in dev, test, production | — |

---

## U. Two sources: what the task doc added

### U.1 Results

**52 task-doc facts** (B · K): 24 confirm what the app already says · 11 differ (U.2) · 7 add something the app does not say · 3 are names (renamed) · 3 are gaps (G15, G16) · 2 open questions are answered · 2 are out of scope (change subjects).

What the 7 additions changed in the backend:

| Added | From | Where |
|---|---|---|
| Refusal rules NEV-1 … NEV-6, one new gate (SAV-3), 5 tests | KR.NEV, K7.RUL, K12.RUL, K12.EVD (C-13) | E, J, R.2, U.3 |
| Listeners: Billing Executive, Payables Executive, the CO's MSME register (not built) and their read grants | K12.SND, K17.HO, KR.HAND | F, I, J |
| Indicator IND-1 (vendor proposals waiting, by age) | K7.IND | I |

### U.2 Differences (app ↔ task doc)

| # | Fact | App says | Task doc says | Result |
|---|---|---|---|---|
| D1 | How a new party arrives | A paper form handed to the AE; nothing arrives in the system (input 5) | The Procurement Officer proposes a vendor; a customer is approved; the CC sends a recommendation (K7.TRG, K12.TRG, KR.GET) | **App** (and input 5). No event from Procurement or Sales |
| D2 | Party identity | The AE types it for a new party; locked when a party from the master is used (W10) | Identity is in Business Core and never edited by this role (K7.REQ, KR.NEV) | **App** for a new party. The doc's rule holds for a party in the master: SAV-3 (NEV-2) |
| D3 | Tax tagging step | A CO step for every request: "GST / TDS tagging", "GST / TCS tagging" (A3, A6) | The T7 and T12 hand-offs name only the AM, FC and CC | **App** (an extra checker). G2 stays open |
| D4 | Credit days pre-fill | Typed, blank at open (F13) | "Usual terms pre-filled" (K7.FILL) | **App** on the screen. The backend returns `suggestions.creditDays` for a vendor; the app may ignore it. G6 half closed |
| D5 | Credit-limit checking order | The CC and AM steps wait at once; the AM's block does not cover the limit (A4, A5) | The CC checks first, then the AM confirms (K12.HO) | **App** (parallel). To decide with the Accounts Manager |
| D6 | Subjects | One screen, one request: identity + finance + MSME, vendor or customer | Three tasks: T7 vendor fields · T12 customer fields · T17 Udyam data | **App**: one subject `party_account_request`; the doc's T17 merge question is answered |
| D7 | Action names | `SavePartyAccountRequest`, `SubmitPartyAccountRequest` … | `VendorFinance.Save`, `CustomerFinance.Save`, `CreditLimit.Edit`, `Udyam.Save` | **Method** names (01 §3.1); the doc's in P.3 |
| D8 | Changes to a live account | "A change opens a new request of kind 'change'" (N12, not built) | Terms, ledger, bank, limit or Udyam changes start T7, T12, T17 again; "can't send when the new limit equals the current one" | **Agreed:** a separate subject. Out of this output; G7 stays |

### U.3 Refusal rules (from "Never" and ❌)

| Id | Rule | From | How it holds here | Test |
|---|---|---|---|---|
| NEV-1 | The maker never approves its own work | KR.NEV | Gate DEC-3 (existing) | R.2 |
| NEV-2 | A party in the master is never edited here | KR.NEV, K7.REQ | **New gate SAV-3**: Save with a party key while a party is used → 403 | R.1 (SAV-3) + R.2 |
| NEV-3 | Bank details never go live without the FC | K7.RUL, KR.CHG10 | By the design: bank values reach `party_bank_account` only through Activate after the round's FC step is approved; a changed bank block is requested again (H.1) | R.2 |
| NEV-4 | A credit limit is never set alone, nor without the CC | KR.NEV, K12.RUL | By the design: the same, for `party_credit_limit` and the CC step | R.2 |
| NEV-5 | The Billing Executive never changes billing instructions | K12.SND, K12.EVD (C-13) | By the grants: a read grant only; any action → 403 | R.2 |
| NEV-6 | Whoever edits a vendor never approves its voucher | K7.RUL (C-07) | **Declared** for the purchase voucher task (T1): it reads `party_account.updated_by` and the request's `created_by` | in T1 |

The other 4 "Never" items (the three-way-match variance, IMS / RCM, issuing sales invoices, the netting rule) cannot happen in this task's actions.

### U.4 Open questions

| Q | Question | Result |
|---|---|---|
| KQ7 | Who does the bank-detail call-back? | **Answered by the app:** the AE records it (F21, F22); the FC checks it (A2) |
| KQ8 | Is T17 part of T7? Who checks the Udyam status? | First half **answered by the app** (one screen). Second half **open** (G16) |
| KQ12 | Does every "Checked by" go through one approval mechanism? | **Answered by the method:** `platform.approval` (01 D8) |

---

## What rev 4.2, rev 5 and rev 6 changed in this output

Run 2 left these choices open; rev 4.2 decided them, and they are applied above:
- **Events on a state move:** Decide publishes `PartyAccountRequestApproved` / `…Returned`; `…Decided` only when a step is approved and others are still open.
- **Code tables:** per-option facts move into `attributes jsonb`.
- **List tables:** the value column is named after the list (`gstin`, `phone`), plus `created_at`, `created_by_invocation`.
- **Notices:** the Udyam reminder goes at Submit, to `to_address` (as the app does).
- **Platform tables:** carry `legal_entity_id`.
- **DDL order:** `platform`, `party_master`, `accounting`, `finance`.
- **Escalation:** an Accounts Manager step escalates to the Finance Controller.
- **Already matching rev 4.2:** account name owned by `accounting` · `from_person_id` · ok checks returned · Submit without a body · state times on the request · any Accounts Executive may act.

**Still open:** 15 items in P.4 (rev 6 decided item 6), all small (naming inside the draft, quoting, query paths). None changes a table or an action.

**Rev 5 added:**
- **Table map (0.2):** 26 tables, each with its schema, code package and status: 11 NEW, 3 REPLACES, 11 SHARED, 1 EXISTS.
- **`platform.access_log`**, the 26th table.
- **Constraints and indexes (M.2).**
- **OpenAPI file (Q).**
- **One test per rule (R).**
- **Failure handling and outside calls (S).**
- **Production readiness (T).**
- **Error codes** fixed to match 01: `422` for a rule, `409` for a state or version conflict, `403`, `404`, `502`.

**Rev 6 added (the task doc as a second input, 01 input 19):**
- **52 task-doc facts (B · K)** from the T7, T12 and T17 cards and the role summary, each with a result.
- **8 differences (U.2)**, each with both texts and the result. The app wins on screen facts; the doc decides who may not do what.
- **6 refusal rules (U.3):**
  - one new gate (SAV-3);
  - one existing gate (DEC-3);
  - two that hold by the design;
  - one by grants;
  - one declared for the purchase voucher task.

  They add **5 refusal tests** (R.2). Rules are now 78 stop + 8 warnings; tests 91.
- **Indicator IND-1** (vendor proposals waiting, by age) as a measure on ListPartyAccountRequests; IND-2 is a gap.
- **Listeners and read grants** for the Billing Executive, the Payables Executive and the Compliance Officer's MSME register.
- **Gaps:** G6 half closed (the vendor credit-days suggestion); G15 and G16 new. **P.4 item 6** is decided by the doc.
- **App menu of 29-Oct** (Tasks · Rules · Forms): inventory locations updated; S30 added.
- **No table, endpoint, event or reaction was added.** The doc made the design more exact: who may not do what, who listens, what is measured.
