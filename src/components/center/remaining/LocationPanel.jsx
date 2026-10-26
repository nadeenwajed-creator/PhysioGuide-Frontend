import { Panel } from '../CenterUI.jsx';
import ClinicMap from '../ClinicMap.jsx';
import useCenter from '../useCenter.js';
import { hasSavedCenterLocation, centerMapLinks } from '../../../services/centerLocationService.js';

export default function LocationPanel() {
  const { data: { center }, tr } = useCenter();
  const links = hasSavedCenterLocation(center) ? centerMapLinks(center.coordinates) : null;
  return <Panel title={tr('location')} className="remaining-location center-profile__location">
    {links ? <>
      <ClinicMap coordinates={center.coordinates} />
      <a className="center-link" href={links.page} target="_blank" rel="noopener noreferrer">{tr('openMap')} ↗</a>
    </> : <>
      <p>{tr('remaining.missingLocation')}</p>
    </>}
  </Panel>;
}
