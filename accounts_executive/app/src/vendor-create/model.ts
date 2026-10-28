// Create a vendor.
// Pure data and rules for this one task; no UI. Mock data from the biscuit-plant scenario.
//
// The task in one line: Procurement hands the Accounts Executive a paper vendor form. The executive
// types everything in (party details, finance details, MSME / Udyam, bank), checks the GSTIN on the
// GST portal and runs the penny-drop. The system works out what it can (state, constitution,
// account name, header, 43B(h)) and checks the rest. The checkers each approve their own part;
// when all are approved the vendor exists and bills can be posted to it.
// Rules follow backend_engin_invention/accounts_executive/03_party_onboarding_design.md (§3, §6).

import { EXISTING_VENDORS as seedVendors } from './existing';

export type Stage = 'draft' | 'submitted' | 'sent-back' | 'active';
export type Level = 'stop' | 'return' | 'warn' | 'ok';
export type Checker = 'rajan' | 'usha' | 'venkat';
export type PartState = 'pending' | 'approved';

export interface Typed {
  legalName: string;
  tradeName: string;
  pan: string;
  gstin: string;
  address: string;
  city: string;
  pin: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  related: '' | 'yes' | 'no';
  creditDays: number | '';
  msme: '' | 'yes' | 'no' | 'unknown';
  msmeCategory: '' | 'Micro' | 'Small' | 'Medium';
  udyam: string;
  bankAccount: string;
  ifsc: string;
  beneficiary: string;
  callBackWho: string;
  callBackNumber: string;
  callBackOn: string;
  callBackSameEmail: boolean;
  /** Worked-out values the executive has changed. */
  stateOverride: string;
  constitutionOverride: string;
  accountNameOverride: string;
}

export interface GstCheck {
  gstin: string;
  status: 'Active' | 'Suspended' | 'Cancelled' | 'Not found';
  name: string | null;
}
export interface PennyCheck {
  account: string;
  ifsc: string;
  holder: string | null;
}

export interface VendorRequest {
  id: string;
  formNo: string;
  handedBy: string;
  handedOn: string;
  typed: Typed;
  gst: GstCheck | null;
  penny: PennyCheck | null;
  stage: Stage;
  parts: Record<Checker, PartState>;
  vendorId: string | null;
  sentBackNote: string | null;
  history: { at: string; who: string; what: string }[];
}

export interface Check {
  id: string;
  level: Level;
  title: string;
  detail?: string;
}

export const MSME_MAX_DAYS = 45;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PIN = /^\d{6}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UDYAM = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

export const CHECKER_NAME: Record<Checker, string> = { rajan: 'Rajan (Accounts Manager)', usha: 'Usha (Finance Controller)', venkat: 'Venkat (Compliance Officer)' };
export const CHECKER_PART: Record<Checker, string> = {
  rajan: 'Party details against the scanned form, account, terms and MSME',
  usha: 'Bank details, with the penny-drop and call-back evidence',
  venkat: 'GST and TDS tagging',
};

// ---------- what the system works out ----------

export const CATEGORIES: Record<string, { header: string; sec43bh: boolean; tds: string }> = {
  'Raw material supplier': { header: 'Sundry Creditors – Raw material', sec43bh: true, tds: '194Q (goods, above the purchase threshold)' },
  'Packing material supplier': { header: 'Sundry Creditors – Packing material', sec43bh: true, tds: '194Q (goods, above the purchase threshold)' },
  'Service provider / contractor': { header: 'Sundry Creditors – Services', sec43bh: true, tds: '194C (contract) or 194J (professional)' },
  Transporter: { header: 'Sundry Creditors – Services', sec43bh: true, tds: '194C' },
  Landlord: { header: 'Sundry Creditors – Services', sec43bh: false, tds: '194I (rent)' },
};

