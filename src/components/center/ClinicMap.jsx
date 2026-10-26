import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import Button from '../shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { validCoordinates } from '../../services/centerLocationService.js';
import './ClinicMap.css';

const limit = 85.05112878;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function project(point, zoom) {
  const size = 256 * 2 ** zoom;
  const sin = Math.sin(clamp(point.latitude, -limit, limit) * Math.PI / 180);
  return { x: (point.longitude + 180) / 360 * size, y: (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size };
}
function unproject(x, y, zoom) {
  const size = 256 * 2 ** zoom;
  return { longitude: ((x / size * 360) % 360 + 360) % 360 - 180,
    latitude: clamp(Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI, -limit, limit) };
}

export default function ClinicMap({ coordinates, onChange, disabled = false }) {
  const { t } = useLanguage();
  const root = useRef(null);
  const gesture = useRef(null);
  const [width, setWidth] = useState(300);
  const [view, setView] = useState({ center: coordinates || { latitude: 0, longitude: 0 }, zoom: validCoordinates(coordinates) ? 16 : 2 });
  const [dragPin, setDragPin] = useState(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const height = 240;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(root.current);
    const visibility = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); });
    visibility.observe(root.current);
    return () => { observer.disconnect(); visibility.disconnect(); };
  }, []);
  const lat = coordinates?.latitude, lng = coordinates?.longitude;
  const pointKey = `${lat},${lng}`;
  const [previousPoint, setPreviousPoint] = useState(pointKey);
  if (pointKey !== previousPoint) {
    setPreviousPoint(pointKey);
    if (Number.isFinite(lat) && Number.isFinite(lng)) setView(current => ({ center: { latitude: lat, longitude: lng }, zoom: Math.max(current.zoom, 16) }));
  }
  const center = project(view.center, view.zoom);
  const left = center.x - width / 2, top = center.y - height / 2;
  const pin = dragPin || coordinates;
  const pinPixel = validCoordinates(pin) ? project(pin, view.zoom) : null;
  const tiles = [];
  const count = 2 ** view.zoom;
  if (visible) for (let x = Math.floor(left / 256); x <= Math.floor((left + width) / 256); x++) {
    for (let y = Math.max(0, Math.floor(top / 256)); y <= Math.min(count - 1, Math.floor((top + height) / 256)); y++) {
      tiles.push({ x, y, wrapped: (x % count + count) % count });
    }
  }
  function pointerDown(event) {
    if (event.button !== 0 || event.target.closest('.clinic-map__controls,.clinic-map__credit')) return;
    const isPin = !!event.target.closest('.clinic-map__pin');
    if (isPin && (!onChange || disabled)) return;
    gesture.current = { x: event.clientX, y: event.clientY, center, pin: pinPixel, isPin, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    const start = gesture.current;
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
    if (start.isPin) {
      setDragPin(unproject(clamp(start.pin.x + dx, left, left + width), clamp(start.pin.y + dy, top, top + height), view.zoom));
    } else setView(current => ({ ...current, center: unproject(start.center.x - dx, start.center.y - dy, current.zoom) }));
  }
  function pointerUp(event) {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    if (start.isPin && dragPin) onChange?.(dragPin);
    else if (!start.moved && onChange && !disabled) {
      const box = root.current.getBoundingClientRect();
      onChange(unproject(left + event.clientX - box.left, top + event.clientY - box.top, view.zoom));
    }
    setDragPin(null);
  }
  function movePin(event) {
    const steps = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
    if (!steps[event.key] || !onChange || disabled || !pinPixel) return;
    event.preventDefault();
    const [x, y] = steps[event.key];
    onChange(unproject(pinPixel.x + x, pinPixel.y + y, view.zoom));
  }
  return <div ref={root} className="clinic-map" role="region" aria-label={t('center.remaining.mapTitle')} dir="ltr"
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
    onPointerCancel={() => { gesture.current = null; setDragPin(null); }}>
    {tiles.map(tile => <img key={`${view.zoom}/${tile.x}/${tile.y}`} className="clinic-map__tile" alt="" draggable="false"
      src={`https://tile.openstreetmap.org/${view.zoom}/${tile.wrapped}/${tile.y}.png`} referrerPolicy="strict-origin-when-cross-origin"
      style={{ left: tile.x * 256 - left, top: tile.y * 256 - top }} onError={() => setFailed(true)} />)}
    {pinPixel && <button type="button" className="clinic-map__pin" disabled={disabled || !onChange}
      aria-label={t(onChange ? 'center.map.movePin' : 'center.map.savedPin')} onKeyDown={movePin}
      style={{ left: pinPixel.x - left, top: pinPixel.y - top }}><FontAwesomeIcon icon={faLocationDot} /></button>}
    <div className="clinic-map__controls">
      <Button variant="outline" icon={faPlus} iconOnly aria-label={t('center.map.zoomIn')} disabled={view.zoom >= 19} onClick={() => setView(v => ({ ...v, zoom: v.zoom + 1 }))} />
      <Button variant="outline" icon={faMinus} iconOnly aria-label={t('center.map.zoomOut')} disabled={view.zoom <= 2} onClick={() => setView(v => ({ ...v, zoom: v.zoom - 1 }))} />
    </div>
    {failed && <span className="clinic-map__error" role="status">{t('center.map.unavailable')}</span>}
    <a className="clinic-map__credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
  </div>;
}
