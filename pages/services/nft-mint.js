import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from "../../utils/mobile"
import { sha512 } from 'crypto-hash'
import axios from 'axios'

import {
  addAndRemoveQueryParams,
  encode,
  isIdValid,
  isValidJson
} from '../../utils'

const checkmark = "/images/checkmark.svg"

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
  const [metadataError, setMetadataError] = useState("")
  const [calculateDigest, setCalculateDigest] = useState(false)
  const [metadata, setMetadata] = useState("")
  const [metadataStatus, setMetadataStatus] = useState("")
  const [metaLoadedFromUri, setMetaLoadedFromUri] = useState(false)

  let uriRef
  let digestRef

  useEffect(() => {
    setErrorMessage("")
  }, [i18n.language])

  const onUriChange = e => {
    let uri = e.target.value
    setUri(uri)
    setMetaLoadedFromUri(false)
    setMetadata("")
    setDigest("")
    setMetadataError("")
    let queryAddList = []
    let queryRemoveList = []
    if (uri) {
      queryAddList.push({
        name: "uri",
        value: uri
      })
      setErrorMessage("")
    } else {
      queryRemoveList.push("uri")
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
  }

  const loadMetadata = async () => {
    if (uri) {
      setMetaLoadedFromUri(false)
      setMetadataStatus("Loading metadata...")
      const getMetadata = async () => {
        const response = await axios.get('v2/metadata?url=' + uri).catch(error => {
          console.log(error)
          setMetadataStatus("error")
        })
        if (response?.data) {
          if (response.data?.metadata) {
            setMetaLoadedFromUri(true)
            setMetadata(JSON.stringify(response.data.metadata, undefined, 4))
            checkDigest(response.data.metadata)
            setMetadataStatus("")
          } else if (response.data?.message) {
            setMetadataStatus(response.data?.message)
          } else {
            setMetadataStatus("error 3")
          }
        }
      }
      getMetadata()
    }
  }

  const onDigestChange = e => {
    if (!calculateDigest) {
      let digest = e.target.value
      setDigest(digest)
    }
  }

  const onSubmit = async () => {
    if (!uri) {
      setErrorMessage("Please enter URI")
      uriRef?.focus()
      return
    }

    if (digest && !isIdValid(digest)) {
      setErrorMessage("Please enter a valid Digest")
      digestRef?.focus()
      return
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
      redirect: "nft",
      request,
    })
  }

  useEffect(() => {
    if (agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage("")
    }
  }, [agreeToSiteTerms, agreeToPrivacyPolicy])

  useEffect(() => {
    if (calculateDigest) {
      setDigest("")
    }
  }, [calculateDigest])

  useEffect(() => {
    if (digest) {
      let queryAddList = []
      let queryRemoveList = []
      if (digest) {
        queryAddList.push({
          name: "digest",
          value: digest
        })
        setErrorMessage("")
      } else {
        queryRemoveList.push("digest")
      }
      addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    }
  }, [digest])

  const onMetadataChange = e => {
    setDigest("")
    setMetadataError("")
    let metadata = e.target.value
    setMetadata(metadata)
    if (!metaLoadedFromUri) {
      if (metadata && isValidJson(metadata)) {
        checkDigest(metadata)
      } else {
        setMetadataError("Please enter valid JSON")
      }
    }
  }

  const checkDigest = async metadata => {
    if (!metadata) return
    let ourDigest = await sha512(JSON.stringify(metadata)?.trim())
    ourDigest = ourDigest.toString().slice(0, 64)
    setDigest(ourDigest.toUpperCase())
  }

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
        <input
          placeholder="ipfs://bafkreignnol62jayyt3hbofhkqvb7jolxyr4vxtby5o7iqpfi2r2gmt6fa4"
          value={uri}
          onChange={onUriChange}
          className="input-text"
          ref={node => { uriRef = node; }}
          spellCheck="false"
          maxLength="256"
        />
      </div>

      <CheckBox checked={calculateDigest} setChecked={setCalculateDigest} >
        Add <b>Digest</b> (recommended)
      </CheckBox>

      {calculateDigest &&
        <>
          <p>
            The digest is calculated from the metadata. It is used to verify that the URI and the metadata have not been tampered with.
          </p>

          <button
            className="button-action thin"
            onClick={loadMetadata}
          >
            Load metadata
          </button>
          {" "}
          <b className='orange'>{metadataStatus}</b>

          <p>Metadata: <b className='orange'>{metadataError}</b></p>
          <textarea
            value={metadata}
            placeholder='Paste your JSON metadata here'
            onChange={onMetadataChange}
            className='input-text'
            autoFocus={true}
            readOnly={metaLoadedFromUri}
          />

          <p>Digest:</p>
          <div className="input-validation">
            <input
              placeholder="Digest"
              value={digest}
              onChange={onDigestChange}
              className="input-text"
              ref={node => { digestRef = node; }}
              spellCheck="false"
              maxLength="64"
              readOnly={true}
            />
            {isIdValid(digest) && <img src={checkmark} className="validation-icon" alt="validated" />}
          </div>
        </>
      }

      <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} >
        I agree with the <Link href="/terms-and-conditions" target="_blank">Terms and conditions</Link>.
      </CheckBox>

      <CheckBox checked={agreeToPrivacyPolicy} setChecked={setAgreeToPrivacyPolicy} >
        I agree with the <Link href="/privacy-policy" target="_blank">Privacy policy</Link>.
      </CheckBox>

      <p className="center">
        <input type="button" value={t("button.continue")} className="button-action" onClick={onSubmit} />
      </p>

      <p className="red center" dangerouslySetInnerHTML={{ __html: errorMessage || "&nbsp;" }} />
    </div>
  </>
}
