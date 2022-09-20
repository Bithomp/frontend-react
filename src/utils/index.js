export const niceNumber = (n, fractionDigits = 0, currency = null) => {
  const num = Number(n);
  if (n) {
    let options = {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits
    }
    if (currency) {
      options.style = "currency";
      options.currency = currency.toUpperCase();
    }
    return num.toLocaleString(undefined, options);
  } else {
    return n;
  }
}

export const shortNiceNumber = (n, smallNumberFractionDigits = 2, largeNumberFractionDigits = 3, currency = null) => {
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
  } else if (n == 0) {
    output = 0;
  } else {
    const pow = Math.pow(10, smallNumberFractionDigits);
    output = niceNumber(Math.floor(n * pow) / pow, smallNumberFractionDigits, currency);
  }
  return beforeNumber + output;
}

//const networks = ['local', 'mainnet', 'testnet', 'beta', 'xls20', 'devnet'];
//const devNetworks = ['testnet', 'beta', 'xls20', 'devnet'];

export const network = process.env.REACT_APP_NETWORK_NAME ? process.env.REACT_APP_NETWORK_NAME : "mainnet";
export const devNet = ['mainnet', 'local'].includes(network) ? false : network;

const Server = () => {
  let server = "https://test.bithomp.com";
  switch (network) {
    case 'mainnet':
      server = "https://bithomp.com";
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
    case 'local':
      server = "https://test.bithomp.com";
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
