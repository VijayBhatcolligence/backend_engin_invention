// The mock backend. Every action records the API calls, events and table writes the real backend would make
// (Backend tab), so the UX walkthrough and the backend design can be read side by side. No network calls.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ToastItem } from '../ui';
import { ACTORS, ME, SIDE_LABEL, stateOfGstin } from './catalogue';
import { checksOf, follow, GSTIN_RE, isEmpty, mask, PARTY_KEYS, partyValues, routesFor, stops, suggestionsOf } from './rules';
import { newRequest, PAPERS, seedAccounts, seedLog, seedNotices, seedParties, seedRequests, START } from './seed';
import type { Account, ActorKey, Change, FieldValue, LogEntry, Notice, Party, Request, Side } from './types';

export type TabId = 'dashboard' | 'tasks' | 'onboarding' | 'parties' | 'checks' | 'backend';

interface Data {
  now: string;
  parties: Party[];
  accounts: Account[];
  requests: Request[];
  log: LogEntry[];
  notices: Notice[];
  nav: { tab: TabId; requestId: string | null };
}

interface State extends Data {
  toasts: ToastItem[];
  navigate: (tab: TabId, requestId?: string | null) => void;
  /** Opens a new request for a paper form on your desk. Returns its id. */
  createRequest: (o: { side: Side; from: ActorKey; formNo: string; paper?: string | null }) => string;
  setValue: (reqId: string, key: string, value: FieldValue) => void;
  useSuggestion: (reqId: string, key: string) => void;
  /** Mock only: types everything on the paper form for you. */
  typeFromPaper: (reqId: string) => void;
  useParty: (reqId: string, partyId: string) => void;
  unlinkParty: (reqId: string) => void;
  saveDraft: (reqId: string) => void;
  checkGstin: (reqId: string) => void;
  runPennyDrop: (reqId: string) => void;
  submit: (reqId: string) => void;
  decide: (reqId: string, changeId: string, approve: boolean, reason?: string) => void;
  sendBack: (reqId: string, reason: string) => void;
  discard: (reqId: string) => void;
  openNotice: (id: string) => void;
  markAllRead: () => void;
  dismissToast: (id: number) => void;
  reset: () => void;
}

function initial(): Data {
  const accounts = seedAccounts();
  return {
    now: START,
    parties: seedParties(),
    accounts,
    requests: seedRequests(accounts),
    log: seedLog(),
    notices: seedNotices(),
    nav: { tab: 'dashboard', requestId: null },
  };
}

/** Advance the scenario clock by some minutes. */
function tick(now: string, mins: number): string {
  const d = new Date(Date.parse(`${now}:00Z`) + mins * 60_000);
  return d.toISOString().slice(0, 16);
}

let toastId = 1;

export const partyOf = (s: Pick<Data, 'parties'>, partyId: string | null) => (partyId ? s.parties.find((p) => p.partyId === partyId) ?? null : null);
export const requestOf = (s: Pick<Data, 'requests'>, id: string | null) => s.requests.find((r) => r.id === id) ?? null;
/** The name to show for a request: what was typed, else the form number. */
export const titleOf = (r: Request) => (isEmpty(r.values.legalName) ? `New ${SIDE_LABEL[r.side].toLowerCase()} · form ${r.formNo}` : String(r.values.legalName));

/** In Needs me: the maker has the next move. */
export const isMine = (r: Request) => r.status === 'draft' || r.status === 'returned';
export const isWithOthers = (r: Request) => r.status === 'submitted';

const API = '/api/v1/legal-entities/LE-1';
const PM = '/api/v1/workspaces/WS-1';

const nextNo = (ids: string[], prefix: string, start: number) => Math.max(start, ...ids.filter((x) => x.startsWith(prefix)).map((x) => Number(x.slice(prefix.length)) || 0)) + 1;

