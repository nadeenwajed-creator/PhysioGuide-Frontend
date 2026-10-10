import { useId, useRef, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';

import './QuickSettings.css';

function QuickSettings({ languageSwitcher, themeToggle, dir, labels = {} }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const id = useId();
  const text = {
    settings: 'Quick settings',
    language: 'Language',
    theme: 'Theme',
    ...labels,
  };

  function handleKeyDown(event) {
    // Keep Escape local when the mobile search is also open.
    if (open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
  }

  return (
    <Dropdown
      className="pg-quick-settings"
      show={open}
      onToggle={setOpen}
      onKeyDown={handleKeyDown}
      align={dir === 'rtl' ? 'start' : 'end'}
      dir={dir}
      autoClose="outside"
      focusFirstItemOnShow={false}
    >
      <Dropdown.Toggle
        as="button"
        ref={toggleRef}
        id={`${id}-toggle`}
        type="button"
        className="pg-quick-settings__toggle"
        aria-label={text.settings}
        aria-controls={`${id}-panel`}
      >
        <FontAwesomeIcon icon={faGear} aria-hidden="true" />
      </Dropdown.Toggle>

      <Dropdown.Menu
        id={`${id}-panel`}
        className="pg-quick-settings__menu"
        role="region"
        aria-label={text.settings}
        renderOnMount
        popperConfig={{
          strategy: 'fixed',
          modifiers: [
            { name: 'offset', options: { offset: [0, 8] } },
            {
              name: 'preventOverflow',
              options: { padding: 12, altAxis: true, tether: false },
            },
            { name: 'flip', options: { padding: 12 } },
          ],
        }}
      >
        <div className="pg-quick-settings__row">
          <span>{text.language}</span>
          <div className="pg-quick-settings__control">{languageSwitcher}</div>
        </div>

        <div className="pg-quick-settings__row">
          <span>{text.theme}</span>
          <div className="pg-quick-settings__control">{themeToggle}</div>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default QuickSettings;