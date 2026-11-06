import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './RowActions.css';

// The admin tables scroll horizontally (overflow-x: auto), which clips any
// absolutely positioned popup, so the menu renders into the body with fixed
// coordinates measured from its trigger.
function RowActions({ items = [], label }) {
  const { t } = useLanguage();
  const [placement, setPlacement] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const close = () => setPlacement(null);

  useEffect(() => {
    if (!placement) return undefined;

    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (buttonRef.current?.contains(event.target)) return;
      close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // The menu is positioned in viewport units, so scrolling invalidates it.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [placement]);

  const toggle = () => {
    if (placement) {
      close();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Flip above the trigger when there is no room below it.
    const openUp = rect.bottom + 180 > window.innerHeight;
    setPlacement({
      ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  return (
    <>
      <span ref={buttonRef} className="admin-row-actions__trigger">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={faEllipsisV}
          aria-label={label ?? t('center.actions')}
          aria-haspopup="menu"
          aria-expanded={placement ? 'true' : 'false'}
          onClick={toggle}
        />
      </span>

      {placement &&
        createPortal(
          <div
            ref={menuRef}
            className="admin-row-actions"
            role="menu"
            style={placement}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`admin-row-actions__item${item.danger ? ' is-danger' : ''}`}
                onClick={() => {
                  close();
                  item.onSelect?.();
                }}
              >
                {item.icon && <FontAwesomeIcon icon={item.icon} aria-hidden="true" />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export default RowActions;
