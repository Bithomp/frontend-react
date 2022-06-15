import { useState, useEffect } from 'react';
import axios from 'axios';

const timeFormat = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Whales() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const response = await axios('v2/transactions?time_format=ISO');
      setData(response.data);
    }
    fetchData();
  }, [setData]);

  return <div className='whale-transactions-block'>
    {data?.map(tx => (
      <div key={tx.hash} className="tx-row">
        <span className='tx-time'>{timeFormat(tx.timestamp)}</span>
        <span className='tx-link'><a href={'/explorer/' + tx.hash.toLowerCase()}>{tx.hash.toLowerCase()}</a></span>
        <span className='tx-amount'>{tx.amount} {tx.currency}</span>
      </div>
    ))}
  </div>;
}