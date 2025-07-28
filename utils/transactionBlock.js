import { amountFormat, shortAddress, addressUsernameOrServiceLink } from './format';
import { nativeCurrency } from '.';

export function txTypeToText(type, capitalize = false) {
  if (!type || typeof type !== 'string') {
    type = 'unknown';
  }

  let formattedType = '';
  
  switch (type.toLowerCase()) {
    case 'ticketcreate':
      formattedType = 'ticket creation';
      break;
    case 'offercancel':
      formattedType = 'order cancellation';
      break;
    case 'escrowcreate':
      formattedType = 'escrow creation';
      break;
    case 'escrowcancel':
      formattedType = 'escrow cancellation';
      break;
    case 'escrowfinish':
      formattedType = 'escrow execution';
      break;
    case 'checkcreate':
      formattedType = 'check creation';
      break;
    case 'checkcancel':
      formattedType = 'check cancellation';
      break;
    case 'checkcash':
      formattedType = 'check cashing';
      break;
    case 'accountset':
      formattedType = 'settings change';
      break;
    case 'accountdelete':
      formattedType = 'account deletion';
      break;
    case 'nftokenmint':
      formattedType = 'NFT minting';
      break;
    case 'nftokenburn':
      formattedType = 'NFT burning';
      break;
    case 'nftokencanceloffer':
      formattedType = 'NFT offer cancellation';
      break;
    case 'nftokenacceptoffer':
      formattedType = 'NFT offer accepting';
      break;
    case 'nftokencreateoffer':
      formattedType = 'NFT offer creation';
      break;
    case 'uritokenmint':
      formattedType = 'URI Token Mint';
      break;
    case 'uritokencreateselloffer':
      formattedType = 'URI Token Create Sell Offer';
      break;
    case 'uritokenbuy':
      formattedType = 'URI Token Buy';
      break;
    case 'uritokencancelselloffer':
      formattedType = 'URI Token Cancel Sell Offer';
      break;
    case 'uritokenburn':
      formattedType = 'URI Token Burn';
      break;
    case 'ammbid':
      formattedType = 'AMM Bid';
      break;
    case 'ammcreate':
      formattedType = 'AMM Create';
      break;
    case 'ammdelete':
      formattedType = 'AMM Delete';
      break;
    case 'ammdeposit':
      formattedType = 'AMM Deposit';
      break;
    case 'ammvote':
      formattedType = 'AMM Vote';
      break;
    case 'ammwithdraw':
      formattedType = 'AMM Withdraw';
      break;
    case 'diddelete':
      formattedType = 'DID Delete';
      break;
    case 'didset':
      formattedType = 'DID Set';
      break;
    case 'payment':
      formattedType = 'payment';
      break;
    case 'order':
      formattedType = 'order';
      break;
    case 'rippling':
      formattedType = 'rippling';
      break;
    case 'balance change':
      formattedType = 'balance change';
      break;
    default:
      formattedType = type || 'unknown';
      break;
  }

  if (capitalize && formattedType) {
    formattedType = formattedType.charAt(0).toUpperCase() + formattedType.slice(1);
  }

  return formattedType;
}

function formatAmount(amount, currency = nativeCurrency) {
  if (!amount) return null;
  
  const value = typeof amount === 'object' ? amount.value : amount;
  const currencyCode = typeof amount === 'object' ? amount.currency : currency;
  const issuer = typeof amount === 'object' ? amount.issuer : null;
  const issuerDetails = typeof amount === 'object' ? amount.issuerDetails : null;
  
  let colorClass = 'green';
  if (value < 0) {
    colorClass = 'red';
  } else if (value === 0) {
    colorClass = 'orange';
  }
  
  return {
    value,
    currency: currencyCode,
    issuer,
    issuerDetails,
    formatted: amountFormat(amount, { short: true, maxFractionDigits: 2 }),
    fullFormatted: amountFormat(amount),
    colorClass
  };
}