const STATES: Record<string, string> = { '29': 'KA', '33': 'TN', '24': 'GJ', '32': 'KL', '27': 'MH', '36': 'TS', '07': 'DL', '19': 'WB' };
const CONSTITUTION: Record<string, string> = { C: 'Company', F: 'Firm', P: 'Individual', H: 'HUF', A: 'Association of persons', T: 'Trust', G: 'Government', B: 'Body of individuals', L: 'Local authority', J: 'Artificial juridical person' };

export interface Derived {
  state: string;
  constitution: string;
  resident: string;
  accountName: string;
  header: string;
  billByBill: string;
  sec43bh: boolean | null;
  tds: string;
}

export function derive(t: Typed): Derived {
  const gstin = t.gstin.trim().toUpperCase();
  const pan = t.pan.trim().toUpperCase();
  const cat = CATEGORIES[t.category];
  const state = STATES[gstin.slice(0, 2)] ?? '';
  const constitution = CONSTITUTION[pan[3] ?? ''] ?? '';
  const msmeYes = t.msme === 'yes';
  return {
    state: t.stateOverride || state,
    constitution: t.constitutionOverride || constitution,
    resident: pan || gstin ? 'Resident' : '',
    accountName: t.accountNameOverride || t.tradeName.trim() || t.legalName.trim(),
    header: cat?.header ?? '',
    billByBill: 'Yes',
    sec43bh: !cat ? null : msmeYes ? cat.sec43bh : false,
    tds: cat?.tds ?? '',
  };
}

// ---------- the outside world (mock) ----------

const norm = (s: string) => s.toUpperCase().replace(/\(.*?\)/g, '').replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

const GST_PORTAL: Record<string, Omit<GstCheck, 'gstin'>> = {
  '29AAHFM0000A1Z5': { status: 'Active', name: 'MALNAD COCOA TRADERS' },
  '29AABCS1111C1Z2': { status: 'Cancelled', name: 'SUNRISE PACKERS PRIVATE LIMITED' },
  '33AABCT2222D1Z7': { status: 'Suspended', name: 'TEAM PACK SOLUTIONS' },
  '29AAACV1001A1Z5': { status: 'Active', name: 'VENDOR A' },
};
for (const v of seedVendors) if (v.gstin && !GST_PORTAL[v.gstin]) GST_PORTAL[v.gstin] = { status: 'Active', name: v.name.toUpperCase() };

export function gstPortal(gstin: string): GstCheck {
  const g = gstin.trim().toUpperCase();
  return { gstin: g, ...(GST_PORTAL[g] ?? { status: 'Not found', name: null }) };
}

const BANK: Record<string, string> = {
  '50100777000111': 'MALNAD COCOA TRADERS',
  '50100777000222': 'M C TRADERS PRIVATE LIMITED',
  '50100555000444': 'SUNRISE PACKERS PRIVATE LIMITED',
  '50100666000555': 'TEAM PACK SOLUTIONS',
};
for (const v of seedVendors) if (v.bankAccount) BANK[v.bankAccount] = v.name.toUpperCase();

export function pennyDrop(account: string, ifsc: string): PennyCheck {
  return { account: account.trim(), ifsc: ifsc.trim().toUpperCase(), holder: BANK[account.trim()] ?? null };
}

// ---------- the paper forms (mock): what is written on them, to copy from ----------

const blank = (): Typed => ({
  legalName: '', tradeName: '', pan: '', gstin: '', address: '', city: '', pin: '', contactPerson: '', phone: '', email: '',
  category: '', related: '', creditDays: '', msme: '', msmeCategory: '', udyam: '', bankAccount: '', ifsc: '', beneficiary: '',
  callBackWho: '', callBackNumber: '', callBackOn: '', callBackSameEmail: false, stateOverride: '', constitutionOverride: '', accountNameOverride: '',
});

