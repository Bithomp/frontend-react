import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { amountFormat, addressUsernameOrServiceLink, shortAddress, timeFormat, dateFormat } from '../../utils/format';
import { LinkAccount, LinkTx } from '../../utils/links';
import { avatarServer, nativeCurrenciesImages, nativeCurrency } from '../../utils';
import { divide } from '../../utils/calc';
import { 
  FiDownload, 
  FiUpload, 
  // FiArrowRight, 
  // FiArrowDown, 
  // FiArrowUp,
  // FiRefreshCw,
  // FiCalendar,
  // FiClock,
  // FiHash,
  // FiTag,
  // FiMessageSquare,
  // FiDollarSign,
  // FiUser,
  // FiSettings,
  // FiShield,
  // FiLock,
  // FiUnlock,
  // FiCheck,
  // FiX
} from 'react-icons/fi';
import { FaCalendarAlt, FaClock } from "react-icons/fa";
import { FaArrowRightArrowLeft } from "react-icons/fa6";

const TransactionBlock = ({ tx, index, address }) => {
  if (!tx) return null;
  console.log(tx)
  const dateText = dateFormat(tx.date + 946684800) || '-';
  const timeText = timeFormat(tx.date + 946684800) || '-';

  const renderNftDetails = () => {
    if (tx.nftType && tx.mainList && tx.mainList.length > 0) {
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
                          style={{ 
                            color: '#008000',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            letterSpacing: '0.05em',
                            border: '1px solid #008000',
                            marginRight: '5px'
                          }}
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
    }
    return null;
  };

  const renderTxType = () => {
    if (tx?.arrow === 'exchange') {
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
    return tx.type;
  };

  return (
    <tr key={tx.hash || index}>
      <td className="center bold" style={{ width: 10 }}>{index + 1}.</td>
      <td className="gray" style={{ width: 100 }}>
        <FaCalendarAlt /> {dateText} <br />
        <FaClock /> {timeText}
      </td>
      <td>
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
                <span className="bold">Memo{tx.memos.length > 1 ? ` (${idx + 1})` : ''}:</span>
                <span className="gray"> {memo.data}</span>                
              </div>
            ))}
          </>
        )}
      </td>
      <td>
        {tx.deliveredAmount && (
          <>                
            <span className={tx.direction === 'incoming' ? 'green bold tooltip' : 'red bold tooltip'}>
              <span className="inline-flex gap-1">
                {amountFormat(tx.deliveredAmount, { short: true, maxFractionDigits: 2 })} 
                {tx.deliveredAmount?.issuer ? (
                  <Image src={avatarServer + tx.deliveredAmount.issuer} alt={tx.deliveredAmount.issuer} width={20} height={20} />
                ) : (
                  <Image src={nativeCurrenciesImages[nativeCurrency]} alt={nativeCurrency} width={20} height={20} />
                )}
              </span>
              <span className="tooltiptext no-brake">
                {amountFormat(tx.deliveredAmount)}
              </span>
            </span>
            <br />
          </>
        )}
        {tx?.arrow === 'exchange' && tx.lowList && tx.lowList.length > 0 && (
          <>
            {tx.lowList.map((amount, index) => (
              <>
                <span key={index} className={amount.colorClass === 'red' ? 'red bold tooltip' : 'green bold tooltip'}>
                  <span className="inline-flex gap-1">
                    {amount.formatted}
                    {amount.issuer ? (
                      <Image src={avatarServer + amount.issuer} alt={amount.issuer} width={20} height={20} />
                    ) : (
                      <Image src={nativeCurrenciesImages[nativeCurrency]} alt={nativeCurrency} width={20} height={20} />
                    )}
                  </span>
                  <span className="tooltiptext no-brake">
                    {amount.fullFormatted}
                  </span>
                </span>
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