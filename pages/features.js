import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

export const getServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'

const featureLink = name => {
  return <a href={"https://xrpl.org/known-amendments.html#" + name.toLowerCase()}>{name}</a>
}

export default function Features() {
  const { t } = useTranslation(['common'])
  const router = useRouter()

  const { isReady } = router

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [enabled, setEnabled] = useState([])
  const [disabled, setDisabled] = useState([])

  const [validations, setValidations] = useState(null)
  const [threshold, setThreshold] = useState(null)

  const controller = new AbortController()

  const checkApi = async () => {
    let apiUrl = 'v2/features'

    setLoading(true)

    const response = await axios.get(apiUrl, {
      signal: controller.signal
    }).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
        setLoading(false) //keep here for fast tab clickers
      }
    })
    const newdata = response?.data;

    if (newdata) {
      setLoading(false) //keep here for fast tab clickers
      if (newdata.result?.features) {
        setErrorMessage("")
        let enabledArray = []
        let disabledArray = []
        const features = newdata.result.features

        Object.keys(features).forEach(key => {
          if (features[key].enabled) {
            enabledArray.push({ ...features[key], hash: key })
          } else {
            disabledArray.push({ ...features[key], hash: key })
            setValidations(features[key].validations)
            setThreshold(features[key].threshold)
          }
        })

        disabledArray.sort((a, b) => (a.count > b.count) ? -1 : 1)

        setDisabled(disabledArray)
        setEnabled(enabledArray)
      } else {
        if (newdata.error) {
          setErrorMessage(newdata.error)
        } else {
          setErrorMessage("Error")
          console.log(newdata)
        }
      }
    }
  }

  /*
    {
      "result": {
        "features": {
          "00C1FC4A53E60AB02C864641002B3172F38677E29C26C5406685179B37E1EDAC": {
            "enabled": true,
            "name": "RequireFullyCanonicalSig",
            "supported": true
          },
          "56B241D7A43D40354D02A9DC4C8DF5C7A1F930D92A9035C4E12291B3CA3E1C2B": {
            "count": 19,
            "enabled": false,
            "name": "Clawback",
            "supported": true,
            "threshold": 28,
            "validations": 35,
            "vetoed": true
          },
  */

  useEffect(() => {
    checkApi()
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  return <>
    <SEO title="Features" />
    <div className="content-text">
      <h1 className="center">Features</h1>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='center'>{t("table.index")}</th>
            <th>{t("table.name")}</th>
            <th className='center'>{t("table.hash")}</th>
            <th className='right'>{threshold} / {validations}</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <br />{t("general.loading")}<br />
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && enabled) ?
                <>
                  {disabled.length > 0 &&
                    disabled.map((f, i) =>
                      <tr key={i}>
                        <td className='center'>{i + 1}</td>
                        <td>{featureLink(f.name)}</td>
                        <td className='center'><CopyButton text={f.hash} /></td>
                        <td className='right'>
                          {f.count > f.threshold ? <b class="green">{f.count}</b> : f.count}
                        </td>
                      </tr>
                    )
                  }
                </>
                :
                <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
              }
            </>
          }
        </tbody>
      </table>
      <br />
      <h1 className="center">Enabled features</h1>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='center'>{t("table.index")}</th>
            <th>{t("table.name")}</th>
            <th className='center'>{t("table.hash")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <br />{t("general.loading")}<br />
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && enabled) ?
                <>
                  {enabled.length > 0 &&
                    enabled.map((f, i) =>
                      <tr key={i}>
                        <td className='center'>{i + 1}</td>
                        <td>{featureLink(f.name)}</td>
                        <td className='center'><CopyButton text={f.hash} /></td>
                      </tr>
                    )
                  }
                </>
                :
                <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
              }
            </>
          }
        </tbody>
      </table>
    </div>
  </>
}