function formatPaymentDetails(tx, address) {
  const destination = tx.specification?.destination;
  const source = tx.specification?.source;
  const deliveredAmount = tx.deliveredAmount;
  
  let direction = null;
  let counterparty = null;
  let mainList = [];
  let lowList = [];
  let arrow = null;
  
  if (destination?.address === address && source?.address === address) {
    direction = 'exchange';
    arrow = 'exchange';
  } else if (destination?.address === address) {
    direction = 'incoming';
    counterparty = source;
    arrow = 'down';
    if (deliveredAmount) {
      mainList.push(formatAmount(deliveredAmount));
    }
  } else if (source?.address === address) {
    direction = 'outgoing';
    counterparty = destination;
    arrow = 'right';
    if (deliveredAmount) {
      const amount = formatAmount(deliveredAmount);
      amount.colorClass = 'red';
      mainList.push(amount);
    }
  }
  
  if (tx.myBalanceChanges) {
    lowList = tx.myBalanceChanges.map(change => formatAmount(change));
  }
  
  return {
    direction,
    counterparty,
    mainList,
    lowList,
    arrow,
    deliveredAmount: direction !== 'exchange' ? deliveredAmount : null,
    destinationTag: tx.specification?.destination?.tag,
    sourceTag: tx.specification?.source?.tag
  };
}


function formatOrderDetails(tx, address) {
  const specification = tx.specification;
  const submitter = tx.submitter;
  const fee = tx.outcome?.fee;
  const flags = specification?.flags;
  const trueFlags = flags ? Object.keys(flags).filter(key => flags[key]) : [];
  
  let arrow = 'exchange';
  let orderType = 'order';
  let lowList = [];
  
  if (tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.takerGets) {
    const takerGets = tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.takerGets;
    const negativeAmount = typeof takerGets === 'object' 
      ? { ...takerGets, value: -takerGets.value }
      : -takerGets;
    lowList.push(formatAmount(negativeAmount));
  }
  if (tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.takerPays) {
    lowList.push(formatAmount(tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.takerPays));
  }
  
  const mainList = tx.myBalanceChanges?.filter(change => !(change.currency === nativeCurrency && change.value.toString() === fee.toString()))
    ?.map(change => formatAmount(change));
  
  const isSellOrder = trueFlags.includes('sell');
  
  if (tx.myBalanceChanges?.length === 1 && 
      tx.myBalanceChanges[0].currency === nativeCurrency && 
      tx.myBalanceChanges[0].value.toString() === (-fee).toString()) {
    orderType = isSellOrder ? 'Sell order placed' : 'Buy order placed';
  } else {
    if (submitter !== address) {
      orderType = isSellOrder ? 'Sell order fulfilled' : 'Buy order fulfilled';
      if (specification?.sequence) {
        orderType += ` #${specification.sequence}`;
      }
    } else {
      orderType = isSellOrder ? 'Sell order placed and fulfilled' : 'Buy order placed and fulfilled';
    }
  }
  
  return {
    direction: 'order',
    arrow,
    mainList,
    lowList,
    orderType,
    specification: {
      direction: isSellOrder ? 'sell' : 'buy',
      sequence: specification?.sequence,
      takerGets: specification?.takerGets ? formatAmount(specification.takerGets) : null,
      takerPays: specification?.takerPays ? formatAmount(specification.takerPays) : null      
    },
    flags: trueFlags,
    counterparty: null
  };
}

function formatOrderCancellationDetails(tx, address) {
  const specification = tx.specification;
  const orderSequence = specification?.orderSequence;
  const flags = tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.flags;
  const trueFlags = flags ? Object.keys(flags).filter(key => flags[key]) : [];
  
  let mainList = [];
  let lowList = [];
  let arrow = 'exchange';
  
  if (tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.takerGets) {
    const takerGets = tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.takerGets;
    const negativeAmount = typeof takerGets === 'object' 
      ? { ...takerGets, value: -takerGets.value }
      : -takerGets;
    lowList.push(formatAmount(negativeAmount));
  }
  if (tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.takerPays) {
    lowList.push(formatAmount(tx.outcome?.orderbookChanges?.find(change => change.address === address)?.orderbookChanges[0]?.takerPays));
  }
  
  const orderType = `${trueFlags.includes('sell') ? 'Sell' : 'Buy'} order cancellation #${orderSequence}`;
  
  return {
    direction: 'orderCancellation',
    arrow,
    mainList,
    lowList,
    orderType,
    flags: trueFlags,
    specification: {
      direction: trueFlags.includes('sell') ? 'sell' : 'buy',
      orderSequence
    },
    counterparty: null
  };
}

