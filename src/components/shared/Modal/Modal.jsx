
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import Button from '../Button/Button.jsx';
import './Modal.css';

function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dir,
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
  closeLabel = 'Close',
  className = '',
}) {
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const overlayPressRef = useRef(false);
  const titleId = useId();

  const modalSize = ['sm', 'md', 'lg'].includes(size)
    ? size
    : 'md';

  // Inherit document direction unless explicitly overridden.
  const modalDir =
    dir === 'rtl' || dir === 'ltr'
      ? dir
      : undefined;

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement;
    const body = document.body;
    const root = document.documentElement;

    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root.style.overflow;

    // Native dialog handles focus containment and background inertness.
    dialog.showModal();

    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';

    titleRef.current?.focus({ preventScroll: true });

    return () => {
      if (dialog.open) {
        dialog.close();
      }

      body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;
      overlayPressRef.current = false;

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  function handleCancel(event) {
    event.preventDefault();

    if (closeOnEscape) {
      onClose?.();
    }
  }

  function handlePointerDown(event) {
    overlayPressRef.current =
      event.button === 0 &&
      event.target === event.currentTarget;
  }

  function handleOverlayClick(event) {
    const clickedOverlay =
      overlayPressRef.current &&
      event.target === event.currentTarget;

    overlayPressRef.current = false;

    if (closeOnOverlay && clickedOverlay) {
      onClose?.();
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="pg-modal__overlay"
      dir={modalDir}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onPointerDown={handlePointerDown}
      onPointerCancel={() => {
        overlayPressRef.current = false;
      }}
      onClick={handleOverlayClick}
    >
      <div
        className={[
          'pg-modal',
          `pg-modal--${modalSize}`,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Fixed header */}
        <header className="pg-modal__header">
          <h2
            ref={titleRef}
            id={titleId}
            className="pg-modal__title"
            tabIndex={-1}
          >
            {title}
          </h2>

          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              icon={faXmark}
              iconOnly
              className="pg-modal__close"
              aria-label={closeLabel}
              onClick={() => onClose?.()}
            />
          )}
        </header>

        {/* Scrollable body */}
        <div className="pg-modal__body">
          {children}
        </div>

        {/* Fixed footer */}
        {footer != null && (
          <footer className="pg-modal__footer">
            {footer}
          </footer>
        )}
      </div>
    </dialog>,
    document.body
  );
}

export default Modal;
