import { useRef, useState } from 'react';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Button from '../shared/Button/Button.jsx';
import Modal from '../shared/Modal/Modal.jsx';
import { RecordImage } from '../center/CenterUI.jsx';
import { usePatientLabels } from './usePatientLabels.js';

export default function CenterGallery({ center }) {
  const { t, name, dir } = usePatientLabels();
  // Include the cover photo once and leave out empty image paths
  const photos = [...new Set([center.imageUrl, ...(center.gallery || [])].filter(src => typeof src === 'string' && src.trim()))];
  const [index, setIndex] = useState(0),
    [expanded, setExpanded] = useState(false);
  const touch = useRef(null),
    swiped = useRef(false);
  // Keep the current index valid if the photo list gets shorter
  const current = Math.min(index, Math.max(0, photos.length - 1));
  // Wrap around when moving past the first or last photo
  const move = delta => setIndex((current + delta + photos.length) % photos.length);
  return <section
    className="pd-single-gallery"
    aria-label={name(center.name)}
    onKeyDown={event => {
      if (photos.length < 2 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') setIndex(0);
      else if (event.key === 'End') setIndex(photos.length - 1);
      // Reverse the arrow direction for the Arabic layout
      else move((event.key === 'ArrowRight' ? 1 : -1) * (dir === 'rtl' ? -1 : 1));
    }}
    onPointerDown={event => {
      swiped.current = false;
      if (event.pointerType === 'touch') touch.current = event.clientX;
    }}
    onPointerUp={event => {
      if (touch.current !== null && Math.abs(event.clientX - touch.current) > 40 && photos.length > 1) {
        swiped.current = true;
        move((event.clientX < touch.current ? 1 : -1) * (dir === 'rtl' ? -1 : 1));
      }
      touch.current = null;
    }}
    onPointerCancel={() => {
      touch.current = null;
    }}
  >
    <button
      type="button"
      className="pd-gallery-main"
      onClick={event => {
        // A swipe can also fire a click, so do not open the modal for it
        if (swiped.current && event.detail) return;
        if (photos.length) setExpanded(true);
      }}
      aria-label={t('openPhoto')}
      disabled={!photos.length}
    >
      <RecordImage src={photos[current]} alt={name(center.name)} />
    </button>
    {photos.length > 1 && <>
      <Button
        className="pd-gallery-previous"
        variant="outline"
        iconOnly
        icon={dir === 'rtl' ? faChevronRight : faChevronLeft}
        aria-label={t('previousPhoto')}
        onClick={() => move(-1)}
      />
      <Button
        className="pd-gallery-next"
        variant="outline"
        iconOnly
        icon={dir === 'rtl' ? faChevronLeft : faChevronRight}
        aria-label={t('nextPhoto')}
        onClick={() => move(1)}
      />
      <span
        className="pd-gallery-counter"
        role="status"
        aria-label={t('imageCount', {
          current: current + 1,
          total: photos.length
        })}
      >
        <bdi>{current + 1} / {photos.length}</bdi>
      </span>
    </>}
    {expanded && <Modal isOpen title={name(center.name)} onClose={() => setExpanded(false)}>
      <RecordImage className="pd-photo-view" src={photos[current]} alt={name(center.name)} />
    </Modal>}
  </section>;
}