function formatNftDetails(tx, address) {
  const type = tx.type;
  const specification = tx.specification;
  
  let mainList = [];
  let lowList = [];
  let arrow = null;
  let nftType = type;
  
  if (type === 'nftokenmint') {
    if (tx.outcome?.nftokenChanges) {
      // Handle array of objects with address, addressDetails, and nftokenChanges
      const nftChanges = tx.outcome.nftokenChanges;
      if (Array.isArray(nftChanges)) {
        mainList = nftChanges.flatMap(changeObj => {
          const { address, addressDetails, nftokenChanges } = changeObj;
          if (Array.isArray(nftokenChanges)) {
            return nftokenChanges.map(nft => {
              const nftInfo = tx.outcome?.affectedObjects?.nftokens?.[nft.nftokenID];
              return {
                ...nft,
                address,
                addressDetails,
                flags: nftInfo?.flags,
                transferFee: nftInfo?.transferFee,
                nftokenTaxon: nftInfo?.nftokenTaxon,
                sequence: nftInfo?.sequence,
                issuer: nftInfo?.issuer
              };
            });
          }
          return [];
        });
      }
    }
  } else if (type === 'uritokenmint') {
    if (tx.outcome?.uritokenChanges) {
      // Remove the check for change.address === address
      const uriChanges = tx.outcome.uritokenChanges;
      if (Array.isArray(uriChanges)) {
        mainList = uriChanges.flatMap(change => {
          const uriInfo = tx.outcome?.affectedObjects?.uritokens?.[change.uritokenID];
          return [{
            uritokenID: change.uritokenID,
            uri: change.uri,
            digest: change.digest,
            issuer: uriInfo?.issuer,
            status: change.status
          }];
        });
      }
    }
  } else if (type === 'nftokenacceptoffer') {
    // Handle balance changes for NFT accept offers
    if (tx.myBalanceChanges) {
      lowList = tx.myBalanceChanges.map(change => formatAmount(change));
    }
    
    // Handle NFT changes
    if (tx.outcome?.nftokenChanges) {
      // Handle array of objects with address, addressDetails, and nftokenChanges
      const nftChanges = tx.outcome.nftokenChanges;
      if (Array.isArray(nftChanges)) {
        mainList = nftChanges.flatMap(changeObj => {
          const { address, addressDetails, nftokenChanges } = changeObj;
          if (Array.isArray(nftokenChanges)) {
            return nftokenChanges.map(nft => {
              const nftInfo = tx.outcome?.affectedObjects?.nftokens?.[nft.nftokenID];
              return {
                ...nft,
                address,
                addressDetails,
                flags: nftInfo?.flags,
                transferFee: nftInfo?.transferFee,
                nftokenTaxon: nftInfo?.nftokenTaxon,
                sequence: nftInfo?.sequence,
                issuer: nftInfo?.issuer
              };
            });
          }
          return [];
        });
      }
    }
    
    // Handle URI token changes
    if (tx.outcome?.uritokenChanges) {
      // Remove the check for change.address === address
      const uriChanges = tx.outcome.uritokenChanges;
      if (Array.isArray(uriChanges)) {
        mainList = mainList.concat(uriChanges.flatMap(change => {
          const uriInfo = tx.outcome?.affectedObjects?.uritokens?.[change.uritokenID];
          return [{
            uritokenID: change.uritokenID,
            uri: change.uri,
            digest: change.digest,
            issuer: uriInfo?.issuer,
            status: change.status
          }];
        }));
      }
    }
  } else if (type === 'uritokenbuy') {
    // Handle balance changes for URI token buy
    if (tx.myBalanceChanges) {
      lowList = tx.myBalanceChanges.map(change => formatAmount(change));
    }
    
    // Handle URI token changes
    if (tx.outcome?.uritokenChanges) {
      // Remove the check for change.address === address
      const uriChanges = tx.outcome.uritokenChanges;
      if (Array.isArray(uriChanges)) {
        mainList = uriChanges.flatMap(change => {
          const uriInfo = tx.outcome?.affectedObjects?.uritokens?.[change.uritokenID];
          return [{
            uritokenID: change.uritokenID,
            uri: change.uri,
            digest: change.digest,
            issuer: uriInfo?.issuer,
            status: change.status
          }];
        });
      }
    }
  } else if (type === 'nftokencreateoffer') {
    if (specification?.flags?.sellToken) {
      nftType = 'NFT Sell Offer Creation';
    } else {
      nftType = 'NFT Buy Offer Creation';
    }
    
    // Handle NFT offer changes
    if (tx.outcome?.nftokenOfferChanges) {
      // Remove the check for change.address === address
      const offerChanges = tx.outcome.nftokenOfferChanges;
      if (Array.isArray(offerChanges)) {
        mainList = offerChanges.flatMap(change => change.nftokenOfferChanges || []);
      } else if (typeof offerChanges === 'object') {
        mainList = Object.values(offerChanges).flatMap(arr => arr);
      }
    }
  } else if (type === 'uritokencreateselloffer') {
    nftType = 'URI Token Sell Offer Creation';
    
    // Handle URI token offer changes
    if (tx.outcome?.uritokenOfferChanges) {
      // Remove the check for change.address === address
      const offerChanges = tx.outcome.uritokenOfferChanges;
      if (Array.isArray(offerChanges)) {
        mainList = offerChanges.flatMap(change => change.uritokenOfferChanges || []);
      } else if (typeof offerChanges === 'object') {
        mainList = Object.values(offerChanges).flatMap(arr => arr);
      }
    }
  } else if (type === 'nftokencanceloffer') {
    // Handle NFT offer cancellation
    if (specification?.nftokenOffers) {
      mainList = specification.nftokenOffers.map(offer => ({
        offerID: offer,
        action: 'cancelled'
      }));
    }    
    // Handle NFT offer changes from outcome
    if (tx.outcome?.nftokenOfferChanges) {
      // Remove the check for change.address === address
      const offerChanges = tx.outcome.nftokenOfferChanges;
      if (Array.isArray(offerChanges)) {
        mainList = offerChanges.flatMap(change => change.nftokenOfferChanges || []);
      } else if (typeof offerChanges === 'object') {
        mainList = Object.values(offerChanges).flatMap(arr => arr);
      }
    }

  } else if (type === 'uritokencancelselloffer') {
    // Handle URI token sell offer cancellation
    nftType = 'URI Token Sell Offer Cancellation';
    if (specification?.uritokenSellOffer) {
      mainList = [{
        offerID: specification.uritokenSellOffer,
        action: 'cancelled'
      }];
    }
    
    // Handle URI token offer changes from outcome
    if (tx.outcome?.uritokenOfferChanges) {
      // Remove the check for change.address === address
      const offerChanges = tx.outcome.uritokenOfferChanges;
      if (Array.isArray(offerChanges)) {
        mainList = offerChanges.flatMap(change => change.uritokenOfferChanges || []);
      } else if (typeof offerChanges === 'object') {
        mainList = Object.values(offerChanges).flatMap(arr => arr);
      }
    }
  } else if (type === 'nftokenburn') {
    if (tx.outcome?.nftokenChanges) {
      // Handle array of objects with address, addressDetails, and nftokenChanges
      const nftChanges = tx.outcome.nftokenChanges;
      if (Array.isArray(nftChanges)) {
        mainList = nftChanges.flatMap(changeObj => {
          const { address, addressDetails, nftokenChanges } = changeObj;
          if (Array.isArray(nftokenChanges)) {
            return nftokenChanges.map(nft => {
              const nftInfo = tx.outcome?.affectedObjects?.nftokens?.[nft.nftokenID];
              return {
                ...nft,
                address,
                addressDetails,
                flags: nftInfo?.flags,
                transferFee: nftInfo?.transferFee,
                nftokenTaxon: nftInfo?.nftokenTaxon,
                sequence: nftInfo?.sequence,
                issuer: nftInfo?.issuer,
                action: 'burned'
              };
            });
          }
          return [];
        });
      }
    }
  } else if (type === 'uritokenburn') {
    // Do not show for URI token burn (matches PHP logic)
    return null;
  }
  
  // Handle URI token operations
  if (type && type.startsWith('uritoken')) {
    if (tx.outcome?.uritokenChanges) {
      // Remove the check for change.address === address
      const uriChanges = tx.outcome.uritokenChanges;
      if (Array.isArray(uriChanges)) {
        mainList = uriChanges.flatMap(change => {
          const uriInfo = tx.outcome?.affectedObjects?.uritokens?.[change.uritokenID];
          return [{
            uritokenID: change.uritokenID,
            uri: change.uri,
            digest: change.digest,
            issuer: uriInfo?.issuer,
            status: change.status
          }];
        });
      }
    }
  }
  
  return {
    direction: 'nft',
    arrow,
    mainList,
    lowList,
    nftType,
    specification,
    counterparty: null
  };
}

