import { useTranslation } from 'react-i18next';

import { ReactComponent as Logo } from "../../assets/images/logo.svg";
import './styles.scss';

export default function Receipt({ item, details }) {
  const { t } = useTranslation();

  if (!details) {
    return;
  }

  const onPrint = () => {
    const darkPage = document.querySelector('[data-theme="dark"]');
    if (darkPage) {
      darkPage.setAttribute("data-theme", "light");
      window.print();
      darkPage.setAttribute("data-theme", "dark");
    } else {
      window.print();
    }
  }

  let timestamp = null;
  let fiatPrice = 0;
  let xrpPrice = 0;
  let serviceName = "Service name";
  let txHash = '';

  if (item === "username") {
    serviceName = t("menu.usernames");
    const { bid, transactions } = details;
    if (bid) {
      timestamp = bid.createdAt; // CHANGE TO COMPLETED!!!
      fiatPrice = bid.priceInSEK;
      xrpPrice = bid.price;
    }

    if (transactions) {
      txHash = transactions[0].hash; // CHANGE TO HASH in BID !!!
    }

    /*
    {
      "bid": {
        "id": 907,
        "createdAt": 1653497569,
        "updatedAt": 165349767,
        "bithompid": "test13",
        "address": "rUjTn3UjrZC3jwisxqH6VpcTKccYSWiLDi",
        "destinationTag": 646158625,
        "action": "Registration",
        "status": "Completed",
        "price": 25.2,
        "totalReceivedAmount": 25.2,
        "currency": "XRP",
        "priceInSEK": 100,
        "country": ""
      },
      "transactions": [
        {
          "id": 352,
          "processedAt": 1653497667,
          "hash": "AABFBAA8321D6500B83EF18733A5A0DBE3A819D18FA6DDBEDE8CCEA3893DE844",
          "ledger": 28071047,
          "type": "Payment",
          "sourceAddress": "rUjTn3UjrZC3jwisxqH6VpcTKccYSWiLDi",
          "destinationAddress": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
          "destinationTag": 646158625,
          "amount": 25.2,
          "status": "Completed"
        }
      ]
    }
    */
  }

  timestamp = new Date(timestamp * 1000).toLocaleString();
  fiatPrice = fiatPrice.toFixed(2);
  xrpPrice = xrpPrice.toFixed(2);
  const rate = Math.floor((fiatPrice / xrpPrice) * 100) / 100;

  return (
    <>
      <div className="receipt" id="section-to-print">
        <div className="receipt-body">
          <div className="receipt-details">
            <div className="receipt-header">
              <Logo style={{ width: "40%" }} />
              <div>{timestamp}</div>
            </div>
            <table>
              <tbody>
                <tr>
                  <th>{t("receipt.quantity")}</th>
                  <th>{t("receipt.items")}</th>
                  <th style={{ textAlign: "right" }}>{t("receipt.price")}</th>
                </tr>
                <tr>
                  <td>1</td>
                  <td>{serviceName}</td>
                  <td style={{ textAlign: "right" }}>{fiatPrice}</td>
                </tr>
                <tr>
                  <td colSpan="2" className='bold uppercase'>{t("receipt.total")}</td>
                  <td className='bold' style={{ textAlign: "right" }}>SEK {fiatPrice}</td>
                </tr>
                <tr>
                  <td className='bold uppercase'>{t("receipt.paid")}</td>
                  <td>XRP {xrpPrice} ({rate} SEK/XRP)</td>
                  <td className='bold' style={{ textAlign: "right" }}>SEK {fiatPrice}</td>
                </tr>
              </tbody>
            </table>
            <div className="receipt-order-id">
              <b className='uppercase'>{t("receipt.order-id")}</b><br />
              {txHash}
            </div>
          </div>
          <div className="receipt-bottom">
            Bithomp AB, 559342-2867<br />
            Box 160,  101 23 Stockholm<br />
            VAT: SE559342286701
          </div>
        </div>
      </div>
      <p className="center">
        <input type="button" value={t("button.print")} className="button-action" onClick={onPrint} />
      </p>
    </>

  );
};
