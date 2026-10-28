// Accounts Executive · onboarding only (03_party_onboarding_design.md). Same shell and UI kit as before;
// the menu now holds just this task, the lists it feeds, the checks, and the backend view.
// Tasks (../vendor-create/) holds the Create-a-vendor card, which opens a single form.

import { useEffect } from 'react';
import { Database, LayoutDashboard, ListChecks, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { fmtDateTime } from '../domain/dates';
import { AppShell, type ShellTabDef } from '../shell/AppShell';
import { Toaster } from '../ui';
import { ACTORS, ME } from './catalogue';
import { BackendScreen } from './screens/BackendScreen';
import { ChecksScreen } from './screens/ChecksScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { DemoPanel } from './screens/DemoPanel';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PartiesScreen } from './screens/PartiesScreen';
import { Profile } from './screens/Profile';
import { TasksScreen } from '../vendor-create/TasksScreen';
import { isMine, useOnboarding, type TabId } from './store';
import './onboarding.css';

const TABS: ShellTabDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'onboarding', label: 'Onboarding', icon: UserPlus, bleed: true },
  { id: 'parties', label: 'Vendors & customers', icon: Users },
  { id: 'checks', label: 'Checks', icon: ShieldCheck },
  { id: 'backend', label: 'Backend', icon: Database },
];

const TAB_IDS = TABS.map((t) => t.id);

export function App() {
  const s = useOnboarding();
  // Deep link: ?tab=onboarding&req=REQ-0101 opens that screen (handy for sharing a step of the walkthrough).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const tab = q.get('tab');
    if (tab && TAB_IDS.includes(tab)) useOnboarding.getState().navigate(tab as TabId, q.get('req'));
  }, []);
  return (
    <AppShell
      title={`${ACTORS[ME].role} · Onboarding`}
      tabDefs={TABS}
      user={{ name: ACTORS[ME].name, role: ACTORS[ME].role, place: 'HQ' }}
      clockLabel={fmtDateTime(s.now)}
      activeTab={s.nav.tab}
      onTabChange={(tab) => s.navigate(tab as TabId)}
      tabBadges={{ onboarding: s.requests.filter(isMine).length }}
      notifications={s.notices.map((n) => ({ id: n.id, tone: n.tone, title: n.title, body: n.body, time: fmtDateTime(n.at), read: n.read }))}
      onOpenNotification={s.openNotice}
      onMarkAllRead={s.markAllRead}
      onSeeAllNotifications={() => s.navigate('dashboard')}
      profile={<Profile />}
      tabs={{
        dashboard: <DashboardScreen />,
        tasks: <TasksScreen />,
        onboarding: <OnboardingScreen />,
        parties: <PartiesScreen />,
        checks: <ChecksScreen />,
        backend: <BackendScreen />,
      }}
    >
      <Toaster toasts={s.toasts} onDismiss={s.dismissToast} />
      <DemoPanel />
    </AppShell>
  );
}
