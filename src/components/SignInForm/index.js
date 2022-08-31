import './styles.scss';

import xumm from '../../assets/images/xumm-large.svg';
import ledger from '../../assets/images/ledger-large.svg';
import trezor from '../../assets/images/trezor-large.svg';
import ellipal from '../../assets/images/ellipal-large.svg';


export default function SignInForm({ setSignInFormOpen }) {
  return (
    <div className="sign-in-form">
      <div className="sign-in-body center">
        <h2 className='center'>Choose a signing app</h2>
        <div className='close-button' onClick={() => setSignInFormOpen(false)}></div>
        <div className='signin-apps'>
          <a href="">
            <img alt="xumm" className='signin-app-logo' src={xumm} />
          </a>
          <a href="">
            <img alt="ledger" className='signin-app-logo' src={ledger} />
          </a>
          <a href="">
            <img alt="trezor" className='signin-app-logo' src={trezor} />
          </a>
          <a href="">
            <img alt="ellipal" className='signin-app-logo' src={ellipal} />
          </a>
        </div>
      </div>
    </div>
  );
};