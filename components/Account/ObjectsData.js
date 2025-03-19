import { useState, useEffect } from 'react'
import { shortHash } from '../../utils/format'
import CopyButton from '../UI/CopyButton'
import axios from 'axios'
import { useTranslation } from 'next-i18next'

export default function ObjectsData({ id }) {
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingObjects, setLoadingObjects] = useState(false)
  const [hookList, setHookList] = useState([])
  const { t } = useTranslation()

  const controller = new AbortController()

  useEffect(() => {
    async function checkObjects() {
      setLoadingObjects(true)
      const accountObjectsData = await axios
        .get('xrpl/objects/' + id, {
          signal: controller.signal
        })
        .catch((error) => {
          if (error && error.message !== 'canceled') {
            setErrorMessage(t('error.' + error.message))
            setLoadingObjects(false)
          }
        })
      const accountObjects = accountObjectsData?.data
      if (accountObjects) {
        setLoadingObjects(false)
        const accountObjectWithHooks =
          accountObjects.length > 0 ? accountObjects.find((o) => o.LedgerEntryType === 'Hook') : []
        if (accountObjectWithHooks?.Hooks?.length > 0) {
          const hooks = accountObjectWithHooks.Hooks
          const hookHashes = hooks.map((h) => h.Hook.HookHash)
          setHookList(hookHashes)
        }
      }
    }
    checkObjects()

    return () => {
      controller.abort()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {loadingObjects || errorMessage ? (
        <>
          <table className="table-details hide-on-small-w800">
            <thead>
              <tr>
                <th colSpan="100">Objects</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="center">
                  <br />
                  <div className="center">
                    {loadingObjects ? (
                      <>
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </>
                    ) : (
                      <span className="orange bold">{errorMessage}</span>
                    )}
                  </div>
                  <br />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="show-on-small-w800">
            <br />
            <center>{'Objects'.toUpperCase()}</center>
            <p className="center">
              {loadingObjects ? (
                <>
                  <span className="waiting"></span>
                  <br />
                  {t('general.loading')}
                </>
              ) : (
                <span className="orange bold">{errorMessage}</span>
              )}
            </p>
          </div>
        </>
      ) : (
        <>
          {hookList.length > 0 && (
            <>
              <table className="table-details hide-on-small-w800">
                <thead>
                  <tr>
                    <th colSpan="100">Hooks</th>
                  </tr>
                </thead>
                <tbody>
                  {hookList.map((p, i) => (
                    <tr key={i}>
                      <td>{i}</td>
                      <td className="right">
                        {p} <CopyButton text={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="show-on-small-w800">
                <br />
                <center>{'Hooks'.toUpperCase()}</center>
                {hookList.map((p, i) => (
                  <p key={i}>
                    <span className="grey">{i}</span> {shortHash(p, 16)} <CopyButton text={p} />
                  </p>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
