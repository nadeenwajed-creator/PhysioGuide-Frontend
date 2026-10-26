import front from '../../../assets/images/patient/pain-assessment/body-front-clean.png';
import back from '../../../assets/images/patient/pain-assessment/body-back-clean.png';
import { bodyHotspots } from './bodyHotspots.js';

export default function BodyMap({
  selected,
  onToggle,
  t,
  miniature = false
}) {
  return <div className={`pain-bodies${miniature ? ' pain-bodies--mini' : ''}`}>
    {['front', 'back'].map(side => <figure key={side}>
      <div className="pain-body">
        <img src={side === 'front' ? front : back} width="500" height="970" alt={t(`body.${side}`)} />
        {Object.entries(bodyHotspots[side]).flatMap(([area, points]) => points.map(([x, y], index) => {
          const active = selected.includes(area);
          // Percentage positions keep the hotspots aligned when the image resizes
          const style = {
            left: `${x}%`,
            top: `${y}%`
          };
          // The summary only shows selected markers; the full map allows toggling
          return miniature ? active && <span
            key={`${area}-${index}`}
            className={`pain-hotspot is-active pain-hotspot--${area}`}
            style={style}
            aria-hidden="true"
          /> : <button
            key={`${area}-${index}`}
            type="button"
            className={`pain-hotspot pain-hotspot--${area}${active ? ' is-active' : ''}`}
            style={style}
            aria-label={`${t(`body.${side}`)}: ${t(`area.${area}`)}`}
            aria-pressed={active}
            onClick={() => onToggle(area)}
          />;
        }))}
      </div>
      {!miniature && <figcaption>
        {t(`body.${side}`)}
      </figcaption>}
    </figure>)}
  </div>;
}
