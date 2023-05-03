import { Buffer } from 'buffer'
import Link from 'next/link'
import Image from 'next/image'

import LinkIcon from "../public/images/link.svg"
import { stripText } from '.'
import { mpUrl } from './nft'

export const cancelNftOfferButton = (t, setSignRequest, account, offer, type = "buy") => {
  return <button
    className='button-action wide center'
    onClick={() => setSignRequest({
      wallet: "xumm",
      request: {
        "TransactionType": "NFTokenCancelOffer",
        "Account": account,
        "NFTokenOffers": [offer.offerIndex]
      }
    })}
  >
    <Image src="/images/xumm.png" className='xumm-logo' alt="xumm" height={24} width={24} />
    {type === "sell" ? t("nft.cancel-sell-offer-for") : t("nft.cancel-buy-offer-for")} {amountFormat(offer.amount)}
  </button>
}

//table
export const trStatus = (t, data) => {
  if (data.validationErrors && data.validationErrors.length > 0) {
    return <tr>
      <td>{t("table.status")}</td>
      <td>
        {data.validationErrors.map((error, i) =>
          <span key={i} className='red'>
            {t("table.text-status." + error)}
          </span>
        )}
      </td>
    </tr>
  }
  if (data.canceledAt || data.acceptedAt) {
    return <tr>
      <td>{t("table.status")}</td>
      <td className='red'>
        {data.acceptedAt ? t("table.accepted") : t("table.canceled")}
      </td>
    </tr>
  }
}

export const trWithFlags = (t, flags) => {
  /*
  "flags": {
    "burnable": false,
    "onlyXRP": false,
    "trustLine": false,
    "transferable": true
  },
  */
  let flagList = '';
  let count = 0;
  let name = t("table.flags");

  for (let key in flags) {
    if (flags[key]) {
      //skip sellToken flag for tokenCreateOffer, we show it in the name
      if (key === 'sellToken') {
        continue;
      }
      count++;
      flagList += key + ', ';
    }
  }
  flagList = flagList.slice(0, -2); // remove the last comma

  if (count === 1) {
    name = t("table.flag");
  }
  if (count === 0) {
    flagList = t("table.text.unspecified");
  }
  return <tr>
    <td>{name}</td>
    <td>{flagList}</td>
  </tr>
}

export const trWithAccount = (data, valueName, tableName, url = "/explorer/") => {
  if (!data || !data[valueName]) return null;
  let link = <a href={url + data[valueName]}>{data[valueName]}</a>;
  let userOrServicelink = userOrServiceLink(data, valueName, { url });
  return userOrServicelink ?
    <>
      <tr>
        <td>{tableName}</td>
        <td>{userOrServicelink}</td>
      </tr>
      <tr>
        <td></td>
        <td>{link}</td>
      </tr>
    </>
    :
    <tr>
      <td>{tableName}</td>
      <td>{link}</td>
    </tr>
}

export const nftOfferLink = (nftOfferId, chars = 10) => {
  if (!nftOfferId) return "";
  return <Link href={"/nft-offer/" + nftOfferId}>{shortHash(nftOfferId, chars)}</Link>
}

export const nftIdLink = (nftId, chars = 10) => {
  if (!nftId) return "";
  return <Link href={"/nft/" + nftId}>{shortHash(nftId, chars)}</Link>
}

export const txIdLink = (txId, chars = 10) => {
  if (!txId) return "";
  return <a href={"/explorer/" + txId}>{shortHash(txId, chars)}</a>
}

export const nftLink = (nft, type, options = {}) => {
  if (!nft || !type || !nft[type]) return "";

  let link = "/explorer/";
  if (type === "issuer") {
    link = "/nft-explorer?issuer=";
  } else if (type === "owner" || type === "seller" || type === "buyer") {
    link = "/nfts/";
  }

  let defaultContent = <LinkIcon />;
  if (options.address === 'short') {
    defaultContent = shortAddress(nft[type]);
  }

  //nft-offers destination
  if (nft[type + 'Details']) {
    const showName = userOrServiceName(nft[type + 'Details']);
    if (type === "destination" && nft.valid) {
      const url = mpUrl(nft);
      if (url) {
        return <span>
          {options?.seeOn} <a href={url} target="_blank" rel="noreferrer">
            {showName}
          </a>
        </span>
      }
    }
    return <a href={link + (nft[type + 'Details'].username || nft[type])}>
      {showName ? showName : defaultContent}
    </a>
  }
  return <a href={link + nft[type]}>{defaultContent}</a>
}

