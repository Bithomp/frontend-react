import { useTranslation } from 'react-i18next';

import './styles.scss';

import xumm from '../../assets/images/xumm-large.svg';
import ledger from '../../assets/images/ledger-large.svg';
import trezor from '../../assets/images/trezor-large.svg';
import ellipal from '../../assets/images/ellipal-large.svg';


export default function SignInForm({ setSignInFormOpen }) {
  const { t } = useTranslation();

  return (
    <div className="sign-in-form">
      <div className="sign-in-body center">
        <div className='header'>{t("signin.choose-app")}</div>
        <div className='close-button' onClick={() => setSignInFormOpen(false)}></div>
        <div className='signin-apps'>
          <a href="/explorer/?hwlogin=xumm">
            <img alt="xumm" className='signin-app-logo' src={xumm} />
          </a>
          <a href="/explorer/?hwlogin=ledger">
            <img alt="ledger" className='signin-app-logo' src={ledger} />
          </a>
          <a href="/explorer/?hwlogin=trezor">
            <img alt="trezor" className='signin-app-logo' src={trezor} />
          </a>
          <a href="/explorer/?hwlogin=ellipal">
            <img alt="ellipal" className='signin-app-logo' src={ellipal} />
          </a>
        </div>
      </div>
    </div>
  );
};