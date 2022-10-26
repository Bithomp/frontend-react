import i18next from '../services/i18n';
import axios from 'axios';

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

export const capitalize = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const title = (title) => {
  if (network === 'mainnet') {
    document.title = 'XRPL ' + title;
  } else {
    document.title = 'XRPL ' + network.toUpperCase() + ": " + title;
  }
}

export const fullDateAndTime = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString();
}

export const niceNumber = (n, fractionDigits = 0, currency = null) => {
  if (typeof n === 'string') {
    if (n.includes('x')) { //in case of placeholders xxx
      return n;
    } else {
      n = Number(n);
    }
  }
  if (n) {
    let options = {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits
    }
    if (currency) {
      options.style = "currency";
      options.currency = currency.toUpperCase();
    }
    return n.toLocaleString(undefined, options);
  } else {
    return n;
  }
}

export const shortNiceNumber = (n, smallNumberFractionDigits = 2, largeNumberFractionDigits = 3, currency = null) => {
  n = Number(n);
  let beforeNumber = '';
  if (n < 0) {
    beforeNumber = '-';
    n = -1 * n;
  }
  if (smallNumberFractionDigits > 2) {
    if (n > 99.99) {
      smallNumberFractionDigits = 2;
    } else if (n > 9.99) {
      smallNumberFractionDigits = 3;
    }
  }
  let output = '';
  if (n > 999999999999) {
    output = niceNumber(n / 1000000000000, largeNumberFractionDigits, currency) + 'T';
  } else if (n > 999999999) {
    output = niceNumber(n / 1000000000, largeNumberFractionDigits, currency) + 'B';
  } else if (n > 999999) {
    output = niceNumber(n / 1000000, largeNumberFractionDigits, currency) + 'M';
  } else if (n > 99999) {
    output = niceNumber(Math.floor(n), 0, currency);
  } else if (n === 0) {
    output = 0;
  } else {
    const pow = Math.pow(10, smallNumberFractionDigits);
    output = niceNumber(Math.floor(n * pow) / pow, smallNumberFractionDigits, currency);
  }
  return beforeNumber + output;
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
