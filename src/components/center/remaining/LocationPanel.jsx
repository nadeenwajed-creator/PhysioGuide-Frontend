import { useState } from 'react';
import Button from '../../shared/Button/Button.jsx';
import { Panel } from '../CenterUI.jsx';
import useCenter from '../useCenter.js';
import { validCoordinates, centerMapLinks } from '../../../services/centerLocationService.js';

export default function LocationPanel() {
  const { data: { center }, tr } = useCenter();
  const [loadedFor, setLoadedFor] = useState('');
  const valid = validCoordinates(center.coordinates);
  const confirmed = valid && center.locationConfirmed === true;
  const key = valid ? `${center.coordinates.latitude},${center.coordinates.longitude}` : '';
  const links = confirmed ? centerMapLinks(center.coordinates) : null;
  return <Panel title={tr('location')} className="remaining-location">
    {confirmed ? <>
      <p>{tr('remaining.confirmedLocation')}</p>
      <p className="remaining-coordinates"><bdi>{center.coordinates.latitude.toFixed(6)}, {center.coordinates.longitude.toFixed(6)}</bdi></p>
      {loadedFor === key ? <iframe title={tr('remaining.mapTitle')} src={links.embed} loading="lazy" referrerPolicy="no-referrer" /> : <Button variant="outline" onClick={() => setLoadedFor(key)}>{tr('remaining.loadMap')}</Button>}
      <a className="center-link" href={links.page} target="_blank" rel="noopener noreferrer">{tr('openMap')} ↗</a>
      {loadedFor === key && <small>{tr('remaining.mapHelp')}</small>}
    </> : <p>{tr(valid ? 'remaining.unconfirmedLocation' : 'remaining.missingLocation')}</p>}
  </Panel>;
}
