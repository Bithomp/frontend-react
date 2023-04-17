import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react';
import axios from 'axios'
import { CSVLink } from "react-csv"
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { useWidth } from '../../utils';
import { nftsExplorerLink, addressUsernameOrServiceLink } from '../../utils/format';

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'

export default function NftDistribution() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = router.query
  const windowWidth = useWidth()

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userData, setUserData] = useState({});

  const checkApi = async () => {
    if (!id) {
      return;
    }
    /*
      {
        "issuer": "rDANq225BqjoyiFPXGcpBTzFdQTnn6aK6z",
        "issuerDetails": {
          "username": "Junkies",
          "service": "Junkies"
        },
        "list": "owners",
        "totalNfts": 4730,
        "totalOwners": 996,
        "owners": [
          {
            "owner": "rDANq225BqjoyiFPXGcpBTzFdQTnn6aK6z",
            "ownerDetails": {
              "username": "Junkies",
              "service": "Junkies"
            },
            "count": 500
          },
      */
    const response = await axios('v2/nft-count/' + id + '?list=owners').catch(error => {
      setErrorMessage(t("error." + error.message))
    });
    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      if (newdata.issuer) {
        setUserData({
          username: newdata.issuerDetails.username,
          service: newdata.issuerDetails.service,
          address: newdata.issuer
        });

        if (newdata.owners.length > 0) {
          setErrorMessage("");
          setData(newdata);
        } else {
          setErrorMessage(t("nft-distribution.no-nfts"));
        }
      } else {
        if (newdata.error) {
          setErrorMessage(newdata.error);
        } else {
          setErrorMessage("Error");
          console.log(newdata);
        }
      }
    }
  }

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  let csvHeaders = [
    { label: t("table.owner"), key: "owner" },
    { label: t("table.username"), key: "ownerDetails.username" },
    { label: t("table.count"), key: "count" }
  ];

  return <>
    <SEO title={t("nft-distribution.header") + " " + id} />
    <SearchBlock
      searchPlaceholderText={t("explorer.enter-address")}
      userData={userData}
      tab="nft-distribution"
    />
    <div className="content-text" style={{ marginTop: "20px" }}>
      {data?.totalNfts &&
        <p className='center'>
          <Trans i18nKey="nft-distribution.text0" values={{ users: data.totalOwners, nfts: data.totalNfts }}>
            {{users: data.totalOwners}} users own {{nfts: data.totalNfts}} NFTs
          </Trans>
          <br /><br />
          <CSVLink
            data={data.owners}
            headers={csvHeaders}
            filename={'nft_destribution_' + data.issuer + '_UTC_' + (new Date().toJSON()) + '.csv'}
            className='button-action thin narrow'
          >
            ⇩ CSV
          </CSVLink>
        </p>
      }
      {id ?
        <table className={"table-large" + (windowWidth < 640 ? "" : " shrink")}>
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              <th className='center'>{t("table.count")}</th>
              <th>{t("table.owner")}</th>
              <th className='center'>{t("table.nfts")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'>
                <td colSpan="100">
                  <span className="waiting"></span>
                  <br />{t("general.loading")}
                </td>
              </tr>
              :
              <>
                {!errorMessage ? data.owners?.map((user, i) =>
                  <tr key={i}>
                    <td className="center">{i + 1}</td>
                    <td className='center'>{user.count}</td>
                    <td>{addressUsernameOrServiceLink({ owner: user.owner, ownerDetails: user.ownerDetails }, 'owner', { short: (windowWidth < 640) })}</td>
                    <td className='center'>
                      {
                        nftsExplorerLink(
                          {
                            owner: user.owner,
                            ownerDetails: user.ownerDetails,
                            issuer: data.issuer,
                            issuerDetails: data.issuerDetails
                          }
                        )
                      }
                    </td>
                  </tr>)
                  :
                  <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                }
              </>
            }
          </tbody>
        </table>
        :
        <>
          <h2 className='center'>{t("nft-distribution.header")}</h2>
          <p className='center'>
            {t("nft-distribution.desc")}
          </p>
        </>
      }
    </div>
  </>;
};