export const useOnboarding = create<State>()(
  persist(
    immer((set, get) => {
      const log = (s: Data, kind: LogEntry['kind'], actor: ActorKey, line: string, detail?: string) => {
        s.log.push({ id: (s.log[s.log.length - 1]?.id ?? 0) + 1, at: s.now, kind, actor, line, detail });
      };
      const notice = (s: Data, n: Omit<Notice, 'id' | 'at' | 'read'>) => {
        s.notices.unshift({ ...n, id: `N-${s.notices.length + 1}-${s.now}`, at: s.now, read: false });
      };
      const toast = (s: State, t: Omit<ToastItem, 'id'>) => {
        s.toasts.push({ ...t, id: toastId++ });
      };

      return {
        ...initial(),
        toasts: [],

        navigate: (tab, requestId) =>
          set((s) => {
            s.nav.tab = tab;
            if (requestId !== undefined) s.nav.requestId = requestId;
          }),

        createRequest: ({ side, from, formNo, paper }) => {
          const id = `REQ-${String(nextNo(get().requests.map((r) => r.id), 'REQ-', 101)).padStart(4, '0')}`;
          set((s) => {
            s.now = tick(s.now, 5);
            const r = newRequest({ id, side, from, formNo, at: s.now, paper: paper ?? undefined }, s.accounts);
            s.requests.push(r);
            s.nav = { tab: 'onboarding', requestId: id };
            log(s, 'api', ME, `POST ${API}/party-account-requests`, `{side: ${side}, kind: onboard, form_no: ${formNo}, form_from: ${ACTORS[from].name}} → 201 ${id}`);
            log(s, 'db', 'system', 'INSERT accounting_txn.party_account_request', `${id} · draft · party_id NULL (a new party unless you use one from the master)`);
          });
          return id;
        },

        setValue: (reqId, key, value) =>
          set((s) => {
            const r = requestOf(s, reqId);
            if (!r || !isMine(r)) return;
            if (r.partyId && PARTY_KEYS.includes(key)) return; // from the master: change it there
            const before = suggestionsOf(r, s.accounts);
            r.values[key] = value;
            r.dirty = true;
            follow(r, before, s.accounts);
            if (key === 'msmeStatus' && value !== 'yes') {
              r.values.msmeCategory = '';
              r.values.udyam = '';
            }
          }),

        useSuggestion: (reqId, key) => {
          const r = requestOf(get(), reqId);
          const sug = r && suggestionsOf(r, get().accounts)[key];
          if (sug) get().setValue(reqId, key, sug.value);
        },

        typeFromPaper: (reqId) => {
          const r = requestOf(get(), reqId);
          const paper = r?.paper ? PAPERS[r.paper] : null;
          if (!r || !paper) return;
          for (const [k, v] of Object.entries(paper.values)) {
            if (r.partyId && PARTY_KEYS.includes(k)) continue;
            get().setValue(reqId, k, v);
          }
        },

        useParty: (reqId, partyId) =>
          set((s) => {
            const r = requestOf(s, reqId);
            const p = partyOf(s, partyId);
            if (!r || !p || !isMine(r)) return;
            const before = suggestionsOf(r, s.accounts);
            r.partyId = partyId;
            Object.assign(r.values, partyValues(p));
            const g = p.gstins[0];
            r.gstCheck = g ? { status: g.status, nameAtGst: p.legalName.toUpperCase(), at: s.now, forValue: g.value } : undefined;
            follow(r, before, s.accounts);
            r.dirty = true;
            r.history.push({ at: s.now, by: ME, text: `Used party ${p.partyId} ${p.legalName} from the master (no new party)` });
            log(s, 'api', ME, `GET ${PM}/parties/${p.partyId}`, 'party details from the master');
            log(s, 'api', ME, `PATCH ${API}/party-account-requests/${r.id}`, `{party_id: ${p.partyId}}: use the existing party`);
            toast(s, { tone: 'info', title: `Using ${p.partyId} ${p.legalName}`, body: 'Party details now come from the master and are locked here.' });
          }),

        unlinkParty: (reqId) =>
          set((s) => {
            const r = requestOf(s, reqId);
            if (!r || !isMine(r)) return;
            r.history.push({ at: s.now, by: ME, text: `Stopped using party ${r.partyId}: a new party will be created` });
            r.partyId = null;
            r.dirty = true;
          }),

        saveDraft: (reqId) =>
          set((s) => {
            const r = requestOf(s, reqId);
            if (!r) return;
            s.now = tick(s.now, 1);
            log(s, 'api', ME, `PATCH ${API}/party-account-requests/${r.id}`, 'draft values saved · checks re-run and returned');
            log(s, 'db', 'system', 'UPDATE accounting_txn.party_account_request', `${r.id} · draft_values`);
            r.dirty = false;
            toast(s, { tone: 'success', title: 'Draft saved', body: 'Nothing is sent to a checker until you submit.' });
          }),

        checkGstin: (reqId) =>
          set((s) => {
            const r = requestOf(s, reqId);
            if (!r) return;
            const gstin = String(r.values.gstin ?? '');
            if (!GSTIN_RE.test(gstin)) return;
            s.now = tick(s.now, 1);
            // Mock GST portal: a GSTIN starting 29ZZ is cancelled; one in the master keeps its status.
            const known = s.parties.flatMap((p) => p.gstins.map((g) => ({ g, p }))).find((x) => x.g.value === gstin);
            const status = gstin.slice(2, 4) === 'ZZ' ? 'cancelled' : known?.g.status ?? 'active';
            const nameAtGst = (known?.p.legalName ?? String(r.values.legalName ?? '')).toUpperCase();
            r.gstCheck = { status, nameAtGst, at: s.now, forValue: gstin };
            r.history.push({ at: s.now, by: 'gst', text: `GSTIN ${gstin} ${status}: ${nameAtGst}` });
            log(s, 'api', ME, `POST ${API}/party-account-requests/${r.id}/gstin-checks`, `{gstin: ${gstin}}`);
            log(s, 'api', 'gst', `GST portal: search GSTIN ${gstin}`, `${status} · ${nameAtGst} · state ${stateOfGstin(gstin) ?? '?'}`);
            toast(s, status === 'active' ? { tone: 'success', title: 'GSTIN active', body: nameAtGst } : { tone: 'critical', title: `GSTIN ${status}`, body: nameAtGst });
          }),

        runPennyDrop: (reqId) =>
          set((s) => {
            const r = requestOf(s, reqId);
            if (!r) return;
            const legal = String(r.values.legalName ?? '');
            const acct = String(r.values.bankAccountNo ?? '');
            const ifsc = String(r.values.ifsc ?? '');
            s.now = tick(s.now, 2);
            // Mock bank: an account starting 7777 belongs to someone else.
            const nameAtBank = acct.startsWith('7777') ? 'SRI RAMA ENTERPRISES' : legal.toUpperCase();
            const words = new Set(legal.toUpperCase().split(/\s+/));
            const hit = nameAtBank.split(/\s+/).filter((w) => words.has(w)).length;
            const matchPct = Math.round((hit / Math.max(words.size, 1)) * 100);
            r.pennyDrop = { result: matchPct >= 80 ? 'pass' : 'name_mismatch', nameAtBank, matchPct, at: s.now, forKey: `${acct}|${ifsc}` };
            r.history.push({ at: s.now, by: 'bank', text: `Penny-drop ${r.pennyDrop.result === 'pass' ? 'passed' : 'name mismatch'}: ${nameAtBank} (${matchPct}%)` });
            log(s, 'api', ME, `POST ${API}/party-account-requests/${r.id}/bank-verifications`, `{method: penny_drop, account: ${mask(acct)}, ifsc: ${ifsc}}`);
            log(s, 'api', 'bank', 'Bank penny-drop API (₹1 credit)', `name at bank: ${nameAtBank} · match ${matchPct}%`);
            log(s, 'db', 'system', 'INSERT accounting_txn.bank_verification', `penny_drop · ${r.pennyDrop.result}`);
            toast(s, r.pennyDrop.result === 'pass' ? { tone: 'success', title: 'Penny-drop passed', body: `${nameAtBank} · ${matchPct}% name match` } : { tone: 'warning', title: 'Name at the bank does not match', body: `${nameAtBank}. Do a call-back before you submit.` });
          }),

        submit: (reqId) =>
          set((s) => {
            const r = requestOf(s, reqId);
            if (!r || !isMine(r)) return;
            if (stops(checksOf(r, s)).length) return;
            s.now = tick(s.now, 2);
            if (r.dirty) log(s, 'api', ME, `PATCH ${API}/party-account-requests/${r.id}`, 'last draft values');
            if (r.pennyDrop?.result === 'name_mismatch') {
              log(s, 'api', ME, `POST ${API}/party-account-requests/${r.id}/bank-verifications`, `{method: call_back, number: ${r.values.callBackNumber}, person: ${r.values.callBackPerson}}`);
              log(s, 'db', 'system', 'INSERT accounting_txn.bank_verification', 'call_back · pass');
            }
            log(s, 'api', ME, `POST ${API}/party-account-requests/${r.id}/submit`, 'all Stop checks clear');
            const resubmit = r.status === 'returned';
            const changes: Change[] = routesFor(r.side).map((route, i) => {
              const after = Object.fromEntries(route.keys.map((k) => [k, r.values[k] ?? null]));
              const prev = r.changes.find((c) => c.block === route.block);
              const same = prev && JSON.stringify(prev.after) === JSON.stringify(after);
              if (prev && prev.status === 'approved' && (same || route.keys.length === 0)) return prev;
              return { id: `CHG-${r.id.slice(4)}-${i + 1}${resubmit ? 'b' : ''}`, block: route.block, label: route.label, checker: route.checker, status: 'pending', after };
            });
            const fresh = changes.filter((c) => c.status === 'pending');
            r.changes = changes;
            r.status = 'submitted';
            r.submittedAt = s.now;
            r.returnedReason = undefined;
            r.dirty = false;
            log(s, 'db', 'system', `INSERT accounting_txn.party_account_change ×${fresh.length}`, fresh.map((c) => `${c.block} → ${ACTORS[c.checker].name}`).join(' · '));
            log(s, 'event', 'system', 'finance.party_account.submitted', `${r.id} → ${fresh.map((c) => ACTORS[c.checker].name).join(', ')}`);
            if (r.side === 'payable' && (r.values.msmeStatus === 'unknown' || (r.values.msmeStatus === 'yes' && isEmpty(r.values.udyam)))) {
              log(s, 'api', 'system', 'Mail: Udyam reminder to the vendor', `${r.values.email || r.values.phone} · reminder again in 7 days`);
            }
            r.history.push({ at: s.now, by: ME, text: `${resubmit ? 'Resubmitted' : 'Submitted'}: ${fresh.map((c) => `${c.label.toLowerCase()} to ${ACTORS[c.checker].name}`).join(' · ')}` });
            toast(s, { tone: 'success', title: `Sent to ${fresh.map((c) => ACTORS[c.checker].name).join(', ')}`, body: 'It is now under "With checkers". You are told when it is active or returned.' });
          }),

        decide: (reqId, changeId, approve, reason) =>
          set((s) => {
            const r = requestOf(s, reqId);
            const c = r?.changes.find((x) => x.id === changeId);
            if (!r || !c || c.status !== 'pending') return;
            s.now = tick(s.now, 15);
            c.status = approve ? 'approved' : 'returned';
            c.decidedAt = s.now;
            c.reason = reason;
            log(s, 'api', c.checker, `POST ${API}/party-account-changes/${c.id}/${approve ? 'approve' : 'return'}`, approve ? undefined : `reason: ${reason}`);
            log(s, 'db', 'system', 'UPDATE accounting_txn.party_account_change', `${c.id} · ${c.status} by ${ACTORS[c.checker].name}`);
            r.history.push({ at: s.now, by: c.checker, text: `${approve ? 'Approved' : 'Returned'}: ${c.label.toLowerCase()}${reason ? ` · "${reason}"` : ''}` });

            if (!approve) {
              r.status = 'returned';
              r.returnedReason = `${ACTORS[c.checker].name}: ${reason}`;
              log(s, 'event', 'system', 'finance.party_account.returned', `${r.id} → back to the Accounts Executive`);
              notice(s, { tone: 'critical', title: `Returned by ${ACTORS[c.checker].name}: ${titleOf(r)}`, body: reason ?? '', requestId: r.id });
              return;
            }
            if (r.changes.some((x) => x.status !== 'approved')) return;

            // Every part approved. 1) The party master: a new party, or a new role on the one you used.
            const v = r.values;
            const role = { type: r.side === 'payable' ? ('supplier' as const) : ('customer' as const), since: s.now.slice(0, 10), enteredBy: ME, formFrom: r.from, formNo: r.formNo };
            let p = partyOf(s, r.partyId);
            if (!p) {
              const partyId = `P-${String(nextNo(s.parties.map((x) => x.partyId), 'P-', 140)).padStart(4, '0')}`;
              const created: Party = {
                partyId,
                kind: 'organization',
                legalName: String(v.legalName),
                tradeName: isEmpty(v.tradeName) ? undefined : String(v.tradeName),
                pan: isEmpty(v.pan) ? null : String(v.pan),
                gstins: isEmpty(v.gstin) ? [] : [{ value: String(v.gstin), stateCode: String(v.state), status: r.gstCheck?.status ?? 'active' }],
                address: { line: String(v.addressLine ?? ''), city: String(v.city ?? ''), stateCode: String(v.state ?? ''), pincode: String(v.pincode ?? ''), country: v.resident === 'non_resident' ? '' : 'IN' },
                contactPerson: isEmpty(v.contactPerson) ? undefined : String(v.contactPerson),
                email: isEmpty(v.email) ? undefined : String(v.email),
                phones: isEmpty(v.phone) ? [] : [String(v.phone)],
                roles: [],
              };
              s.parties.push(created);
              p = s.parties[s.parties.length - 1];
              r.partyId = partyId;
              log(s, 'db', 'system', 'INSERT party_master.party', `${partyId} · ${created.legalName}`);
              log(s, 'db', 'system', `INSERT party_master.party_tax_id ×${(created.pan ? 1 : 0) + created.gstins.length}`, [created.pan && `PAN ${created.pan}`, ...created.gstins.map((g) => `GSTIN ${g.value} (${g.status})`)].filter(Boolean).join(' · '));
              log(s, 'db', 'system', 'INSERT party_master.party_location · party_contact', `${created.address.city} · ${created.phones[0] ?? ''}${created.email ? ` · ${created.email}` : ''}`);
              log(s, 'event', 'system', 'party.created', `${partyId} ${created.legalName}`);
            }
            p.roles.push(role);
            log(s, 'db', 'system', 'INSERT party_master.party_role', `${p.partyId} · ${role.type} · form ${r.formNo} from ${ACTORS[r.from].name}`);
            log(s, 'event', 'system', 'party.role.added', `${p.partyId} · ${role.type}`);

            // 2) The party account: the GL account and the finance tables, in one go.
            const accountId = `ACC-${r.side === 'payable' ? 2200 : 1300}${s.accounts.length}`;
            const acct: Account = {
              accountId,
              partyId: p.partyId,
              side: r.side,
              name: String(v.accountName),
              under: String(v.under),
              category: String(v.category),
              creditDays: isEmpty(v.creditDays) ? null : Number(v.creditDays),
              creditLimit: isEmpty(v.creditLimit) ? null : Number(v.creditLimit),
              msme: r.side === 'payable' ? (v.msmeStatus as Account['msme']) : null,
              msmeCategory: r.side === 'payable' ? String(v.msmeCategory ?? '') || null : null,
              udyam: isEmpty(v.udyam) ? null : String(v.udyam),
              sec43bh: r.side === 'payable' ? v.sec43bh === 'yes' : null,
              bankAccountNo: isEmpty(v.bankAccountNo) ? undefined : String(v.bankAccountNo),
              bankLast4: isEmpty(v.bankAccountNo) ? null : String(v.bankAccountNo).slice(-4),
              bankSince: isEmpty(v.bankAccountNo) ? null : s.now.slice(0, 10),
              activatedAt: s.now.slice(0, 10),
              requestId: r.id,
            };
            s.accounts.push(acct);
            r.status = 'active';
            r.activatedAt = s.now;
            r.accountId = accountId;
            log(s, 'api', 'system', 'POST /api/v1/gl/accounts (internal)', `{name: "${acct.name}", parent: "${acct.under}", is_postable: true} → ${accountId}`);
            log(s, 'db', 'system', 'INSERT accounting.account', `${accountId} · leaf under ${acct.under}`);
            log(s, 'db', 'system', 'INSERT accounting.party', `{account_id: ${accountId}, party_id: ${p.partyId}} · name / GSTIN not copied: read from the party master`);
            log(s, 'api', 'system', `PUT ${API}/ledger-profiles/${accountId} (internal)`, 'party_terms · party_classification · party_compliance_status · account_tax_profile');
            log(s, 'db', 'system', 'UPSERT accounting_txn.party_terms / party_classification / party_compliance_status / account_tax_profile');
            if (acct.bankLast4) log(s, 'db', 'system', 'INSERT accounting_txn.party_bank_account', `${mask(String(v.bankAccountNo))} · since ${acct.bankSince}`);
            if (r.side === 'receivable') log(s, 'db', 'system', 'INSERT accounting_txn.party_billing_instruction', `${v.poRule} · ${v.delivery}`);
            log(s, 'db', 'system', 'UPDATE accounting_txn.party_account_request', `${r.id} · active · party_id ${p.partyId} · account_id ${accountId}`);
            log(s, 'event', 'system', 'finance.party_account.activated', `${accountId} · ${SIDE_LABEL[r.side].toLowerCase()} · ${r.side === 'payable' ? 'Purchase can post vouchers; Payables gets the MSME clock' : 'Sales can confirm orders; Billing reads the instructions'}`);
            if (acct.bankLast4) log(s, 'event', 'system', 'finance.party_bank.changed', `${accountId} · flag "new bank details" on the next payment proposal`);
            r.history.push({ at: s.now, by: 'system', text: `Active: party ${p.partyId}, account ${accountId} under ${acct.under}` });
            notice(s, { tone: 'success', title: `${SIDE_LABEL[r.side]} active: ${p.legalName}`, body: `${accountId} under ${acct.under}. ${r.side === 'payable' ? 'Purchase can now post vouchers to it.' : 'Sales can now confirm orders.'}`, requestId: r.id });
          }),

        sendBack: (reqId, reason) =>
          set((s) => {
            const r = requestOf(s, reqId);
            if (!r || !isMine(r)) return;
            s.now = tick(s.now, 2);
            r.status = 'sent_back';
            r.sentBack = { to: r.from, reason, at: s.now };
            r.history.push({ at: s.now, by: ME, text: `Form returned to ${ACTORS[r.from].name}: "${reason}"` });
            log(s, 'api', ME, `POST ${API}/party-account-requests/${r.id}/send-back`, `{to: ${ACTORS[r.from].role}, reason: "${reason}"}`);
            log(s, 'db', 'system', 'UPDATE accounting_txn.party_account_request', `${r.id} · sent_back · no party, no account created`);
            log(s, 'event', 'system', 'finance.party_account.sent_back', `${r.id} → ${ACTORS[r.from].name} (${ACTORS[r.from].role}): form ${r.formNo} returned`);
            toast(s, { tone: 'info', title: `Form returned to ${ACTORS[r.from].name}`, body: 'Nothing is created. It is in Done with your comment.' });
          }),

        discard: (reqId) =>
          set((s) => {
            const r = requestOf(s, reqId);
            if (!r || r.status !== 'draft' || r.submittedAt) return;
            s.requests = s.requests.filter((x) => x.id !== reqId);
            s.nav.requestId = null;
            log(s, 'api', ME, `DELETE ${API}/party-account-requests/${reqId}`, 'draft opened by mistake');
          }),

        openNotice: (id) =>
          set((s) => {
            const n = s.notices.find((x) => x.id === id);
            if (!n) return;
            n.read = true;
            if (n.requestId) {
              s.nav.tab = 'onboarding';
              s.nav.requestId = n.requestId;
            }
          }),

        markAllRead: () =>
          set((s) => {
            s.notices.forEach((n) => (n.read = true));
          }),

        dismissToast: (id) =>
          set((s) => {
            s.toasts = s.toasts.filter((t) => t.id !== id);
          }),

        reset: () =>
          set((s) => {
            Object.assign(s, initial());
            s.toasts = [];
          }),
      };
    }),
    {
      name: 'aikyat-ae-onboarding-v3',
      partialize: (s) => ({ now: s.now, parties: s.parties, accounts: s.accounts, requests: s.requests, log: s.log, notices: s.notices, nav: s.nav }),
    },
  ),
);
