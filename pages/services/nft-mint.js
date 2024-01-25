import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from "../../utils/mobile"

import {
  addAndRemoveQueryParams,
  encode
} from '../../utils'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { uri, digest } = query
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      uriQuery: uri || "",
      digestQuery: digest || "",
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

import CheckBox from '../../components/UI/CheckBox'
import SEO from '../../components/SEO'

export default function NftMint({ setSignRequest, uriQuery, digestQuery }) {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  const [uri, setUri] = useState(uriQuery)
  const [digest, setDigest] = useState(digestQuery)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  let uriRef

  useEffect(() => {
    setErrorMessage("")
  }, [i18n.language])

  const onUriChange = e => {
    let uri = e.target.value
    setUri(uri)
    let queryAddList = [];
    let queryRemoveList = [];
    if (uri) {
      queryAddList.push({
        name: "uri",
        value: uri
      })
      setErrorMessage("");
    } else {
      queryRemoveList.push("uri");
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
  }

  const onDigestChange = e => {
    let digest = e.target.value
    setDigest(digest)
    let queryAddList = [];
    let queryRemoveList = [];
    if (digest) {
      queryAddList.push({
        name: "digest",
        value: digest
      })
      setErrorMessage("");
    } else {
      queryRemoveList.push("digest");
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
  }

  const onSubmit = async () => {
    if (!uri) {
      setErrorMessage("Please enter URI");
      uriRef?.focus();
      return;
    }

    if (!agreeToSiteTerms) {
      setErrorMessage("Please agree to the Terms and conditions")
      return;
    }

    if (!agreeToPrivacyPolicy) {
      setErrorMessage("Please agree to the Privacy policy")
      return;
    }

    setErrorMessage("")

    let request = {
      TransactionType: "URITokenMint",
      Memos: [
        {
          "Memo": {
            "MemoData": encode("NFT Mint")
          }
        }
      ]
    }

    if (uri) {
      request.URI = encode(uri)
    }

    if (digest) {
      request.Digest = digest
    }

    setSignRequest({
      wallet: "xumm",
      request,
    })
  }

  useEffect(() => {
    if (agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage("")
    }
  }, [agreeToSiteTerms, agreeToPrivacyPolicy])

  return <>
    <SEO
      title="NFT Mint"
    />
    <div className="page-services-nft-mint content-center">
      <h1 className="center">NFT Mint</h1>
      <p>
        You can use this page to create a new NFT, a unique digital asset that can be used in a variety of applications.
      </p>

      <p>URI that points to the data or metadata associated with the NFT:</p>
      <div className="input-validation">
        <input placeholder="URI" value={uri} onChange={onUriChange} className="input-text" ref={node => { uriRef = node; }} spellCheck="false" maxLength="256" />
      </div>

      <p>Digest:</p>
      <div className="input-validation">
        <input placeholder="Digest" value={digest} onChange={onDigestChange} className="input-text" spellCheck="false" maxLength="64" />
      </div>

      <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} >
        <Trans ns="username" i18nKey="step0.agree-terms-site">
          I agree with the <Link href="/terms-and-conditions" target="_blank">Terms and conditions</Link>.
        </Trans>
      </CheckBox>

      <CheckBox checked={agreeToPrivacyPolicy} setChecked={setAgreeToPrivacyPolicy} >
        <Trans ns="username" i18nKey="step0.agree-privacy-policy">
          I agree with the <Link href="/privacy-policy" target="_blank">Privacy policy</Link>.
        </Trans>
      </CheckBox>

      <p className="center">
        <input type="button" value={t("button.continue")} className="button-action" onClick={onSubmit} />
      </p>

      <p className="red center" dangerouslySetInnerHTML={{ __html: errorMessage || "&nbsp;" }} />
    </div>
  </>
}
