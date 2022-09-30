import { useTranslation } from 'react-i18next';

import { fullDateAndTime } from '../../utils';

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
    if (details) {
      timestamp = details.completedAt;
      fiatPrice = details.priceInSEK;
      xrpPrice = details.price;
      txHash = details.txHash
    }

    /*
    {
      action: "Registration",
      address: "rpqVJrX7L4yx2vjYPpDC5DAGrdp92zcsMW",
      bithompid: "testtest1",
      completedAt: 1658841346,
      country: "SE",
      createdAt: 1658837571,
      currency: "XRP",
      destinationTag: 480657625,
      id: 933,
      price: 29.46,
      priceInSEK: 100,
      status: "Completed",
      totalReceivedAmount: 29.470000000000002,
      txHash: "5F622D6CA708F72B7ECAC575995739D4844C267A533889A595573E91316B2FA0"
      updatedAt: 1658841346
    }
    */
  }

  timestamp = fullDateAndTime(timestamp);
  fiatPrice = fiatPrice?.toFixed(2);
  xrpPrice = xrpPrice?.toFixed(2);
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