export const PAPER: Record<string, Partial<Typed>> = {
  'PF-0412': {
    legalName: 'Malnad Cocoa Traders', tradeName: 'Malnad Cocoa Traders', pan: 'AAHFM0000A', gstin: '29AAHFM0000A1Z5',
    address: '14, APMC Yard, Hassan Road', city: 'Chikkamagaluru', pin: '577101', contactPerson: 'Mr Gowda', phone: '+91 98450 00000', email: 'accounts@malnadcocoa.example',
    category: 'Raw material supplier', related: 'no', creditDays: 45, msme: 'yes', msmeCategory: 'Micro', udyam: 'UDYAM-KR-03-0012345',
    bankAccount: '50100777000111', ifsc: 'HDFC0001234', beneficiary: 'Malnad Cocoa Traders',
  },
  'PF-0413': {
    legalName: 'Sunrise Packers Private Limited', tradeName: 'Sunrise Packers', pan: 'AABCS1111C', gstin: '29AABCS1111C1Z2',
    address: '7, Peenya 2nd Stage', city: 'Bengaluru', pin: '560058', contactPerson: 'Ms Rao', phone: '+91 98450 11111', email: 'sales@sunrisepackers.example',
    category: 'Packing material supplier', related: 'no', creditDays: 30, msme: 'no', bankAccount: '50100555000444', ifsc: 'ICIC0004321', beneficiary: 'Sunrise Packers Private Limited',
  },
  'PF-0414': {
    legalName: 'Vendor A', tradeName: 'Vendor A', pan: 'AAACV1001A', gstin: '29AAACV1001A1Z5',
    address: '3, Industrial Area', city: 'Mysuru', pin: '570016', contactPerson: 'Mr Nair', phone: '+91 98450 22222', email: 'a@vendora.example',
    category: 'Raw material supplier', related: 'no', creditDays: 45, msme: 'no', bankAccount: '50100234560011', ifsc: 'HDFC0001234', beneficiary: 'Vendor A',
  },
};

export const PAPER_SHOWS: Record<string, string> = {
  'PF-0412': 'Malnad Cocoa Traders · GSTIN 29AAHFM0000A1Z5 · PAN AAHFM0000A · cocoa powder · Net 45 · Udyam UDYAM-KR-03-0012345 (Micro) · cheque: 50100777000111, HDFC0001234',
  'PF-0413': 'Sunrise Packers Private Limited · GSTIN 29AABCS1111C1Z2 (cancelled on the portal) · laminate and cartons · Net 30',
  'PF-0414': 'Vendor A · GSTIN 29AAACV1001A1Z5 · maida · Net 45 (already our vendor)',
};

export const DEMO_BANK: { label: string; account: string; ifsc: string }[] = [
  { label: 'Name at bank differs', account: '50100777000222', ifsc: 'HDFC0001234' },
  { label: 'Account used by Vendor C', account: '50100234567811', ifsc: 'ICIC0004321' },
];

const seed = (id: string, formNo: string, handedBy: string, on: string): VendorRequest => ({
  id, formNo, handedBy, handedOn: on, typed: blank(), gst: null, penny: null, stage: 'draft',
  parts: { rajan: 'pending', usha: 'pending', venkat: 'pending' }, vendorId: null, sentBackNote: null,
  history: [{ at: `${on} 10:00`, who: handedBy.split(' (')[0], what: 'Handed over the paper vendor form with GST certificate, PAN, cancelled cheque and quotation' }],
});

export function seedRequests(): VendorRequest[] {
  return [seed('PF-0412', 'PF-0412', 'Ravi (Procurement Officer)', '2026-10-07'), seed('PF-0413', 'PF-0413', 'Ravi (Procurement Officer)', '2026-10-08'), seed('PF-0414', 'PF-0414', 'Ravi (Procurement Officer)', '2026-10-08')];
}

export function newRequest(n: number): VendorRequest {
  return seed(`NEW-${n}`, `PF-${String(420 + n).padStart(4, '0')}`, 'Ravi (Procurement Officer)', '2026-10-08');
}

// ---------- the checks ----------

export const REQUIRED: [keyof Typed, string][] = [
  ['legalName', 'legal name'], ['pan', 'PAN'], ['address', 'address'], ['city', 'city'], ['pin', 'PIN'], ['category', 'category'],
  ['creditDays', 'credit days'], ['msme', 'MSME answer'], ['bankAccount', 'bank account'], ['ifsc', 'IFSC'], ['beneficiary', 'beneficiary name'],
];

