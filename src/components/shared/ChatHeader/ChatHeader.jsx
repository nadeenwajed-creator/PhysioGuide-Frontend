import { useState } from 'react';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

import Avatar from '../Avatar/Avatar.jsx';
import ActionsMenu from '../ActionsMenu/ActionsMenu.jsx';
import Button from '../Button/Button.jsx';
import Modal from '../Modal/Modal.jsx';
import RatingStars from '../RatingStars/RatingStars.jsx';
import { useLanguage } from '../../../context/LanguageContext.jsx';

import './ChatHeader.css';

function ChatHeader({
  name = '',
  avatarSrc,
  status = 'unknown',
  therapistProfile = {},
  onBack,
}) {
  const { language, dir, t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);

  // Therapist name and connection status
  const displayName = typeof name === 'string' && name.trim()
    ? name.trim()
    : t('chatHeader.therapist');

  const connectionStatus = status === 'online' || status === 'offline'
    ? status
    : 'unknown';

  const statusText = t(`chatHeader.${connectionStatus}`);
  const avatarStatus = connectionStatus === 'unknown' ? 'none' : connectionStatus;

  const profile = therapistProfile ?? {};
  const informationUnavailable = t('chatHeader.informationUnavailable');
  const numberFormat = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });

  // Check therapist profile information before displaying it
  const specialization = typeof profile.specialization === 'string'
    && profile.specialization.trim()
    ? profile.specialization.trim()
    : informationUnavailable;

  const hasRating = Number.isFinite(profile.rating)
    && profile.rating >= 0 && profile.rating <= 5;

  const hasExperience = Number.isFinite(profile.experienceYears)
    && profile.experienceYears >= 0;

  const hasSessions = Number.isSafeInteger(profile.completedSessions)
    && profile.completedSessions >= 0;

  const currency = typeof profile.currency === 'string'
    ? profile.currency.trim().toUpperCase()
    : '';

  const hasPrice = Number.isFinite(profile.sessionPrice)
    && profile.sessionPrice >= 0 && /^[A-Z]{3}$/.test(currency);

  const sessionPrice = hasPrice
    ? new Intl.NumberFormat(language, {
        style: 'currency',
        currency,
        currencyDisplay: 'code',
      }).format(profile.sessionPrice)
    : informationUnavailable;

  const availability = profile.availability === 'available'
    || profile.availability === 'unavailable'
    ? profile.availability
    : 'unknown';

  const availabilityText = availability === 'unknown'
    ? informationUnavailable
    : t(`chatHeader.${availability}`);

  // Open or close the therapist profile
  const menuItems = [
    {
      label: t('chatHeader.viewProfile'),
      onClick: () => setProfileOpen(true),
    },
  ];

  function closeProfile() {
    setProfileOpen(false);
  }

  return (
    <>
      {/* Chat header with back button, therapist details and menu */}
      <header className="pg-chat-header" dir={dir}>
        <Button
          variant="ghost"
          icon={dir === 'rtl' ? faArrowRight : faArrowLeft}
          iconOnly
          className="pg-chat-header__back"
          aria-label={t('chatHeader.back')}
          onClick={onBack}
          disabled={!onBack}
        />

        <div className="pg-chat-header__identity">
          <Avatar
            src={avatarSrc}
            name={displayName}
            alt=""
            size="sm"
            status={avatarStatus}
          />

          <div className="pg-chat-header__text">
            <h2 className="pg-chat-header__name" title={displayName}>
              <bdi>{displayName}</bdi>
            </h2>

            <p
              className="pg-chat-header__status"
              data-status={connectionStatus}
              role="status"
              aria-atomic="true"
            >
              {statusText}
            </p>
          </div>
        </div>

        <ActionsMenu
          className="pg-chat-header__actions"
          ariaLabel={t('chatHeader.actions')}
          items={menuItems}
        />
      </header>

      {/* Popup showing the therapist's professional information */}
      <Modal
        isOpen={profileOpen}
        onClose={closeProfile}
        title={t('chatHeader.profileTitle')}
        closeLabel={t('chatHeader.close')}
        size="md"
        dir={dir}
        className="pg-chat-header__modal"
        footer={
          <Button
            variant="outline"
            className="pg-chat-header__close"
            onClick={closeProfile}
          >
            {t('chatHeader.close')}
          </Button>
        }
      >
        <div className="pg-chat-header__profile">
          <div className="pg-chat-header__profile-identity">
            <Avatar src={avatarSrc} name={displayName} alt="" size="md" />

            <div className="pg-chat-header__profile-text">
              <h3 className="pg-chat-header__profile-name">
                <bdi>{displayName}</bdi>
              </h3>

              <p className="pg-chat-header__specialization">
                <bdi>{specialization}</bdi>
              </p>
            </div>
          </div>

          <dl className="pg-chat-header__profile-details">
            <div className="pg-chat-header__profile-field">
              <dt>{t('chatHeader.rating')}</dt>
              <dd>
                {hasRating ? (
                  <RatingStars
                    rating={profile.rating}
                    showValue
                    size="sm"
                    dir={dir}
                    ariaLabel={`${t('chatHeader.rating')}: ${numberFormat.format(profile.rating)} ${t('chatHeader.outOf')} ${numberFormat.format(5)}`}
                  />
                ) : (
                  informationUnavailable
                )}
              </dd>
            </div>

            <div className="pg-chat-header__profile-field">
              <dt>{t('chatHeader.experienceYears')}</dt>
              <dd>
                {hasExperience ? (
                  <bdi>{numberFormat.format(profile.experienceYears)}</bdi>
                ) : (
                  informationUnavailable
                )}
              </dd>
            </div>

            <div className="pg-chat-header__profile-field">
              <dt>{t('chatHeader.completedSessions')}</dt>
              <dd>
                {hasSessions ? (
                  <bdi>{numberFormat.format(profile.completedSessions)}</bdi>
                ) : (
                  informationUnavailable
                )}
              </dd>
            </div>

            <div className="pg-chat-header__profile-field">
              <dt>{t('chatHeader.sessionPrice')}</dt>
              <dd><bdi>{sessionPrice}</bdi></dd>
            </div>

            <div className="pg-chat-header__profile-field pg-chat-header__profile-field--availability">
              <dt>{t('chatHeader.availability')}</dt>
              <dd>
                <span
                  className="pg-chat-header__availability"
                  data-availability={availability}
                >
                  {availabilityText}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </Modal>
    </>
  );
}

export default ChatHeader;