function formatEscrowDetails(tx, address) {
  const type = tx.type;
  const submitter = tx.submitter;
  const escrowSequence = tx.outcome?.escrowChanges?.escrowSequence;
  const specification = tx.specification;
  const fee = tx.fee;
  
  let mainList = [];
  let lowList = [];
  let arrow = null;
  let escrowType = type;
  
  if (type === 'escrowcreate') {
    escrowType = `Escrow creation #${escrowSequence || tx.sequence}`;
     
    if (tx.rawTransaction?.Amount) {
      if (typeof tx.rawTransaction.Amount === 'object') {
        // IOU
        mainList.push(formatAmount({
          currency: tx.rawTransaction.Amount.currency,
          value: tx.rawTransaction.Amount.value,
          issuer: tx.rawTransaction.Amount.issuer
        }));
      } else {
        // XRP
        mainList.push(formatAmount({
          currency: nativeCurrency,
          value: tx.rawTransaction.Amount / 1000000
        }));
      }
    }
    
    const destination = specification?.destination;
    if (destination) {
      return {
        direction: 'escrow',
        arrow,
        mainList,
        lowList,
        escrowType,
        destination,
        allowExecuteAfter: specification?.allowExecuteAfter,
        allowCancelAfter: specification?.allowCancelAfter,
        counterparty: null
      };
    }
  } else if (type === 'escrowfinish' || type === 'escrowcancel') {
    if (submitter !== address) {
      return {
        direction: 'escrow',
        arrow,
        mainList,
        lowList,
        escrowType,
        executedBy: submitter,
        owner: specification?.owner ? specification.owner : null,
        escrowSequence: specification?.escrowSequence,
        counterparty: null
      };
    }
    
    if (type === 'escrowcancel') {
      lowList = tx.myBalanceChanges ? tx.myBalanceChanges.map(change => formatAmount(change)) : [];
      escrowType = `Escrow cancellation #${escrowSequence || tx.sequence}`;
    } else {
      escrowType = `Escrow execution #${escrowSequence || tx.sequence}`;
      if (tx.balanceChanges) {
        const balanceKeys = Object.keys(tx.balanceChanges);
        if (balanceKeys.length > 1) {
          const firstChange = tx.balanceChanges[balanceKeys[0]][0];
          if (firstChange.value === -fee) {
            mainList = tx.balanceChanges[balanceKeys[1]].map(change => formatAmount(change));
          } else {
            mainList = tx.balanceChanges[balanceKeys[0]].map(change => formatAmount(change));
          }
        }
      }
    }
  }
  
  return {
    direction: 'escrow',
    arrow,
    mainList,
    lowList,
    escrowType,
    counterparty: null
  };
}

