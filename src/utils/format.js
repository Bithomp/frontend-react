import { Buffer } from 'buffer'; //transfer to the backend
import { isMobile } from "react-device-detect";

export const ledgerLink = (id) => {
  if (id) {
    return <a href={"/ledger/" + id}>#{id}</a>
  }
  return '';
}

export const txIdFormat = (txId) => {
  txId = txId.toLowerCase();
  if (isMobile) {
    return txId.substr(0, 6) + "..." + txId.substr(-6);
  }
  return txId;
}

export const amountFormat = (amount) => {
  //issuer, type: ['XRP', 'IOU', 'IOU demurraging', 'NFT']
  const { value, currency, valuePrefix } = amountParced(amount);
  return niceNumber(value) + " " + valuePrefix + " " + currency;
}

//transfer to the backend
const amountParced = (amount) => {

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
  return new Date(timestamp * 1000).toLocaleString();
}

export const timeFormat = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const dateFormat = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleDateString();
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
