import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { amountFormat, addressUsernameOrServiceLink, shortAddress, timeFormat, dateFormat } from '../../utils/format';
import { LinkAccount, LinkTx } from '../../utils/links';
import { avatarServer, nativeCurrenciesImages, nativeCurrency } from '../../utils';
import { divide } from '../../utils/calc';
import { FiDownload, FiUpload } from 'react-icons/fi';
import { FaCalendarAlt, FaClock } from "react-icons/fa";
import { FaArrowRightArrowLeft } from "react-icons/fa6";

const renderFormattedAmount = (amount, key) => (
  <span key={key} className={amount.colorClass === 'red' ? 'red bold' : 'green bold'}>
    <span className="inline-flex gap-1 pb-1">
      <span className="tooltip">
        {amount.formatted}
        <span className="tooltiptext no-brake">
          {amount.fullFormatted}
        </span>
      </span>
      <span className="tooltip">
        {amount.issuer ? (
          <Image src={avatarServer + amount.issuer} alt={amount.issuer} width={20} height={20} className="rounded-full" />
        ) : (
          <Image src={nativeCurrenciesImages[nativeCurrency]} alt={nativeCurrency} width={20} height={20} />
        )}
        {amount.issuer && (
          <span className="tooltiptext no-brake">
            {addressUsernameOrServiceLink(amount, 'issuer')}
          </span>
        )}
      </span>
    </span>
  </span>
);

