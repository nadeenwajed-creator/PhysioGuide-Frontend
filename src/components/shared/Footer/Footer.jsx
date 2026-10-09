import logoSrc from '../../../assets/logo/physioguide-icon.svg';

import './Footer.css';

function Footer({
  description = 'Your trusted platform for physiotherapy care.',
  copyright = '© 2026 PhysioGuide. All rights reserved.',
}) {
  return (
    <footer className="pg-footer">
      <div className="pg-footer__brand">
        <img className="pg-footer__logo" src={logoSrc} alt="website logo" />

        <div className="pg-footer__text">
          <p className="pg-footer__name">Physio<wbr /><span>Guide</span></p>
          <p className="pg-footer__description">{description}</p>
        </div>
      </div>

      <p className="pg-footer__copyright">{copyright}</p>
    </footer>
  );
}

export default Footer;