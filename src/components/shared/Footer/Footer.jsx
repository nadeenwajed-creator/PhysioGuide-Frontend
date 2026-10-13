
import { useLanguage } from '../../../context/LanguageContext.jsx';

import logoSrc from '../../../assets/logo/physioguide-icon.svg';

import './Footer.css';

function Footer({
  description,
  copyright,
}) {
  const { t } = useLanguage();

  const resolvedDescription =
    description ?? t('footer.description');

  const resolvedCopyright =
    copyright ?? t('footer.copyright');

  return (
    <footer className="pg-footer">
      <div className="pg-footer__brand">
        <img
          className="pg-footer__logo"
          src={logoSrc}
          alt={t('footer.logoAlt')}
        />

        <div className="pg-footer__text">
          <p className="pg-footer__name">
            Physio<wbr /><span>Guide</span>
          </p>

          <p className="pg-footer__description">
            {resolvedDescription}
          </p>
        </div>
      </div>

      <p className="pg-footer__copyright">
        {resolvedCopyright}
      </p>
    </footer>
  );
}

export default Footer;
