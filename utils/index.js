import axios from 'axios'
import { useState, useEffect } from "react"
import { i18n } from '../next-i18next.config'

export const useLocalStorage = (key, initialValue = null) => {
  const [value, setValue] = useState(null);

  const parse = (value) => {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  useEffect(() => {
    const data = localStorage.getItem(key);
    if (!data) {
      if (typeof initialValue === "function") {
        setValue(initialValue());
      } else {
        setValue(initialValue);
      }
    } else {
      setValue(parse(data));
    }
  }, []);

  useEffect(() => {
    if (value !== initialValue) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [value]);

  return [value, setValue];
}

export const setTabParams = (tabList, tab, defaultTab, setTab, searchParameters, paramName) => {
  const existTab = tabList.some(t => t.value === tab);
  if (!existTab) {
    setTab(defaultTab);
    searchParameters.delete(paramName);
  } else if (tab === defaultTab) {
    searchParameters.delete(paramName);
  } else {
    searchParameters.set(paramName, tab);
  }
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
  if (i18n.exists("error." + error.message)) {
    showErrorFunction(i18n.t("error." + error.message));
  } else {
    showErrorFunction(error.message);
  }
}

export const onApiError = (error, showErrorFunction) => {
  if (i18n.exists("error-api." + error)) {
    showErrorFunction(i18n.t("error-api." + error));
  } else {
    showErrorFunction(error);
  }
}

//const networks = ['mainnet', 'staging', 'testnet', 'devnet', 'beta', 'amm'];
//const devNetworks = ['testnet', 'devnet', 'beta', 'amm'];

export const network = process.env.NEXT_PUBLIC_NETWORK_NAME ? process.env.NEXT_PUBLIC_NETWORK_NAME : "mainnet";
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

export const isIdValid = (x) => {
  return /^[0-9a-zA-Z]{64}$/.test(x);
}
