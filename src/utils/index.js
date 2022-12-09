import i18next from '../services/i18n';
import axios from 'axios';

//not in use yet
export const isDarkTheme = () => {
  return document.querySelector('[data-theme="dark"]');
}

export const stripText = (text) => {
  let doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.body.textContent || "";
}

//not in use yet
export const submitTransaction = async (blob, callback) => {
  blob = JSON.stringify(blob);

  const response = await axios.post('v2/transaction/submit', blob).catch(error => {
    onFailedRequest(error, (error) => { console.log("submitTransaction error:", error) });
  });

  if (response) {
    callback(response);
  }
}

export const onFailedRequest = (error, showErrorFunction) => {
  if (i18next.exists("error." + error.message)) {
    showErrorFunction(i18next.t("error." + error.message));
  } else {
    showErrorFunction(error.message);
  }
}

//const networks = ['mainnet', 'staging', 'testnet', 'devnet', 'beta', 'xls20', 'amm'];
//const devNetworks = ['testnet', 'devnet', 'beta', 'xls20', 'amm'];

export const network = process.env.REACT_APP_NETWORK_NAME ? process.env.REACT_APP_NETWORK_NAME : "mainnet";
export const devNet = ['mainnet', 'staging'].includes(network) ? false : network;

const Server = () => {
  let server = "https://test.bithomp.com";
  switch (network) {
    case 'mainnet':
      server = "https://bithomp.com";
      break;
    case 'staging':
      server = "https://staging.bithomp.com";
      break;
    case 'testnet':
      server = "https://test.bithomp.com";
      break;
    case 'devnet':
      server = "https://dev.bithomp.com";
      break;
    case 'beta':
      server = "https://beta.bithomp.com";
      break;
    case 'xls20':
      server = "https://xls20.bithomp.com";
      break;
    case 'amm':
      server = "https://amm.bithomp.com";
      break;
    default:
      break;
  }
  return server;
}
export const server = Server();

const WssServer = () => {
  let token = '';
  if (process.env.NODE_ENV === 'development') {
    token = '?x-bithomp-token=' + process.env.REACT_APP_BITHOMP_API_TEST_KEY;
  }
  return server.replace("https://", "wss://") + '/wss/' + token;
}
export const wssServer = WssServer();

export const isEmailValid = (x) => {
  let re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return x && re.test(x);
}

export const isUrlValid = (x) => {
  let re = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
  return !!re.test(x);
}

export const isAddressValid = (x) => {
  return /^r[0-9a-zA-Z]{24,35}$/.test(x);
}

export const isUsernameValid = (x) => {
  return x && /^(?=.{3,18}$)[0-9a-zA-Z]{1,18}[-]{0,1}[0-9a-zA-Z]{1,18}$/.test(x);
}

export const isAddressOrUsername = (x) => {
  return isAddressValid(x) || isUsernameValid(x);
}

export const isNftOfferValid = (x) => {
  return /^[0-9a-zA-Z]{64}$/.test(x);
}