function formatTrustlineDetails(tx, address) {
  const specification = tx.specification;
  const limit = specification?.limit;
  const currency = specification?.currency;
  const issuer = specification?.issuer;
  
  let mainList = [];
  let lowList = [];
  let arrow = null;
  let trustlineType = 'trustline';
  
  if (limit) {
    mainList.push({
      limit: formatAmount({ currency, value: limit, issuer }),
      ripplingDisabled: specification?.ripplingDisabled,
      frozen: specification?.frozen,
      authorized: specification?.authorized
    });
  }
  
  return {
    direction: 'trustline',
    arrow,
    mainList,
    lowList,
    trustlineType,
    specification: {
      currency,
      issuer,
      limit: limit ? formatAmount({ currency, value: limit, issuer }) : null,
      ripplingDisabled: specification?.ripplingDisabled,
      frozen: specification?.frozen,
      authorized: specification?.authorized
    },
    counterparty: null
  };
}

function formatAmmsDetails(tx, address) {
  const specification = tx.specification;
  const flags = specification?.flags;
  const tradingFlag = specification?.tradingFee;
  const arrow = 'amm';
  const mainList = [];
  // Get only the true flag
  const trueFlag = flags ? Object.keys(flags).find(key => flags[key] === true) : null;
  const lowList = tx.outcome?.balanceChanges?.find(bc => bc.address === address)?.balanceChanges
    ?.filter(change => !(change.currency === nativeCurrency && change.value.toString() === (-tx.outcome?.fee).toString()))
    ?.map(change => formatAmount(change));
  
  return {
    direction: 'amm',
    arrow,
    specification,
    flag: trueFlag || null,
    tradingFee: tradingFlag || null,
    mainList,
    lowList,
    counterparty: null
  }
}

