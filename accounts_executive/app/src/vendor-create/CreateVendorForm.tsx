// Create a vendor: one form, nothing else.
// The executive types the paper vendor form in, block by block. Each problem shows under the field
// it belongs to; one button at the bottom submits it for checking. Rules come from ./model.

import { useState, type ReactNode } from 'react';
import { BadgeCheck, CircleCheck, Landmark, Send, Undo2 } from 'lucide-react';
import { Button, Callout, Field, PageHeader, TextInput } from '../ui';
import { CATEGORIES, CHECKER_NAME, CHECKER_PART, derive, gstPortal, mustReturn, newRequest, PAPER, pennyDrop, penNeedsCallBack, REQUIRED, runChecks, stops, type Check, type Checker, type Typed, type VendorRequest } from './model';
import './vendor-create.css';

/** Which field each check belongs to, so its message shows under that field. */
const FIELD_OF: Record<string, keyof Typed> = {
  pan: 'pan', duppan: 'pan', pin: 'pin',
  gstin: 'gstin', gstpan: 'gstin', gstcheck: 'gstin', gstname: 'gstin', dupgst: 'gstin', nogst: 'gstin',
  state: 'stateOverride', dupname: 'accountNameOverride',
  udyam: 'udyam', msme: 'creditDays', msmeunk: 'msme',
  ifsc: 'ifsc', bankdup: 'bankAccount', penny: 'bankAccount',
};
const CHECKERS: Checker[] = ['rajan', 'usha', 'venkat'];
let count = 0;

