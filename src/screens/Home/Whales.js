import { useState, useEffect } from 'react';
import axios from 'axios';
import { numberWithSpaces } from '../../utils';

const timeFormat = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Whales() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const response = await axios('v2/transactions?amount=10000..');
      setData(response.data);
    }
    fetchData();
  }, [setData]);

  /*
     {
      "hash":"59850C23F37E86A675F99C0DF29C3468C6F5BB53BDB7B9C73E6AB012DCE9D402",
      "timestamp":1663143343,
      "amount":"1000",
      "amountXRP":1000,
      "amountFiats":{
        "aed":"1240",
        "ars":"47980"
      },
      "counterparty":null,
      "currency":"XRP",
      "sourceAddress":"rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
      "destinationAddress":"rKb1QJ7dxZ3piULkWbpmTg8UK9eARKFLaY"
     }
   */

  return <div className='whale-transactions-block'>
    {data?.map(tx => (
      <div key={tx.hash} className="tx-row">
        <span className='tx-time'>{timeFormat(tx.timestamp)}</span>
        <span className='tx-link'><a href={'/explorer/' + tx.hash}>{tx.hash}</a></span>
        <span className='tx-amount'>{numberWithSpaces(parseInt(tx.amount))} {tx.currency}</span>
      </div>
    ))}
  </div>;
}