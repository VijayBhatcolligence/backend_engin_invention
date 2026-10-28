# Accounts Executive app: party onboarding only (mock)

The UX walkthrough for `../03_party_onboarding_design.md`. It covers one task, **setting up a new vendor or customer account**. It uses mock data only: there is no backend and no network calls.

```bash
npm run dev     # http://localhost:5174
npm test        # 11 flow tests (src/onboarding/flow.test.ts) + 10 Create-a-vendor rule tests (src/vendor-create/model.test.ts)
```

Deep links: `?tab=tasks` · `?tab=onboarding&req=REQ-0101` · `?tab=backend` · `?tab=parties` · `?tab=checks`

| Menu | What it shows |
|---|---|
| Dashboard | Needs me / With checkers / Activated / Vendors without Udyam, and how a new party reaches you |
| Tasks | One task card, **Create a vendor**. It opens a single form, nothing beside it: type the paper form in, GST portal check and penny-drop next to their fields, each problem under its field, Submit or Return the form. Its own rules and mock lookups (`src/vendor-create/`); it does not write to the Onboarding store, so a vendor created here does not appear under Vendors & customers |
| Onboarding | The task, full screen. Procurement / Sales hand over a **paper form**; you press **New from a paper form** and type everything in (decided 27-Oct). Left: the requests (collapsible). Optional DEMO paper beside the form to copy from. Middle: 1 Party details · 2 Finance details (all editable) · 3 Worked out by the system (state, constitution, header … edit only if wrong) · 4 tax tagging. GST portal check and penny-drop. If the GSTIN / PAN is already in the party master: use that party, or return the form. Right, full height: every field ✓ / missing, errors, warnings; Submit / Save draft / Return the form pinned |
| Vendors & customers | Every active party account. One party can have two accounts (Healthy Bite Foods) |
| Checks | The Stop / Warn rules, who checks which part, parameters |
| Backend | The API calls, events and table writes each click would make, and the tables as they stand now (party master `party_master.*` + finance) |

**Demo** (dashed violet): sample paper forms are picked in the New dialog; the bottom-left panel lists things to try and resets the demo. Checker decisions are played from the request itself ("Rajan approves" / "returns").

**Code:** `src/onboarding/` (types, catalogue, rules, seed, store, screens) · `src/vendor-create/` (the Tasks card, the form, its rules and tests). Shell, UI kit and styles are unchanged from the earlier app. The 23-task version is archived in `../archive/app-23-tasks-2026-10-26.zip`.
