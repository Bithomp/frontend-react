import { Buffer } from 'buffer';

import { ReactComponent as LinkIcon } from "../assets/images/link.svg";

export const nftLink = (nft, type) => {
  if (!nft || !type || !nft[type]) return "";

  let link = "/explorer/";
  if (type === "issuer") {
    link = "/nft-explorer?issuer=";
  } else if (type === "owner" || type === "seller" || type === "buyer") {
    link = "/nfts/";
  }

  if (nft[type + 'Details']) {
    const showName = userOrServiceName(nft[type + 'Details'], { link: true });
    const { username } = nft[type + 'Details'];
    return <a href={link + (username || nft[type])}>
      {showName ? showName : <LinkIcon />}
    </a>
  }
  return <a href={link + nft[type]}><LinkIcon /></a>
}

export const usernameOrAddress = (data, type) => {
  if (!data || !type || !data[type]) return "";
  if (data[type + 'Details']) {
    const { username } = data[type + 'Details'];
    if (username) {
      return username;
    }
  }
  return data[type];
}

export const userOrServiceLink = (data, type) => {
  if (!data || !type || !data[type]) return "";
  if (data[type + 'Details']) {
    const { username, service } = data[type + 'Details'];
    if (username) {
      return <a href={"/explorer/" + username} className='bold blue'>{username}</a>;
    }
    if (service) {
      return <a href={"/explorer/" + data[type]} className='bold green'>{service}</a>;
    }
  }
  return "";
}

export const userOrServiceName = (data, options) => {
  if (data) {
    const { service, username } = data;

    if (options?.link) {
      if (username) return username;
      if (service) return service;
    }

    if (username) {
      return <b className='blue'>{username}</b>;
    }
    if (service) {
      return <b className='green'>{service}</b>;
    }
  }
  return "";
}

export const ledgerLink = (id) => {
  if (id) {
    return <a href={"/ledger/" + id}>#{id}</a>;
  }
  return '';
}

export const txIdFormat = (txId) => {
  txId = txId.toLowerCase();
  if (window.innerWidth < 800) {
    return txId.substr(0, 6) + "..." + txId.substr(-6);
  }
  return txId;
}

export const shortHash = (id) => {
  id = id.toLowerCase();
  return id.substr(0, 6) + "..." + id.substr(-6);
}

export const amountFormat = (amount, options = {}) => {
  const { value, currency, valuePrefix, issuer, type } = amountParced(amount);
  let showValue = value;
  if (value > 100) {
    showValue = niceNumber(value);
  }
  if (type !== 'XRP' && options.tooltip) {
    // curency + " " - otherwise it is in the hex format
    return <>{showValue} {valuePrefix} <span className='tooltip'>{currency + " "}<span className={'tooltiptext ' + options.tooltip}>{issuer}</span></span></>
  } else {
    //type: ['IOU', 'IOU demurraging', 'NFT']
    return showValue + " " + valuePrefix + " " + currency;
  }
}

const amountParced = (amount) => {
  if (!amount && amount !== 0) {
    return false;
  }

  const xls14NftValue = (value) => {
    if (value.includes("e-")) {
      let power = Number(value.slice(-2));
      const number = value.slice(0, -4);
      const numberLength = number.length;
      power = power + (16 - numberLength);
      if (power > 84 && power < 97) {
        const powCalc = 15 - (96 - power);
        return Number(number) / Math.pow(10, powCalc);
      }
    }
    if (value.toString().includes('0.0000000000000000000000000000000000000000000000000000000000000000000000')) {
      value = value.replace('0.0', '');
      return value.replace(/^0+/, '')
    }
    return false;
  }

  let currency = '';
  let value = '';
  let valuePrefix = '';
  let type = '';
  let issuer = null;

  if (amount.value) {
    currency = amount.currency;
    value = amount.value;
    issuer = amount.issuer;
    type = 'IOU';
    const xls14NftVal = xls14NftValue(value);
    let realXls14 = false;
    let firstTwoNumbers = currency.substr(0, 2);
    if (currency.length > 3) {
      if (firstTwoNumbers === '01') {
        // deprecated demurraging/interest-bearing
        type = 'IOU demurraging';
        let currencyText = Buffer.from(currency.substr(2, 8), 'hex');
        currencyText = currencyText.substr(0, 3);
        let profit = currency.substr(16, 16);
        if (profit === 'C1F76FF6ECB0BAC6' || profit === 'C1F76FF6ECB0CCCD') {
          valuePrefix = '(-0.5%pa)';
        } else if (profit === '41F76FF6ECB0BAC6' || profit === '41F76FF6ECB0CCCD') {
          valuePrefix = '(+0.5%pa)';
        } else if (profit === 'C1E76FF6ECB0BAC6') {
          valuePrefix = '(+1%pa)';
        } else {
          /*
            $realprofit = 1 - (exp(31536000 / hex2double($profit)));
            $realprofit = round($realprofit * 100, 2, PHP_ROUND_HALF_UP);
            if ($realprofit > 0) {
              $plus = '+';
            } else {
              $plus = '';
            }
            $output .= ' (' . $plus . $realprofit . '%pa)';
          */
          valuePrefix = "(??%pa)";
        }
        currency = currencyText;
      } else if (firstTwoNumbers === '02') {
        currency = Buffer.from(currency.substring(16), 'hex');
        if (xls14NftVal) {
          realXls14 = true;
        }
      } else {
        currency = Buffer.from(currency, 'hex');
      }
    }

    if (currency.toString().toLowerCase() === "xrp") {
      currency = "FakeXRP";
    }

    if (xls14NftVal) {
      type = 'NFT';
      if (realXls14) {
        //real xls-14
        valuePrefix = "NFT (XLS-14)";
      } else {
        //a parody of xls-14
        valuePrefix = "NFT (XLS-14?)";
      }
      value = xls14NftVal;
    }
  } else {
    type = "XRP";
    value = amount / 1000000;
    currency = "XRP";
  }
  return {
    type,
    value,
    valuePrefix,
    currency,
    issuer
  }
}

export const capitalize = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const fullDateAndTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleString();
}

export const timeFormat = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const dateFormat = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export const timeOrDate = (timestamp) => {
  //if today - return time, otherwise date
  return (new Date(timestamp * 1000)).setHours(0, 0, 0, 0) === (new Date()).setHours(0, 0, 0, 0) ? timeFormat(timestamp) : dateFormat(timestamp);
}

//need to make dynamic fraction digits
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
  if (n !== 0 && !n) return null;
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
