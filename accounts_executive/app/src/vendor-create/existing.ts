// Vendors already in the books, as far as the Create-a-vendor checks need them (mock).
// Used for the duplicate GSTIN, PAN, account-name and bank-account checks. Not the onboarding store.

export interface ExistingVendor {
  id: string;
  name: string;
  gstin: string | null;
  pan: string;
  bankAccount: string | null;
}

export const EXISTING_VENDORS: ExistingVendor[] = [
  { id: 'V-A', name: 'Vendor A', gstin: '29AAACV1001A1Z5', pan: 'AAACV1001A', bankAccount: '50100234560011' },
  { id: 'V-B', name: 'Vendor B', gstin: '29AAACV1002B1Z3', pan: 'AAACV1002B', bankAccount: '50100234560022' },
  { id: 'V-C', name: 'Vendor C', gstin: '29AAACV1003C1Z1', pan: 'AAACV1003C', bankAccount: '50100234567811' },
  { id: 'V-D', name: 'Vendor D', gstin: '29AAACV1004D1Z9', pan: 'AAACV1004D', bankAccount: '50100234560044' },
  { id: 'V-E', name: 'Vendor E', gstin: '29AAACV1005E1Z7', pan: 'AAACV1005E', bankAccount: '50100234560055' },
  { id: 'V-F', name: 'Vendor F', gstin: '29AAACV1006F1Z5', pan: 'AAACV1006F', bankAccount: '50100234560066' },
  { id: 'V-G', name: 'Vendor G', gstin: '24AAACV1007G1Z2', pan: 'AAACV1007G', bankAccount: '50100234560077' },
  { id: 'V-J', name: 'Vendor J', gstin: '32AAACV1009J1Z6', pan: 'AAACV1009J', bankAccount: '50100234560099' },
  { id: 'V-LT', name: 'Local trader (food colour)', gstin: null, pan: 'ABCPL1234T', bankAccount: null },
  { id: 'V-SM', name: 'Shakti Manpower', gstin: '29AAACS2001S1Z4', pan: 'AAACS2001S', bankAccount: '50100234561201' },
  { id: 'V-HB', name: 'Healthy Bite Foods (packing services)', gstin: '29AAJCH0000H1Z8', pan: 'AAJCH0000H', bankAccount: '50100234561301' },
];
