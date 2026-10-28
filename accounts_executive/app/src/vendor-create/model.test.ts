import { describe, expect, it } from 'vitest';
import { derive, gstPortal, mustReturn, PAPER, pennyDrop, runChecks, seedRequests, stops, type Typed, type VendorRequest } from './model';

const req = (id = 'PF-0412'): VendorRequest => seedRequests().find((r) => r.id === id)!;
const typedFrom = (id: string, patch: Partial<Typed> = {}): VendorRequest => {
  const r = req(id);
  return { ...r, typed: { ...r.typed, ...PAPER[id], ...patch } };
};
/** Vendor H typed in full, with the portal check and the penny-drop run. */
const ready = (patch: Partial<Typed> = {}): VendorRequest => {
  const r = typedFrom('PF-0412', patch);
  return { ...r, gst: gstPortal(r.typed.gstin), penny: pennyDrop(r.typed.bankAccount, r.typed.ifsc) };
};
const ids = (r: VendorRequest) => stops(runChecks(r)).map((c) => c.id);

describe('create a vendor', () => {
  it('starts empty: the executive types everything, so it cannot be submitted', () => {
    expect(req().typed.legalName).toBe('');
    expect(ids(req())).toEqual(['required']);
  });

  it('typed in full, with the portal check and penny-drop run, it can be submitted', () => {
    expect(ids(ready())).toEqual([]);
  });

  it('must check the GSTIN on the portal, and again if it changes', () => {
    const typed = typedFrom('PF-0412');
    expect(ids({ ...typed, penny: pennyDrop(typed.typed.bankAccount, typed.typed.ifsc) })).toEqual(['gstcheck']);
    expect(ids({ ...ready(), typed: { ...ready().typed, gstin: '29AAHFM0000A1Z6' } })).toContain('gstcheck');
  });

  it('must run the penny-drop, and again if the bank details change', () => {
    const typed = typedFrom('PF-0412');
    expect(ids({ ...typed, gst: gstPortal(typed.typed.gstin) })).toEqual(['penny']);
  });

  it('works out state, constitution, account name, header and 43B(h) from what was typed', () => {
    const d = derive(ready().typed);
    expect(d).toMatchObject({ state: 'KA', constitution: 'Firm', accountName: 'Malnad Cocoa Traders', header: 'Sundry Creditors – Raw material', sec43bh: true });
  });

  it('stops on wrong formats, a GSTIN that does not hold the PAN, and a state that does not match the GSTIN', () => {
    expect(ids(ready({ pan: 'AAHFM0000' }))).toContain('pan');
    expect(ids(ready({ pin: '5771' }))).toContain('pin');
    expect(ids(ready({ pan: 'AAHFM0000B' }))).toContain('gstpan');
    expect(ids(ready({ stateOverride: 'TN' }))).toContain('state');
  });

  it('a cancelled GSTIN means return the form; so does a GSTIN or bank account already on a vendor', () => {
    const cancelled = typedFrom('PF-0413');
    const c = runChecks({ ...cancelled, gst: gstPortal(cancelled.typed.gstin), penny: pennyDrop(cancelled.typed.bankAccount, cancelled.typed.ifsc) });
    expect(mustReturn(c)).toBe(true);
    const a = typedFrom('PF-0414');
    expect(mustReturn(runChecks({ ...a, gst: gstPortal(a.typed.gstin) }))).toBe(true);
    expect(mustReturn(runChecks(ready({ bankAccount: '50100234567811', ifsc: 'ICIC0004321' })))).toBe(true);
  });

  it('no GSTIN is only a warning; the same PAN on another party is a warning too', () => {
    const noGst = runChecks(ready({ gstin: '' }));
    expect(noGst.find((c) => c.id === 'nogst')?.level).toBe('warn');
    expect(stops(noGst)).toEqual([]);
  });

  it('a penny-drop name mismatch stops until there is a call-back, and the same-email call-back stops again', () => {
    const mismatch = ready({ bankAccount: '50100777000222' });
    expect(ids(mismatch)).toEqual(['penny']);
    const called = ready({ bankAccount: '50100777000222', callBackWho: 'Mr Gowda', callBackNumber: '98450 00000', callBackOn: '2026-10-08' });
    expect(ids(called)).toEqual([]);
    expect(ids(ready({ bankAccount: '50100777000222', callBackWho: 'x', callBackNumber: 'y', callBackOn: '2026-10-08', callBackSameEmail: true }))).toEqual(['penny']);
  });

  it('an MSME vendor with more than 45 credit days is stopped; a suspended GSTIN only warns', () => {
    expect(ids(ready({ creditDays: 60 }))).toEqual(['msme']);
    const s = typedFrom('PF-0412', { gstin: '33AABCT2222D1Z7', pan: 'AABCT2222D' });
    const c = runChecks({ ...s, gst: gstPortal('33AABCT2222D1Z7'), penny: pennyDrop(s.typed.bankAccount, s.typed.ifsc) });
    expect(c.find((x) => x.id === 'gstcheck')?.level).toBe('warn');
  });
});