function formatFailedStatus(status) {
  return status && status !== 'tesSUCCESS';
}

function formatCheckDetails(tx, address) {
  const type = tx.type;
  const specification = tx.specification; 
  
  
  let mainList = [];
  let lowList = [];
  let arrow = null;
  let checkType = type; 

  lowList = tx.outcome?.checkChanges?.sendMax ? [formatAmount(tx.outcome?.checkChanges?.sendMax)] : [];
 

  return {
    direction: 'check',
    arrow,
    mainList,
    lowList,
    checkType,
    specification,
    counterparty: null
  };
}

function formatAccountSetDetails(tx, address) {
  const specification = tx.specification;
  const defaultRipple = specification?.defaultRipple;
  const disallowXRP = specification?.disallowXRP;
  const requireDestTag = specification?.requireDestTag;
  const disableMaster = specification?.disableMaster;
  const noFreeze = specification?.noFreeze;
  const depositAuth = specification?.depositAuth;
  const requireAuth = specification?.requireAuth;
  const disallowIncomingCheck = specification?.disallowIncomingCheck;
  const disallowIncomingPayChan = specification?.disallowIncomingPayChan;
  const disallowIncomingNFTokenOffer = specification?.disallowIncomingNFTokenOffer;
  const disallowIncomingTrustline = specification?.disallowIncomingTrustline;
  const enableTransactionIDTracking = specification?.enableTransactionIDTracking;
  const globalFreeze = specification?.globalFreeze;
  const authorizedMinter = specification?.authorizedMinter;
  const nftokenMinter = specification?.nftokenMinter;
  const allowTrustLineClawback = specification?.allowTrustLineClawback;
  const disallowIncomingRemit = specification?.disallowIncomingRemit;

  const mainList = [];
  const lowList = [];
  const arrow = null;

    return {
      direction: 'accountset',
      arrow,
      mainList,
      lowList,
      specification,
      defaultRipple,
      disallowXRP,
      requireDestTag,
      disableMaster,
      noFreeze,
      depositAuth,
      requireAuth,
      disallowIncomingCheck,
      disallowIncomingPayChan,
      disallowIncomingNFTokenOffer,
      disallowIncomingTrustline,
      enableTransactionIDTracking,
      globalFreeze,
      authorizedMinter,
      nftokenMinter,
      allowTrustLineClawback,
      disallowIncomingRemit,
      counterparty: null
    };
}