export function CreateVendorForm({ onBack }: { onBack?: () => void } = {}) {
  const [req, setReq] = useState<VendorRequest>(() => newRequest(++count));
  const [tried, setTried] = useState(false);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');

  const t = req.typed;
  const d = derive(t);
  const checks = runChecks(req);
  const open = stops(checks);
  const done = req.stage !== 'draft';

  const set = (patch: Partial<Typed>) => setReq((r) => ({ ...r, typed: { ...r.typed, ...patch } }));
  const restart = () => {
    setReq(newRequest(++count));
    setTried(false);
    setReturning(false);
    setNote('');
  };
  const submit = () => {
    setTried(true);
    if (open.length) return;
    setReq((r) => ({ ...r, stage: 'submitted' }));
  };

  // messages under each field
  const byField: Partial<Record<keyof Typed, Check[]>> = {};
  for (const c of checks) {
    const k = FIELD_OF[c.id];
    if (k && c.level !== 'ok') (byField[k] ??= []).push(c);
  }
  const missing = new Set(REQUIRED.filter(([k]) => t[k] === '' || t[k] === null).map(([k]) => k));
  if (t.msme === 'yes' && !t.msmeCategory) missing.add('msmeCategory');
  if (t.msme === 'yes' && !t.udyam.trim()) missing.add('udyam');

  const error = (k: keyof Typed): string | null => {
    const stop = byField[k]?.find((c) => c.level === 'stop' || c.level === 'return');
    if (stop) return stop.title;
    return tried && missing.has(k) ? 'Required' : null;
  };
  const hint = (k: keyof Typed, base?: ReactNode): ReactNode => {
    const warn = byField[k]?.find((c) => c.level === 'warn');
    return warn ? <span className="vc-note vc-note--warn">{warn.title}</span> : base;
  };

  const text = (k: keyof Typed, label: string, o: { required?: boolean; hint?: string; upper?: boolean; digits?: boolean } = {}) => (
    <Field label={label} required={o.required} error={error(k)} hint={hint(k, o.hint)}>
      <TextInput
        value={String(t[k] ?? '')}
        onChange={(e) => set({ [k]: o.upper ? e.target.value.toUpperCase() : o.digits ? e.target.value.replace(/\D/g, '') : e.target.value } as Partial<Typed>)}
      />
    </Field>
  );
  const portal = req.gst && req.gst.gstin === t.gstin.trim().toUpperCase() ? req.gst : null;
  const penny = req.penny && req.penny.account === t.bankAccount.trim() && req.penny.ifsc === t.ifsc.trim().toUpperCase() ? req.penny : null;

  if (done) {
    return (
      <div className="vf">
        <PageHeader title="Create a vendor" onBack={onBack} />
        <div className="vf-card vf-done">
          {req.stage === 'submitted' ? (
            <>
              <CircleCheck size={28} className="vf-done__icon" aria-hidden />
              <h2 className="vf-done__title">{t.legalName} is sent for checking</h2>
              <p className="vf-done__text">The vendor is created once each checker approves their part. Until then no bill can be posted to it.</p>
              <ul className="vf-done__list">
                {CHECKERS.map((k) => (
                  <li key={k}>
                    <strong>{CHECKER_NAME[k]}</strong>: {CHECKER_PART[k].toLowerCase()}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <Undo2 size={28} className="vf-done__icon vf-done__icon--back" aria-hidden />
              <h2 className="vf-done__title">Form returned to Procurement</h2>
              <p className="vf-done__text">{req.sentBackNote}. No vendor was created.</p>
            </>
          )}
          <Button variant="primary" onClick={restart}>
            Create another vendor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="vf">
      <PageHeader
        title="Create a vendor"
        onBack={onBack}
        subtitle="Type in the vendor form Procurement handed you. The system checks as you go; the vendor is created once the checkers approve."
        actions={
          <span className="vf-demo">
            <span className="vf-demo__tag">DEMO</span>
            <Button size="sm" onClick={() => set(PAPER['PF-0412'])}>
              Fill from a sample form
            </Button>
          </span>
        }
      />

      <form className="vf-card" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <fieldset className="vf-block">
          <legend>Who the vendor is</legend>
          <div className="vf-grid">
            {text('legalName', 'Legal name', { required: true })}
            {text('tradeName', 'Trade name')}
            {text('pan', 'PAN', { required: true, upper: true })}
            <Field label="GSTIN" error={error('gstin')} hint={hint('gstin', portal ? <span className="vc-note vc-note--ok">GST portal: {portal.status.toLowerCase()} · {portal.name}</span> : 'Leave empty if the vendor is not registered')}>
              <div className="vc-inline">
                <TextInput value={t.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} />
                <Button size="sm" icon={BadgeCheck} disabled={!t.gstin.trim()} onClick={() => setReq((r) => ({ ...r, gst: gstPortal(r.typed.gstin) }))}>
                  Check
                </Button>
              </div>
            </Field>
            <div className="vc-span">{text('address', 'Address', { required: true })}</div>
            {text('city', 'City', { required: true })}
            {text('pin', 'PIN', { required: true, digits: true })}
            <Field label="State" error={error('stateOverride')} hint="Filled from the GSTIN">
              <TextInput value={d.state} onChange={(e) => set({ stateOverride: e.target.value.toUpperCase() })} />
            </Field>
            {text('contactPerson', 'Contact person')}
            {text('phone', 'Phone')}
            {text('email', 'Email')}
          </div>
        </fieldset>

        <fieldset className="vf-block">
          <legend>How we pay them</legend>
          <div className="vf-grid">
            <Field label="Category" required error={tried && missing.has('category') ? 'Required' : null} hint={d.header ? `Goes under ${d.header}` : 'What they supply'}>
              <select className="input" value={t.category} onChange={(e) => set({ category: e.target.value })}>
                <option value="">Choose…</option>
                {Object.keys(CATEGORIES).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Credit days" required error={error('creditDays')} hint={hint('creditDays')}>
              <TextInput type="number" min={0} value={t.creditDays} onChange={(e) => set({ creditDays: e.target.value === '' ? '' : Number(e.target.value) })} />
            </Field>
            <Field label="MSME?" required error={tried && missing.has('msme') ? 'Required' : null} hint={hint('msme')}>
              <select className="input" value={t.msme} onChange={(e) => set({ msme: e.target.value as Typed['msme'] })}>
                <option value="">Choose…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Asked, not known yet</option>
              </select>
            </Field>
            {t.msme === 'yes' && (
              <>
                <Field label="MSME category" required error={tried && missing.has('msmeCategory') ? 'Required' : null}>
                  <select className="input" value={t.msmeCategory} onChange={(e) => set({ msmeCategory: e.target.value as Typed['msmeCategory'] })}>
                    <option value="">Choose…</option>
                    <option>Micro</option>
                    <option>Small</option>
                    <option>Medium</option>
                  </select>
                </Field>
                {text('udyam', 'Udyam number', { required: true, upper: true, hint: 'UDYAM-KR-03-0012345' })}
              </>
            )}
            <Field label="Account name in the books" error={error('accountNameOverride')} hint="Filled from the trade or legal name">
              <TextInput value={d.accountName} onChange={(e) => set({ accountNameOverride: e.target.value })} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="vf-block">
          <legend>Bank account</legend>
          <div className="vf-grid">
            {text('bankAccount', 'Account number', { required: true, digits: true })}
            {text('ifsc', 'IFSC', { required: true, upper: true })}
            {text('beneficiary', 'Beneficiary name', { required: true, hint: 'As on the cancelled cheque' })}
            <Field label="Penny-drop" hint={penny ? <span className={`vc-note vc-note--${penny.holder ? 'ok' : 'bad'}`}>{penny.holder ? `Name at bank: ${penny.holder}` : 'The bank cannot find this account'}</span> : 'Confirms the name on the account'}>
              <div className="vc-inline">
                <Button size="sm" icon={Landmark} disabled={!t.bankAccount.trim() || !t.ifsc.trim()} onClick={() => setReq((r) => ({ ...r, penny: pennyDrop(r.typed.bankAccount, r.typed.ifsc) }))}>
                  Run the penny-drop
                </Button>
              </div>
            </Field>
          </div>
          {penNeedsCallBack(req) && (
            <div className="vc-callback">
              <p className="vc-callback__title">The name at the bank is different. Call the vendor and note it here.</p>
              <div className="vf-grid">
                {text('callBackWho', 'Who you called', { required: true })}
                {text('callBackNumber', 'Number you used', { required: true })}
                <Field label="Date" required>
                  <TextInput type="date" value={t.callBackOn} onChange={(e) => set({ callBackOn: e.target.value })} />
                </Field>
                <Field label=" ">
                  <label className="vc-check">
                    <input type="checkbox" checked={t.callBackSameEmail} onChange={(e) => set({ callBackSameEmail: e.target.checked })} /> The number came from the same email as the bank details
                  </label>
                </Field>
              </div>
            </div>
          )}
        </fieldset>

        {mustReturn(checks) && (
          <Callout tone="critical" title="This form cannot be set up">
            {checks.find((c) => c.level === 'return')?.detail} Return it to Procurement with a note.
          </Callout>
        )}

        <div className="vf-foot">
          {returning ? (
            <>
              <TextInput placeholder="Why you are returning the form" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button variant="destructive" icon={Undo2} disabled={!note.trim()} onClick={() => setReq((r) => ({ ...r, stage: 'sent-back', sentBackNote: note.trim() }))}>
                Return the form
              </Button>
              <Button variant="ghost" onClick={() => setReturning(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span className="vf-foot__note">{tried && open.length ? `${open.length} thing${open.length > 1 ? 's' : ''} to fix, marked in red above` : 'Goes to Rajan, Usha and Venkat for checking'}</span>
              <Button variant={mustReturn(checks) ? 'destructive' : 'ghost'} icon={Undo2} onClick={() => setReturning(true)}>
                Return the form
              </Button>
              <Button variant="primary" icon={Send} type="submit">
                Submit for checking
              </Button>
            </>
          )}
        </div>
        {tried && open.some((c) => !FIELD_OF[c.id] && c.id !== 'required') && (
          <ul className="vf-other">
            {open.filter((c) => !FIELD_OF[c.id] && c.id !== 'required').map((c) => (
              <li key={c.id}>{c.title}</li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}
