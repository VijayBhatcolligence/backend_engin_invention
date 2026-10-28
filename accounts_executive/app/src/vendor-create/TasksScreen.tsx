// Tasks: the executive's tasks as cards. For now one task, Create a vendor; its card opens the form.

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { ActionCard, PageHeader } from '../ui';
import { CreateVendorForm } from './CreateVendorForm';
import './vendor-create.css';

export function TasksScreen() {
  const [open, setOpen] = useState(false);
  if (open) return <CreateVendorForm onBack={() => setOpen(false)} />;
  return (
    <>
      <PageHeader title="Tasks" subtitle="Your tasks. Open one to start it." />
      <div className="card-grid">
        <ActionCard
          icon={UserPlus}
          accent="teal"
          title="Create a vendor"
          description="Type in the vendor form Procurement handed you, check the GSTIN and bank account, and send it for checking."
          code="Purchase"
          cadence="As needed · Make"
          onClick={() => setOpen(true)}
        />
      </div>
    </>
  );
}