const TransactionBlock = ({ tx, index, address, isMobile }) => {
  if (!tx) return null;
  const dateText = dateFormat(tx.date + 946684800) || '-';
  const timeText = timeFormat(tx.date + 946684800) || '-';

  const renderNftDetails = () => {
    if (tx.nftType && tx.nftType !== 'nftokenacceptoffer' && tx.mainList && tx.mainList.length > 0) {
      return (
        <>
          {tx.mainList.map((nft, idx) => (
            <div key={idx}>
              {Number(nft.transferFee) > 0 && (
                <>
                  <span>Transfer fee: </span>
                  <span className="gray">{divide(nft.transferFee, 1000)}%</span>
                  <br />
                </>
              )}            
              {nft.flags && Object.entries(nft.flags).filter(([, value]) => value === true).length > 0 && (
                <>
                  <span>Flags: </span>
                  <span className="gray">
                    {nft.flags && Object.entries(nft.flags)
                      .filter(([, value]) => value === true)
                      .map(([flag]) => (
                        <span 
                          key={flag} 
                          className="flag"
                        >
                          {flag}
                        </span>
                      ))}
                  </span>
                  <br />
                </>
              )}
              {(nft.nftokenID || nft.uritokenID) && (
                <>
                  <span>NFT: </span>
                  <Link href={`/nft/${nft.nftokenID || nft.uritokenID}`}>
                    {shortAddress(nft.nftokenID || nft.uritokenID)}
                  </Link>
                  <br />
                </>
              )}
              {nft.amount && (
                <>
                  <span>Amount: </span>
                  <span className="bold tooltip">
                    {amountFormat(nft.amount, { short: true, maxFractionDigits: 2 })}                    
                    <span className="tooltiptext no-brake">
                      {amountFormat(nft.amount)}
                    </span>
                  </span>
                  {nft.amount.issuer && (
                    <span> by <LinkAccount address={nft.amount.issuer} short={4}/></span>
                  )}
                  <br />
                </>
              )}
              {nft.index && (
                <>
                    <span>Offer: </span>
                    <Link href={`/nft-offer/${nft.index}`}>
                      {shortAddress(nft.index)}
                    </Link>
                    <br />
                </>
              )}
            </div>
          ))}
        </>
      );
    } else if (tx.nftType === 'nftokenacceptoffer') {
      return (
        <>
          {tx.specification.nftokenBuyOffer && (
            <>
              <span>Buy offer: </span>
              <Link href={`/nft-offer/${tx.specification.nftokenBuyOffer}`}>
                {shortAddress(tx.specification.nftokenBuyOffer)}
              </Link>
              <br />
            </>
          )}
          {tx.specification.nftokenSellOffer && (
            <>
              <span>Sell offer: </span>
              <Link href={`/nft-offer/${tx.specification.nftokenSellOffer}`}>
                {shortAddress(tx.specification.nftokenSellOffer)}
              </Link>
              <br />
            </>
          )}
          {tx.specification.nftokenBrokerFee && (
            <>
              <span>Broker fee: </span>
              <span className="bold tooltip">
                {amountFormat(tx.specification.nftokenBrokerFee, { short: true, maxFractionDigits: 2 })}
                <span className="tooltiptext no-brake">
                  {amountFormat(tx.specification.nftokenBrokerFee)}
                </span>
              </span>
              <br />
            </>
          )}
          {tx.mainList && tx.mainList.length > 0 && (
            <>
              <span className="bold">NFT transfer</span>
              <br />
              {tx.mainList.filter((nft) => nft.status === 'removed').map((nft, idx) => (
                <div key={idx}>
                  <span>From: </span>
                  <span>{addressUsernameOrServiceLink(nft, 'address')}</span>
                  <br />
                </div>
              ))}
              {tx.mainList.filter((nft) => nft.status === 'added').map((nft, idx) => (
                <div key={idx}>
                  <span>To: </span>
                  <span>{addressUsernameOrServiceLink(nft, 'address')}</span>
                  <br />
                </div>
              ))}
              {tx.mainList.filter((nft) => nft.status === 'removed' && nft.flags && Object.entries(nft.flags).filter(([, value]) => value === true).length > 0).map((nft, idx) => (
                <div key={idx}>
                  <span>Flags: </span>
                  <span>{nft.flags && Object.entries(nft.flags).filter(([, value]) => value === true).map(([flag]) => flag).join(', ')}</span>
                  <br />
                </div>
              ))}
              {tx.mainList.filter((nft) => nft.status === 'added' && nft.nftokenID).map((nft, idx) => (
                <div key={idx}>
                  <span>NFT: </span>
                  <Link href={`/nft/${nft.nftokenID}`}>
                    {shortAddress(nft.nftokenID)}
                  </Link>
                  <br />
                </div>
              ))}
            </>
          )}
        </>
      );
    }
    return null;
  };

  const renderTxType = () => {
    if (tx?.type === 'Payment' && tx?.arrow === 'exchange') {
      return 'Exchange';
    }
    if (tx.nftType === 'NFT Sell Offer Creation') {
      return 'NFT Sell Offer Creation';
    }
    if (tx.nftType === 'NFT Buy Offer Creation') {
      return 'NFT Buy Offer Creation';
    }
    if (tx.specification?.source && tx.specification.source?.address !== address) {
      return <span>{tx.type} by {addressUsernameOrServiceLink(tx.specification.source, 'address')}</span>;
    }
    if (tx.type === 'Offercreate' || tx.type === 'Offercancel') {
      return tx.orderType;
    }
    if (tx.direction === 'escrow') {
      return tx.escrowType;
    }
    return tx.type;
  };

  return (
    <tr key={tx.hash || index} style={{ background: tx.failed ? 'repeating-linear-gradient(45deg, #f9e3b9, #f9e3b9 10px, #fff 10px, #fff 20px)' : '' }}>
      <td className="center bold" style={{ width: 10 }}>{index + 1}.</td>
      <td className="gray" style={{ width: 100 }}>
        <FaCalendarAlt /> {dateText} <br />
        <FaClock /> {timeText}
      </td>
      <td style={{ maxWidth: isMobile ? '100%' : 600, wordBreak: 'break-word' }}>
        <div>
          <span className="gray" style={{ marginRight: 5 }}><FaArrowRightArrowLeft /></span>
          <LinkTx tx={tx.hash}> {tx.hash} </LinkTx>
        </div>
        <span className="bold">
          {renderTxType()}
        </span>
        <br />            
        {tx.counterparty && (
          <>
            {tx.direction && (
              <>
                <span className={tx.direction === 'incoming' ? 'green' : 'red'} style={{ marginRight: 5 }}>
                  {tx.direction === 'incoming' ? <FiDownload /> : <FiUpload />}
                </span>
              </>
            )}
            <span className="gray">
              {addressUsernameOrServiceLink(tx.counterparty, 'address')}
            </span>
            <br />
          </>
        )}
        {renderNftDetails()}
        {(tx.arrow === 'amm') && (
          <>
            {tx.flag && (
              <>
                <span>Flag: </span>
                <span className="flag">{tx.flag}</span>
                <br />
              </>
            )}
            {tx.tradingFee && (
              <>
                <span>Trading fee: {divide(tx.tradingFee, 100000)}%</span>
                <br />
              </>
            )}
          </>
        )}
        {(tx.arrow === 'exchange' && tx.orderType && tx.flags && tx.flags.length > 0) && (
          <>
            <span>Flags: </span>
            {tx.flags.map((flag, idx) => (
              <span key={idx} className="flag">{flag}</span>
            ))}
            <br />
          </>
        )}
        {tx.direction === 'escrow' && tx.destination && (
          <>
            <span className="gray">Destination: </span>
            <span className="gray">{addressUsernameOrServiceLink(tx.destination, 'address') || tx.destination}</span>
            <br />
          </>
        )}
        {tx.direction === 'escrow' && tx.allowExecuteAfter && (
           <>
             <span className="gray">Execute after: </span>
             <span className="gray">{new Date(tx.allowExecuteAfter).toLocaleString()}</span>
             <br />
           </>
         )}        
         {tx.direction === 'escrow' && tx.allowCancelAfter && (
           <>
             <span className="gray">Cancel after: </span>
             <span className="gray">{new Date(tx.allowCancelAfter).toLocaleString()}</span>
             <br />
           </>
         )}
        {tx.direction === 'escrow' && tx.sequence && (
          <>
            <span className="gray">Sequence: </span>
            <span className="gray">#{tx.sequence}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.defaultRipple !== undefined && (
          <>
            <span className="bold">Default ripple: </span>
            <span className="bold">{tx.defaultRipple ? 'enabled' : 'disabled'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.disallowXRP !== undefined && (
          <>
            <span className="bold">Incoming {nativeCurrency}: </span>
            <span className="bold">{tx.disallowXRP ? 'disallow' : 'allow'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.requireDestTag !== undefined && (
          <>
            <span className="bold">Destination tag: </span>
            <span className="bold">{tx.requireDestTag ? 'require' : "don't require"}</span>
          </>
        )}
        {tx.direction === 'accountset' && tx.disableMaster !== undefined && (
          <>
            <span className="bold">Master key: </span>
            <span className="bold">{tx.disableMaster ? 'disabled' : 'enabled'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.noFreeze && (
          <>
            <span className="bold">No freeze: </span>
            <span className="bold">enabled</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.depositAuth !== undefined && (
          <>
            <span className="bold">Deposit authorization: </span>
            <span className="bold">{tx.depositAuth ? 'enabled' : 'disabled'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.requireAuth !== undefined && (
          <>
            <span className="bold">Require authorization: </span>
            <span className="bold">{tx.requireAuth ? 'enabled' : 'disabled'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.disallowIncomingCheck !== undefined && (
          <>
            <span className="bold">Incoming check: </span>
            <span className="bold">{tx.disallowIncomingCheck ? 'disallow' : 'allow'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.disallowIncomingPayChan !== undefined && (
          <>
            <span className="bold">Incoming payment channel: </span>
            <span className="bold">{tx.disallowIncomingPayChan ? 'disallow' : 'allow'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.disallowIncomingNFTokenOffer !== undefined && (
          <>
            <span className="bold">Incoming NFT offer: </span>
            <span className="bold">{tx.disallowIncomingNFTokenOffer ? 'disallow' : 'allow'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.disallowIncomingTrustline !== undefined && (
          <>
            <span className="bold">Incoming trust line: </span>
            <span className="bold">{tx.disallowIncomingTrustline ? 'disallow' : 'allow'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.enableTransactionIDTracking !== undefined && (
          <>
            <span className="bold">Transaction ID tracking: </span>
            <span className="bold">{tx.enableTransactionIDTracking ? 'enabled' : 'disabled'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.globalFreeze !== undefined && (
          <>
            <span className="bold">Global freeze: </span>
            <span className="bold">{tx.globalFreeze ? 'enabled' : 'disabled'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.authorizedMinter !== undefined && (
          <>
            <span className="bold">Authorized minter: </span>
            <span className="bold">{tx.authorizedMinter ? 'enabled' : 'disabled'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.nftokenMinter !== undefined && (
          <>
            <span className="bold">NFT minter: </span>
            <span className="bold">{tx.nftokenMinter || <span className="orange">removed</span>}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.allowTrustLineClawback !== undefined && (
          <>
            <span className="bold">Trust line Clawback: </span>
            <span className="bold">{tx.allowTrustLineClawback ? 'allowed' : 'disallow'}</span>
            <br />
          </>
        )}
        {tx.direction === 'accountset' && tx.disallowIncomingRemit !== undefined && (
          <>
            <span className="bold">Incoming Remit: </span>
            <span className="bold">{tx.disallowIncomingRemit ? 'disallow' : 'allow'}</span>
            <br />
          </>
        )}
        {tx.failed && (
          <>
            <span className="red bold">Failed: </span>
            <span className="red">{tx.statusText}</span>
            <br />
          </>
        )}
        {tx.destinationTag && (
          <>
            <span className="gray">Destination tag: {tx.destinationTag}</span>
            <br />
          </>
        )}
        {tx.sourceTag && (
          <>
            <span className="gray">Source tag: {tx.sourceTag}</span>
            <br />
          </>
        )}
        {tx.memos && tx.memos.length > 0 && (
          <>
            {tx.memos.map((memo, idx) => (
              <div key={idx}>
                {memo.data? (
                  <>
                  <span className="bold">Memo{tx.memos.length > 1 ? ` (${idx + 1})` : ''}:</span>
                  <span className="gray"> {memo.data}</span>                                  
                  </>
                ) : (
                  <>
                     <span className="bold">{memo.type}{tx.memos.length > 1 ? ` (${idx + 1})` : ''}:</span>
                     <span className="gray"> {memo.format}</span>                
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </td>
      <td className="right">
        {tx.deliveredAmount && (
          <>                
            <span className={tx.direction === 'incoming' ? 'green bold' : 'red bold'}>
              <span className="inline-flex gap-1">
                <span className="tooltip">
                  {amountFormat(tx.deliveredAmount, { short: true, maxFractionDigits: 2 })}
                  <span className="tooltiptext no-brake">
                    {amountFormat(tx.deliveredAmount)}
                  </span>
                </span>
                <span className="tooltip">
                  {tx.deliveredAmount?.issuer ? (
                    <Image src={avatarServer + tx.deliveredAmount.issuer} alt={tx.deliveredAmount.issuer} width={20} height={20} className="rounded-full" />
                  ) : (
                    <Image src={nativeCurrenciesImages[nativeCurrency]} alt={nativeCurrency} width={20} height={20} />
                  )}
                  <span className="tooltiptext no-brake">
                    {addressUsernameOrServiceLink(tx.deliveredAmount, 'issuer')}
                  </span>
                </span>
              </span>              
            </span>
            <br />
          </>
        )}
        {(tx?.arrow === 'exchange' || tx?.arrow === 'amm' || tx?.direction === 'check') && tx.lowList && tx.lowList.length > 0 && (
          <>
            {tx.lowList.map((amount, index) => (
              <>
                {renderFormattedAmount(amount, index)}
                <br />
              </>
            ))}
          </>
        )}
        {tx?.arrow === 'exchange' && tx.lowList.length === 0 && tx.mainList && tx.mainList.length > 0 && (
          <>
            {tx.mainList.map((amount, index) => (
              <>
                {renderFormattedAmount(amount, index)}
                <br />
              </>
            ))}
          </>
        )}

        <span className="gray">
          Fee: {amountFormat(tx.fee)}
        </span>
        <br />
      </td>
    </tr>
  );
};

export default TransactionBlock; 