export const nftsExplorerLink = ({ owner, ownerDetails, issuer, issuerDetails }) => {
  if (!owner && !issuer) return "";
  let link = '';
  const issuerUri = issuerDetails?.username ? issuerDetails.username : issuer;
  const ownerUri = ownerDetails?.username ? ownerDetails.username : owner;
  if (issuer && owner) {
    link = "/nft-explorer?issuer=" + issuerUri + '&owner=' + ownerUri;
  } else {
    if (issuer) {
      link = "/nft-explorer?issuer=" + issuerUri;
    } else if (owner) {
      link = "/nft-explorer?owner=" + ownerUri;
    }
  }
  return <a href={link}><LinkIcon /></a>
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

export const userOrServiceLink = (data, type, options = {}) => {
  if (!data || !type || !data[type]) return "";
  if (!options.url) {
    options.url = "/explorer/";
  }
  if (data[type + 'Details']) {
    const { username, service } = data[type + 'Details'];
    let link = username ? username : data[type];
    if (service) {
      let serviceName = service;
      if (options.short && serviceName.length > 18) {
        serviceName = service.substring(0, 15).trim() + '...';
      }
      return <a href={options.url + link} className='bold green'>{serviceName}</a>;
    }
    if (username) {
      return <a href={options.url + link} className='bold blue'>{username}</a>;
    }
  }
  return "";
}

export const addressUsernameOrServiceLink = (data, type, options = {}) => {
  if (!options.url) {
    options.url = "/explorer/"
  }
  if (type === 'broker' && data?.broker === 'no broker') {
    return <b>{options.noBroker}</b>
  }
  if (userOrServiceLink(data, type) !== "") {
    return userOrServiceLink(data, type, options)
  }
  if (options.short) {
    return <a href={options.url + data[type]}>{shortAddress(data[type])}</a>
  }
  return <a href={options.url + data[type]}>{data[type]}</a>
}

export const userOrServiceName = (data) => {
  if (data) {
    const { service, username } = data;
    if (service) {
      return <b className='green'>{service}</b>;
    }
    if (username) {
      return <b className='blue'>{username}</b>;
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

//replace with txIdLink
export const txIdFormat = (txId) => {
  txId = txId.toLowerCase();
  if (window.innerWidth < 800) {
    return txId.substr(0, 6) + "..." + txId.substr(-6);
  }
  return txId;
}

export const shortHash = (id, n = 6) => {
  if (!id) return ""
  id = id.toString()
  return id.substr(0, n) + "..." + id.substr(-n)
}

export const shortAddress = (id) => {
  if (!id) return "";
  return id.substr(0, 6) + "..." + id.substr(-6);
}

export const convertedAmount = (nft, convertCurrency) => {
  if (nft?.amountInConvertCurrencies && nft.amountInConvertCurrencies[convertCurrency]) {
    return niceNumber(nft.amountInConvertCurrencies[convertCurrency], 2, convertCurrency)
  }
  return null
}

export const persentFormat = (small, big) => {
  if (!small && small !== 0) return;
  if (!big && big !== 0) return;
  if (small.value && big.value) {
    small = small.value;
    big = big.value;
  }
  small = Number(small);
  big = Number(big);
  if (big === 0) return "0%";
  return ((small / big) * 100).toFixed(2) + '%';
}

export const amountFormat = (amount, options = {}) => {
  if (!amount && amount !== "0" && amount !== 0) { return "" };
  const { value, currency, valuePrefix, issuer, type } = amountParced(amount);
  let showValue = value;

  if (value >= 100) {
    showValue = niceNumber(value);
  } else if (options.maxFractionDigits) {
    showValue = niceNumber(value, options.maxFractionDigits);
  }

  //add issued by (issuerDetails.service / username)
  if (type !== 'XRP' && options.tooltip) {
    return <>
      {showValue} {valuePrefix} {" "}
      <span className='tooltip'>
        <a href={"/explorer/" + issuer}>{currency}</a>
        <span className={'tooltiptext ' + options.tooltip}>
          {addressUsernameOrServiceLink(amount, 'issuer', { short: true })}
        </span>
      </span>
    </>
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
  // curency + " " - otherwise it is in the hex format
  currency = stripText(currency + " ")
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

export const fullDateAndTime = (timestamp, type = null) => {
  //used also in CSV file names as text
  if (!timestamp) return '';

  timestamp = timestamp * 1000

  let dateAndTime = new Date(timestamp).toLocaleString();
  if (type === 'expiration') {
    return new Date(timestamp) < new Date() ? <span className='orange'>{dateAndTime}</span> : dateAndTime;
  } else {
    return dateAndTime;
  }
}

export const timeFormat = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const dateFormat = (timestamp, stringParams = {}, params = {}) => {
  if (timestamp) {
    if (params.type?.toUpperCase() !== 'ISO') {
      timestamp = timestamp * 1000
    }
    if (stringParams) {
      return new Date(timestamp).toLocaleDateString([], stringParams)
    } else {
      return new Date(timestamp).toLocaleDateString()
    }
  }
  return ""
}

export const timeOrDate = (timestamp) => {
  //if today - return time, otherwise date
  return (new Date(timestamp * 1000)).setHours(0, 0, 0, 0) === (new Date()).setHours(0, 0, 0, 0) ? timeFormat(timestamp) : dateFormat(timestamp);
}

export const expirationExpired = (t, timestamp) => {
  return new Date(timestamp * 1000) < new Date() ? t("table.expired") : t("table.expiration");
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

const syntaxHighlight = (json) => {
  if (!json) return "";
  json = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    function (match) {
      var cls = "number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "key";
        } else {
          cls = "string";
        }
      } else if (/true|false/.test(match)) {
        cls = "boolean";
      } else if (/null/.test(match)) {
        cls = "null";
      }
      return '<span class="' + cls + '">' + match + "</span>";
    }
  );
}

export const codeHighlight = (json) => {
  return <pre
    dangerouslySetInnerHTML={{
      __html: syntaxHighlight(JSON.stringify(json, undefined, 4))
    }}
  />
}