function formatAccountDeleteDetails(tx, address) {
  const specification = tx.specification;
  const destination = specification?.destination;
  const destinationTag = specification?.destinationTag;
  const deliveredAmount = tx.outcome?.deliveredAmount;

  const mainList = [];
  const lowList = [];
  const arrow = null;

  return {
    direction: 'accountdelete',
    arrow,
    mainList,
    lowList,
    specification,
    destination,
    destinationTag: destinationTag || null,
    deliveredAmount: deliveredAmount || null,
    counterparty: null
  };
} 

  function getTransactionStatus(status) {
  const statusMap = {
    'tesSUCCESS': 'Success',
    'tecPATH_DRY': 'Path dry',
    'tecPATH_PARTIAL': 'Path partial',
    'tecUNFUNDED_PAYMENT': 'Unfunded payment',
    'tecINSUFFICIENT_FUNDS': 'Insufficient funds',
    'tecINSUFFICIENT_RESERVE': 'Insufficient reserve',
    'tecNO_DST': 'Destination not found',
    'tecNO_DST_INSUF_XRP': 'Destination not found, insufficient XRP',
    'tecDST_TAG_NEEDED': 'Destination tag needed',
    'tecFROZEN': 'Frozen',
    'tecNO_AUTH': 'Not authorized',
    'tecNO_LINE': 'No trust line',
    'tecNO_LINE_INSUF_RESERVE': 'No trust line, insufficient reserve',
    'tecNO_LINE_REDUNDANT': 'No trust line redundant',
    'tecINSUF_RESERVE_LINE': 'Insufficient reserve for trust line',
    'tecINSUF_RESERVE_OFFER': 'Insufficient reserve for offer',
    'tecINSUFFICIENT_PAYMENT': 'Insufficient payment',
    'tecUNFUNDED': 'Unfunded',
    'tecUNFUNDED_AMM': 'Unfunded AMM',
    'tecUNFUNDED_OFFER': 'Unfunded offer',
    'tecEXPIRED': 'Expired',
    'tecTOO_SOON': 'Too soon',
    'tecHAS_OBLIGATIONS': 'Has obligations',
    'tecDIR_FULL': 'Directory full',
    'tecDUPLICATE': 'Duplicate',
    'tecCRYPTOCONDITION_ERROR': 'Crypto condition error',
    'tecCLAIM': 'Claim',
    'tecFAILED_PROCESSING': 'Failed processing',
    'tecINTERNAL': 'Internal error',
    'tecINVARIANT_FAILED': 'Invariant failed',
    'tecKILLED': 'Killed',
    'tecMAX_SEQUENCE_REACHED': 'Max sequence reached',
    'tecNEED_MASTER_KEY': 'Need master key',
    'tecNO_ALTERNATIVE_KEY': 'No alternative key',
    'tecNO_ENTRY': 'No entry',
    'tecNO_ISSUER': 'No issuer',
    'tecNO_PERMISSION': 'No permission',
    'tecNO_REGULAR_KEY': 'No regular key',
    'tecNO_SUITABLE_NFTOKEN_PAGE': 'No suitable NFT page',
    'tecNO_TARGET': 'No target',
    'tecOBJECT_NOT_FOUND': 'Object not found',
    'tecOVERSIZE': 'Oversize',
    'tecOWNERS': 'Owners'
  };
  
  return statusMap[status] || status || 'Unknown';
}

export function processTransactionBlock(tx, address) {
 
  const normalizedTx = {
    type: tx.tx?.TransactionType?.toLowerCase(),
    status: tx.meta?.TransactionResult || tx.outcome?.result,
    hash: tx.tx?.hash,
    date: tx.tx?.date,
    fee: tx.tx?.Fee,
    sequence: tx.tx?.Sequence,
    submitter: tx.tx?.Account,
    memos: tx.specification?.memos,
    rawTransaction: tx.tx,
    specification: tx.specification,
    outcome: tx.outcome,
    deliveredAmount: tx.outcome?.deliveredAmount,
    myBalanceChanges: (tx.outcome?.balanceChanges?.find(bc => bc.address === address)?.balanceChanges || [])
  };

  const detailFormatters = {
    payment: formatPaymentDetails,
    offercreate: formatOrderDetails,
    offercancel: formatOrderCancellationDetails,
    escrowcreate: formatEscrowDetails,
    escrowfinish: formatEscrowDetails,
    escrowcancel: formatEscrowDetails,
    checkcreate: formatCheckDetails,
    checkcash: formatCheckDetails,
    checkcancel: formatCheckDetails,
    accountset: formatAccountSetDetails,
    accountdelete: formatAccountDeleteDetails,
    trustset: formatTrustlineDetails
  };

  const details = detailFormatters[normalizedTx.type] 
    ? detailFormatters[normalizedTx.type](normalizedTx, address)
    : (normalizedTx.type?.startsWith('nftoken') || normalizedTx.type?.startsWith('uritoken'))
      ? formatNftDetails(normalizedTx, address)
      : (normalizedTx.type?.startsWith('amm'))
        ? formatAmmsDetails(normalizedTx, address)
        : {};

  return {
    type: txTypeToText(normalizedTx.type, true),
    status: normalizedTx.status,
    statusText: getTransactionStatus(normalizedTx.status),
    failed: formatFailedStatus(normalizedTx.status),
    hash: normalizedTx.hash,
    date: normalizedTx.date,
    fee: normalizedTx.fee,
    sequence: normalizedTx.sequence,
    submitter: normalizedTx.submitter,
    memos: normalizedTx.memos,
    ...details
  };
}

export function processTransactionBlocks(transactions, address) {
  return Array.isArray(transactions) 
    ? transactions.map(tx => processTransactionBlock(tx, address))
    : [];
} 