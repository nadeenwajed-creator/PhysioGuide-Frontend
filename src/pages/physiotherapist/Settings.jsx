import { PageHeader, Panel } from '../../components/center/CenterUI.jsx';
import NotificationPreferences from '../../components/center/remaining/NotificationPreferences.jsx';
import useCenter from '../../components/center/useCenter.js';
import '../../components/center/remaining/RemainingUI.css';

// Therapist settings: the notification switches that drive the navbar bell.
// The therapist profile itself is read-only and lives on its own page.
export default function Settings() {
  const { tr } = useCenter();
  return (
    <div className="center-remaining center-settings">
      <PageHeader title={tr('settings')} description={tr('settingsDescription')} />
      <Panel title={tr('remaining.section.notifications')}>
        <NotificationPreferences />
      </Panel>
    </div>
  );
}
