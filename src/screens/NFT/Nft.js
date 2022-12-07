import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../components/SEO';

import { fullDateAndTime } from '../../utils/format';

export default function Nft() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();
  const { id } = useParams();

  const checkApi = async () => {
    if (!id) {
      return;
    }
    const response = await axios('v2/nft/' + id + '?uri=true&metadata=true&history=true&sellOffers=true&buyOffers=true');
    const data = response.data;
    if (data) {
      setData(data);
    }
  }

  /*
    {
      "flags": {
        "burnable":false,
        "onlyXRP":false,
        "trustLine":false,
        "transferable":true
      },
      "issuer":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "nftokenID":"000800005822D634B22590727E3CB2431F03C3B8B041528316E72FD300000001",
      "nftokenTaxon":193871,
      "transferFee":0,
      "sequence":1,
      "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "uri":"68747470733A2F2F697066732E696F2F697066732F6261667962656964727274376C6C796A6232717167337533376F61676E77726D707779756F686C74373637676B6E7635707966796A3668706F68342F6D657461646174612E6A736F6E",
      "issuedAt":1667328041,
      "ownerChangedAt":1667328041,
      "deletedAt":null,
      "url":"https://cloudflare-ipfs.com/ipfs/bafybeidrrt7llyjb2qqg3u37oagnwrmpwyuohlt767gknv5pyfyj6hpoh4/metadata.json",
      "metadata":{
        "name":"Pirate Edition",
        "description":"-Sanctum NFTs 007-\n\n&quot;The discovery of treasure in the land of Atlantis.&quot;",
        "external_url":"https://www.xsanctumchain.com/nfts",
        "attributes":[
          {
            "trait_type":"skin",
            "value":"PIRATES SKIN"
          }
        ],
        "category":"collectibles",
        "md5hash":"3c18d8be15e2fa09879dfcf9ab7050d5",
        "is_explicit":false,
        "content_type":"image/jpeg",
        "image_url":"ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/image.jpeg",
        "animation_url":"ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/animation.jpeg"
      },
      "history":[
        {
          "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
          "changedAt":1667328041,
          "ledgerIndex":75463709,
          "txHash":"5F0162B9FB19F2D88F5EC38AEA9984B0BAD11E1CD960B135F4BA128BF980AA4D"
        }
      ],
      "sellOffers":[
        {
          "amount":"1500000000",
          "offerIndex":"7E2B5165926818732C3EC244ACD9B550294EF4B091713A99F6A083487D3ABA40",
          "nftOfferIndex":"7E2B5165926818732C3EC244ACD9B550294EF4B091713A99F6A083487D3ABA40",
          "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
          "expiration":null,
          "destination":null,
          "createdLedgerIndex":75483425,
          "createdTxHash":"9573894AE03706B98909DBABD9D670AF6BACBB704AA053E7DC15AD9EB4F79208"
        }
      ],
      "buyOffers":null
    }
  */

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return <>
    {data && <SEO title={t("menu.nft") + " " + data.metadata?.name} />}
    <div className="content-text">
      {data ?
        <>
          <h2 className="center">{id}</h2>
          <table className="table-large">
            <thead>
              <tr>
                <th>Issued</th>
                <th>Owner</th>
                <th>Issuer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{fullDateAndTime(data.issuedAt)}</td>
                <td><a href={"/explorer/" + data.owner}>{data.owner}</a></td>
                <td><a href={"/explorer/" + data.issuer}>{data.issuer}</a></td>
              </tr>
            </tbody>
          </table>
        </> : "Search for NFT ID"
      }
    </div>
  </>;
};
