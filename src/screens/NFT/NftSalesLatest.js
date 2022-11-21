import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import axios from 'axios';

import { title, stripText } from '../../utils';
import { timeFormat, amountFormat } from '../../utils/format';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function NftSalesLatest() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();

  const checkApi = async () => {
    const response = await axios('v2/nft/offer/lastSold');
    const data = response.data;
    if (data) {
      setData(data);
    }
  }

  /*
  [
    {
      "nftokenID": "00081388C824E011D9C724E35F35F58EBE49D169414E7FF2A0F2F8C70000032C",
      "offerIndex": "45F79CC7514AACB7BC830FDF0014DA947B0391C315870354E150CE16C8A057C2",
      "createdAt": 1668435662,
      "createdLedgerIndex": 75749972,
      "createdTxHash": "8740E0C81550068C81610602D391B3F6869864FB5C071FCD980FFC4D2D080CC9",
      "account": "rSV41U2DDhQNutWE9CHdXwU8T6TjgciKr",
      "owner": "rSV41U2DDhQNutWE9CHdXwU8T6TjgciKr",
      "destination": "rpQhwaXtiVVjg9VjBEW4LuR9eG9c8zYaQx",
      "expiration": 1668435959,
      "amount": {
        "currency": "4B65677352500000000000000000000000000000",
        "issuer": "rJzCA6r1UXKLxVpLf31XVb5Na57hYYZ6n2",
        "value": "247.5247525"
      },
      "flags": {
        "sellToken": true
      },
      "acceptedAt": 1668435710,
      "acceptedLedgerIndex": 75749984,
      "acceptedTxHash": "EE62D39243190FAE42BBCA72D6C61751388A942AACB235A6B4B6DD392CEA13CA",
      "nftoken": {
        "flags": {
          "burnable": false,
          "onlyXRP": false,
          "trustLine": false,
          "transferable": true
        },
        "issuer": "rKEGKWH2wKCyY2GNDtkNRqXhnYEsXZM2dP",
        "nftokenID": "00081388C824E011D9C724E35F35F58EBE49D169414E7FF2A0F2F8C70000032C",
        "nftokenTaxon": 0,
        "transferFee": 5000,
        "sequence": 812,
        "owner": "rpQhwaXtiVVjg9VjBEW4LuR9eG9c8zYaQx",
        "uri": "68747470733A2F2F6B65677372702E636F6D2F6E66742F6A736F6E2F3831312E6A736F6E",
        "nftSerial": 812,
        "issuedAt": 1667295801,
        "ownerChangedAt": 1668435710,
        "deletedAt": null,
        "url": "https://kegsrp.com/nft/json/811.json",
        "metadata": {
          "name": "KegsRP #811",
          "description": "A collection of Kegs on the XRPL",
          "image": "https://kegsrp.com/nft/img/811.png",
          "edition": 811,
          "date": 1661754811191,
          "attributes": [
            {
              "trait_type": "Background",
              "value": "Blue"
            }
          ]
        }
      }
    }
  */

  useEffect(() => {
    title(t("menu.nft-sales-latest"));
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <div className="content-text">
      <h2 className="center">{t("menu.nft-sales-latest")}</h2>
      <table className="table-large">
        <thead>
          <tr>
            <th>{t("table.time")}</th>
            <th>{t("table.amount")}</th>
            <th>{t("table.name")}</th>
            <th>{t("table.serial")}</th>
            <th>NFT</th>
            <th>{t("table.transaction")}</th>
          </tr>
        </thead>
        <tbody>
          {data ?
            <>
              {data.length ? data.map((nft, i) =>
                <tr key={i}>
                  <td>{timeFormat(nft.acceptedAt)}</td>
                  <td>{amountFormat(nft.amount)}</td>
                  <td>{nft.nftoken?.metadata?.name ? stripText(nft.nftoken.metadata.name) : "---//---"}</td>
                  <td>{nft.nftoken.nftSerial}</td>
                  <td className='center'><a href={"/explorer/" + nft.nftokenID}><LinkIcon /></a></td>
                  <td className='center'><a href={"/explorer/" + nft.acceptedTxHash}><LinkIcon /></a></td>
                </tr>
              ) : <tr className='center'><td colSpan="6">{t("general.no-data")}</td></tr>}
            </>
            :
            <tr className='center'><td colSpan="6"><span className="waiting"></span></td></tr>
          }
        </tbody>
      </table>

    </div>
  </>;
};
