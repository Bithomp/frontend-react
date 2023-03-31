import axios from 'axios'
import { useCallback, useEffect, useState } from "react"
import { Buffer } from 'buffer'

export const useWidth = () => {
  const [width, setWidth] = useState(0)
  const handleResize = () => setWidth(window.innerWidth)
  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return width
}

export const useLocalStorage = (key, initialValue) => {
  const initialize = (key) => {
    try {
      const item = localStorage.getItem(key);
      if (item && item !== "undefined") {
        return JSON.parse(item);
      }

      if (typeof initialValue !== "undefined") {
        localStorage.setItem(key, JSON.stringify(initialValue));
        return initialValue;
      } else {
        return null
      }
    } catch {
      if (typeof initialValue !== "undefined") {
        return initialValue
      } else {
        return null
      }
    }
  }

  const [state, setState] = useState(null);

  useEffect(() => {
    setState(initialize(key));
  }, []);

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setState(valueToStore);
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.log(error);
      }
    },
    [key, setState]
  );

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      console.log(error);
    }
  }, [key]);

  return [state, setValue, remove];
};

const shallRemoveParam = (tabList, tab, defaultTab, setTab) => {
  const existTab = tabList.some(t => t.value === tab);
  if (!existTab) {
    setTab(defaultTab);
    return true
  } else {
    return tab === defaultTab
  }
}

export const setTabParams = (router, tabs, addList = [], removeList = []) => {
  for (let i = 0; i < tabs.length; i++) {
    const { tabList, tab, defaultTab, setTab, paramName } = tabs[i]
    if (shallRemoveParam(tabList, tab, defaultTab, setTab)) {
      removeList.push(paramName)
    } else {
      addList.push({
        name: paramName,
        value: tab
      })
    }
  }
  addAndRemoveQueryParams(router, addList, removeList)
}

export const removeQueryParams = (router, removeList) => {
  const { query, pathname } = router
  let params = new URLSearchParams(query)
  for (let i = 0; i < removeList.length; i++) {
    params.delete(removeList[i])
  }
  router.replace({ pathname, query: params.toString() }, null, { shallow: true })
}

export const addQueryParams = (router, addList = []) => {
  if (!addList.length) return;
  for (let i = 0; i < addList.length; i++) {
    const { name, value } = addList[i]
    router.query[name] = value
  }
  const { query, pathname } = router
  router.replace({ pathname, query }, null, { shallow: true })
}

export const addAndRemoveQueryParams = (router, addList, removeList) => {
  for (let i = 0; i < addList.length; i++) {
    const { name, value } = addList[i]
    router.query[name] = value
  }
  removeQueryParams(router, removeList)
}

export const stripText = (text) => {
  if (!text) return ""
  text = text.toString() //For buffer/hex
  return text
}

export const decode = (code) => {
  if (!code) return null
  const decodedHex = Buffer.from(code, 'hex')
  const decodedString = decodedHex.toString()
  if (!decodedString.includes('�')) return stripText(decodedString)
  return stripText(code)
}

//not in use yet
export const submitTransaction = async (blob, callback) => {
  blob = JSON.stringify(blob);

  const response = await axios.post('v2/transaction/submit', blob).catch(error => {
    console.log("submitTransaction error:", error.message)
  });

  if (response) {
    callback(response);
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
    token = '?x-bithomp-token=' + process.env.NEXT_PUBLIC_BITHOMP_API_TEST_KEY;
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
