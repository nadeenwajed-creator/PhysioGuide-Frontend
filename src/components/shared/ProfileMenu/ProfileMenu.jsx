import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faRightFromBracket, faUser } from '@fortawesome/free-solid-svg-icons';

import './ProfileMenu.css';

function ProfileMenu({
  user = {},
  compact = false,
  dir,
  profilePath,
  onRequestLogout,
  labels = {},
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const id = useId();
  const text = {
    accountMenu: 'Account menu',
    profile: 'My Profile',
    logout: 'Log out',
    ...labels,
  };

  function handleKeyDown(event) {
    // Escape closes this menu without closing the Navbar search.
    if (open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
  }

  function requestLogout() {
    setOpen(false);
    // Restore focus before handing control to the confirmation dialog.
    toggleRef.current?.focus({ preventScroll: true });
    onRequestLogout?.();
  }

  return (
    <Dropdown
      className="pg-profile-menu"
      show={open}
      onToggle={setOpen}
      onKeyDown={handleKeyDown}
      align={dir === 'rtl' ? 'start' : 'end'}
      dir={dir}
      focusFirstItemOnShow
    >
      <Dropdown.Toggle
        as="button"
        ref={toggleRef}
        id={`${id}-toggle`}
        type="button"
        className="pg-profile-menu__trigger"
        aria-label={user.name ? `${text.accountMenu}: ${user.name}` : text.accountMenu}
        aria-controls={`${id}-menu`}
      >
        {user.avatar ? (
          <img className="pg-profile-menu__avatar" src={user.avatar} alt="" />
        ) : (
          <span className="pg-profile-menu__avatar" aria-hidden="true">
            <FontAwesomeIcon icon={faUser} />
          </span>
        )}

        {!compact && (
          <>
            <span className="pg-profile-menu__name">{user.name}</span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className="pg-profile-menu__chevron"
              aria-hidden="true"
            />
          </>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu
        id={`${id}-menu`}
        className="pg-profile-menu__menu"
        role="menu"
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
        <Dropdown.Item
          as={profilePath ? Link : 'button'}
          to={profilePath || undefined}
          disabled={!profilePath}
          className="pg-profile-menu__item"
          role="menuitem"
        >
          <FontAwesomeIcon icon={faUser} aria-hidden="true" />
          <span>{text.profile}</span>
        </Dropdown.Item>

        <Dropdown.Item
          as="button"
          type="button"
          className="pg-profile-menu__item pg-profile-menu__item--danger"
          onClick={requestLogout}
          disabled={!onRequestLogout}
          role="menuitem"
        >
          <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
          <span>{text.logout}</span>
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default ProfileMenu;