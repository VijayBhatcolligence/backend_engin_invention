# Accounts Executive (R01) — owner: Vijay

Scope: reference roles §11.1–11.4 (Purchase, Inventory, Sales, AR/AP). Kept here until it moves to the role-app repo.

| # | File | What it is |
|---|---|---|
| 1 | `01_accounts_executive_tasks_and_responsibilities.md` | The work of the 4 areas read into **23 tasks** and **3 responsibilities**, a full card per task, "What you fill in", open questions. **Revised 26-Oct-2026** against the shared engine docs (`docs/shared_docs/engine_shared/`, Oct 1, 2026): see its §0 |
| 2 | `02_accounts_executive_designed_ui.md` | Each task's card mapped to the 5 app areas: Dashboard · Task · Reports · CnC · Rules. Revised to match doc 1 |
| 2b | `03_party_onboarding_design.md` | **Current focus (rev 27-Oct).** Customer / vendor onboarding, doc first: our own party master (`party_master.*`, P&C tables not used) vs Finance party account, trigger, fields, tables, APIs, events, checks, open questions |
| 2c | `04_task_to_backend_engine.md` | **New (27-Oct).** The method from a task card to its backend: the same card read into 9 engine words (context, entity, action, event, reaction, approval · timer, query, authority, history), steps, shapes by task type, a done-check, and onboarding as the worked example. Reference: `engine-concepts.pptx` |
| 2d | `05_customer_onboarding_engine_card.md` | **Worked example (27-Oct)** of doc 04: one task (set up a new customer) taken through all 9 steps: card → contexts, states, actions with gates, events, reactions, approvals, queries, authority, history → tables / API / events, plus one run (Coastal Bakes) call by call |
| 2e | `case_engine/01_one_box_engine.md` | **General method (27-Oct, proposal), replaces the first case-engine draft.** One Box, One Cycle: every change is a box (draft → submitted → posted · voided · reversed); only a posted box writes the Books (journal · registers · balances · periods); post rules are data. Grounded in ERPNext, SAP, Oracle SLA, Workday, TigerBeetle, Modern Treasury, Formance, Odoo, Fowler. Maps the deck's 9 words onto the box; one schema + one API for every seat |
| 2f | `case_engine/02_example_create_vendor.md` | **Example 1 (27-Oct)**: create a vendor (T7), a box that posts to registers only. The recipe step by step → the `new_vendor` box card with register post rules (no task code) → the Malnad run call by call → other endings (penny mismatch, bank reused, return, bank change, existing party) → vendor vs customer |
| 2g | `case_engine/03_example_purchase_voucher.md` | **Example 2 (27-Oct)**: a box that posts to the journal (T1, Malnad invoice). Card with post rules and account lookups → preview → posted entry Dr = Cr → reversal, debit note, closed period |
| 3 | `app/` | **Onboarding only (26-Oct)**: the UX walkthrough of doc 03, with a Backend tab showing the API calls, events and table writes. **Tasks** menu (28-Oct): a Create-a-vendor card that opens a single form. The 23-task version is in `archive/` |

**Next (not done):** agree the hand-offs and the one approval mechanism with the Accounts Manager (Manoj); interview the role holder; write `roles/finance/accounts-executive.md`.