const filled = (v: unknown) => v !== '' && v !== null && v !== undefined;

export function runChecks(r: VendorRequest): Check[] {
  const t = r.typed;
  const d = derive(t);
  const out: Check[] = [];
  const pan = t.pan.trim().toUpperCase();
  const gstin = t.gstin.trim().toUpperCase();

  const missing = REQUIRED.filter(([k]) => !filled(t[k])).map(([, l]) => l);
  if (t.msme === 'yes' && !t.msmeCategory) missing.push('MSME category');
  if (t.msme === 'yes' && !t.udyam.trim()) missing.push('Udyam number');
  if (missing.length) out.push({ id: 'required', level: 'stop', title: `Still to enter: ${missing.join(', ')}` });

  // party identifiers
  if (pan && !PAN.test(pan)) out.push({ id: 'pan', level: 'stop', title: 'PAN is not in the right format', detail: '5 letters, 4 digits, 1 letter.' });
  if (t.pin && !PIN.test(t.pin.trim())) out.push({ id: 'pin', level: 'stop', title: 'PIN is not in the right format', detail: '6 digits.' });
  if (!gstin) {
    if (pan) out.push({ id: 'nogst', level: 'warn', title: 'No GSTIN: unregistered party', detail: 'Reverse charge may apply and there is no input tax credit.' });
  } else if (!GSTIN.test(gstin)) out.push({ id: 'gstin', level: 'stop', title: 'GSTIN is not in the right format' });
  else {
    if (pan && gstin.slice(2, 12) !== pan) out.push({ id: 'gstpan', level: 'stop', title: 'GSTIN does not contain the PAN', detail: 'Characters 3 to 12 of the GSTIN are the PAN. One of the two is copied wrong.' });
    const stateFromGst = STATES[gstin.slice(0, 2)];
    if (t.stateOverride && stateFromGst && t.stateOverride !== stateFromGst) out.push({ id: 'state', level: 'stop', title: `State ${t.stateOverride} does not match the GSTIN (${stateFromGst})`, detail: 'The state decides IGST or CGST + SGST.' });
    if (!r.gst || r.gst.gstin !== gstin) out.push({ id: 'gstcheck', level: 'stop', title: r.gst ? 'GSTIN changed after the portal check: check it again' : 'Check the GSTIN on the GST portal' });
    else if (r.gst.status === 'Cancelled') out.push({ id: 'gstcheck', level: 'return', title: 'GSTIN is cancelled on the GST portal', detail: 'Invoicing a cancelled GSTIN is a compliance failure. Return the form to Procurement.' });
    else if (r.gst.status === 'Not found') out.push({ id: 'gstcheck', level: 'stop', title: 'The GST portal has no such GSTIN' });
    else {
      out.push({ id: 'gstcheck', level: r.gst.status === 'Suspended' ? 'warn' : 'ok', title: `GST portal: ${r.gst.status.toLowerCase()}, registered to ${r.gst.name}` });
      if (r.gst.name && t.legalName.trim() && norm(r.gst.name) !== norm(t.legalName)) out.push({ id: 'gstname', level: 'warn', title: `Name on the portal is "${r.gst.name}", you typed "${t.legalName.trim()}"`, detail: 'Use the name on the portal unless the form says otherwise.' });
    }
  }

  // already in the master?
  const sameGst = gstin ? seedVendors.find((v) => v.gstin === gstin) : undefined;
  if (sameGst) out.push({ id: 'dupgst', level: 'return', title: `GSTIN already belongs to ${sameGst.name}, already our vendor`, detail: 'Already set up: nothing new to create. Return the form to Procurement.' });
  else if (pan) {
    const samePan = seedVendors.find((v) => v.pan === pan);
    if (samePan) out.push({ id: 'duppan', level: 'warn', title: `Same PAN as ${samePan.name}, different GSTIN`, detail: 'Can be right: one company with another state registration.' });
  }
  const sameName = d.accountName && seedVendors.find((v) => norm(v.name) === norm(d.accountName));
  if (sameName && !sameGst) out.push({ id: 'dupname', level: 'stop', title: `The account name "${d.accountName}" is already used in the books`, detail: 'Change the account name below.' });

  // terms and MSME
  if (t.msme === 'yes' && t.udyam.trim() && !UDYAM.test(t.udyam.trim().toUpperCase())) out.push({ id: 'udyam', level: 'stop', title: 'Udyam number format is not valid', detail: 'UDYAM-<state>-<2 digits>-<7 digits>.' });
  if (t.msme === 'yes' && d.sec43bh && typeof t.creditDays === 'number' && t.creditDays > MSME_MAX_DAYS) out.push({ id: 'msme', level: 'stop', title: `More than ${MSME_MAX_DAYS} days for an MSME vendor`, detail: 'MSMED Act and section 43B(h).' });
  else if (t.msme === 'yes' && d.sec43bh) out.push({ id: 'msme', level: 'warn', title: `MSME (${t.msmeCategory || 'category not chosen'}): pay within ${MSME_MAX_DAYS} days of acceptance` });
  if (t.msme === 'unknown') out.push({ id: 'msmeunk', level: 'warn', title: 'MSME answer unknown: a reminder goes to the vendor', detail: 'Unknown is not the same as no.' });

  // bank
  const acct = t.bankAccount.trim();
  const ifsc = t.ifsc.trim().toUpperCase();
  if (ifsc && !IFSC.test(ifsc)) out.push({ id: 'ifsc', level: 'stop', title: `IFSC ${ifsc} is not valid`, detail: '4 letters, 0, then 6 letters or digits.' });
  else if (acct && ifsc) {
    const other = seedVendors.find((v) => v.bankAccount === acct);
    if (other) out.push({ id: 'bankdup', level: 'return', title: `Bank account already used by ${other.name}`, detail: 'The same account on two parties is not allowed. Send the form back.' });
    else if (!r.penny || r.penny.account !== acct || r.penny.ifsc !== ifsc) out.push({ id: 'penny', level: 'stop', title: r.penny ? 'Bank details changed after the penny-drop: run it again' : 'Run the penny-drop' });
    else if (!r.penny.holder) out.push({ id: 'penny', level: 'stop', title: 'Penny-drop failed: the bank cannot find this account' });
    else {
      const matches = norm(r.penny.holder) === norm(t.legalName) || norm(r.penny.holder) === norm(t.beneficiary);
      if (matches) out.push({ id: 'penny', level: 'ok', title: `Penny-drop: name at bank ${r.penny.holder}, matches` });
      else if (t.callBackSameEmail) out.push({ id: 'penny', level: 'stop', title: `Name at bank "${r.penny.holder}" differs, and the call-back number came from the same email as the bank details`, detail: 'The classic fraud pattern. Use a number from somewhere else.' });
      else if (t.callBackWho.trim() && t.callBackNumber.trim() && t.callBackOn) out.push({ id: 'penny', level: 'warn', title: `Name at bank "${r.penny.holder}" differs: confirmed by call-back to ${t.callBackWho.trim()}` });
      else out.push({ id: 'penny', level: 'stop', title: `Name at bank "${r.penny.holder}" does not match, and there is no call-back`, detail: 'The Finance Controller approves only after penny-drop or call-back verification. Enter who you called, the number and the date.' });
    }
  }

  return out;
}

export const stops = (c: Check[]) => c.filter((x) => x.level === 'stop' || x.level === 'return');
export const mustReturn = (c: Check[]) => c.some((x) => x.level === 'return');
export const penNeedsCallBack = (r: VendorRequest) => !!r.penny?.holder && norm(r.penny.holder) !== norm(r.typed.legalName) && norm(r.penny.holder) !== norm(r.typed.beneficiary);

export const allApproved = (r: VendorRequest) => (Object.values(r.parts) as PartState[]).every((p) => p === 'approved');
