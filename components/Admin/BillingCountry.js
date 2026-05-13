import CountrySelect from '../UI/CountrySelect'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { IoMdCreate } from 'react-icons/io'

import { countriesTranslated } from '../../utils'
import { axiosAdmin } from '../../utils/axios'

const countrySelectPortalStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({
    ...base,
    border: '1px solid var(--accent-icon)',
    borderRadius: '10px',
    backgroundColor: 'var(--background-secondary)',
    boxShadow: '0 10px 28px color-mix(in srgb, var(--text-main) 14%, transparent)',
    overflow: 'hidden'
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: '260px',
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'var(--background-secondary)'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--accent-icon)'
      : state.isFocused
        ? 'var(--unaccent-icon)'
        : 'var(--background-secondary)',
    color: state.isSelected ? 'var(--background-main)' : 'var(--text-main)',
    cursor: 'pointer',
    textAlign: 'left'
  })
}

export default function BillingCountry({
  billingCountry,
  setBillingCountry,
  choosingCountry,
  setChoosingCountry,
  compact = false,
  showSelected = true,
  showLabel = true,
  onSaved
}) {
  const router = useRouter()
  const { t, i18n } = useTranslation('admin')
  const [countries, setCountries] = useState(null)
  const [menuPortalTarget, setMenuPortalTarget] = useState(null)

  useEffect(() => {
    const loadCountries = async () => {
      const data = await countriesTranslated(i18n.language)
      setCountries(data)
    }
    loadCountries()
  }, [i18n.language])

  const [loading, setLoading] = useState(true) //keep true for country select
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMenuPortalTarget(document.body)
    getApiData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getApiData = async () => {
    const partnerData = await axiosAdmin.get('partner').catch((error) => {
      if (error && error.message !== 'canceled') {
        console.log("ERROR: can't get partner data")
        if (error.response?.data?.error === 'errors.token.required') {
          router.push('/admin')
        }
      }
      setLoading(false)
    })

    /*
    {
      "id": 321098,
      "created_at": "2022-09-20T12:42:38.000Z",
      "updated_at": "2024-01-09T12:08:33.000Z",
      "name": "vasia.com",
      "email": "sasha@public.com",
      "country": "GB"
    }
    */

    setLoading(false)

    const partnerCountry = partnerData?.data?.country

    //if we have country available: set country
    if (partnerCountry) {
      setBillingCountry(partnerCountry)
    } else {
      //if no country available
      setChoosingCountry(true)
    }
  }

  const saveCountry = async () => {
    setSaving(true)
    const data = await axiosAdmin
      .put('partner', { country: billingCountry })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          console.log("ERROR: can't save country")
        }
      })
    setSaving(false)
    if (data?.data?.country) {
      setBillingCountry(data.data.country)
      setChoosingCountry(false)
      onSaved?.(data.data.country)
    }
  }

  return (
    <>
      {(!billingCountry || choosingCountry) && !loading ? (
        <div className={`billing-country-form ${compact ? 'compact' : ''}`}>
          <strong>{t('billing.choose-country')}</strong>
          <div className="billing-country-controls">
            <CountrySelect
              countryCode={billingCountry}
              menuPortalTarget={menuPortalTarget}
              menuPosition="fixed"
              setCountryCode={setBillingCountry}
              styles={countrySelectPortalStyles}
              type="onlySelect"
            />
            <button onClick={() => saveCountry()} className="button-action" disabled={!billingCountry || saving}>
              {t('button.save')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {billingCountry && showSelected && (
            <div className="billing-country-display">
              {showLabel && <span>{t('billing.country-is')}</span>}
              <strong>{countries?.getNameTranslated?.(billingCountry) || billingCountry}</strong>
              <button
                aria-label={t('billing.edit-country')}
                className="button-icon"
                onClick={() => setChoosingCountry(true)}
                title={t('billing.edit-country')}
                type="button"
              >
                <IoMdCreate />
              </button>
            </div>
          )}
        </>
      )}
      <style jsx>{`
        .billing-country-form {
          display: grid;
          gap: 12px;
          width: min(100%, 760px);
          margin: 0 auto 22px;
          padding: 16px;
          border: 1px solid var(--button-additional);
          border-radius: 12px;
          background: color-mix(in srgb, var(--background-secondary) 88%, transparent);
          text-align: left;
        }

        .billing-country-form.compact {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 12px;
          box-sizing: border-box;
        }

        .billing-country-form strong {
          font-size: 16px;
        }

        .billing-country-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .billing-country-form.compact .billing-country-controls {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) auto;
          width: 100%;
        }

        .billing-country-controls :global(.simple-select),
        .billing-country-controls :global(.react-select__control) {
          min-width: 220px;
        }

        .billing-country-form.compact .billing-country-controls :global(.country-select),
        .billing-country-form.compact .billing-country-controls :global(.react-select__control) {
          min-width: 0;
          width: 100%;
        }

        .billing-country-form.compact .billing-country-controls :global(.react-select__value-container) {
          min-width: 0;
        }

        .billing-country-form.compact .billing-country-controls :global(.react-select__single-value) {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .billing-country-form.compact .billing-country-controls .button-action {
          white-space: nowrap;
        }

        .billing-country-display {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          justify-content: flex-start;
          color: var(--text-secondary);
        }

        .billing-country-display strong {
          color: var(--text-main);
        }

        @media only screen and (max-width: 520px) {
          .billing-country-form.compact .billing-country-controls {
            grid-template-columns: 1fr;
          }
        }

        :global(.react-select__menu-portal .react-select__menu) {
          border: 1px solid var(--accent-icon) !important;
          border-radius: 10px !important;
          background-color: var(--background-secondary) !important;
          box-shadow: 0 10px 28px color-mix(in srgb, var(--text-main) 14%, transparent) !important;
          overflow: hidden !important;
        }

        :global(.react-select__menu-portal .react-select__menu-list) {
          max-height: 260px !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          background-color: var(--background-secondary) !important;
        }

        :global(.react-select__menu-portal .react-select__option) {
          background-color: var(--background-secondary) !important;
          color: var(--text-main) !important;
          cursor: pointer;
          text-align: left;
        }

        :global(.react-select__menu-portal .react-select__option--is-focused) {
          background-color: var(--unaccent-icon) !important;
        }

        :global(.react-select__menu-portal .react-select__option--is-selected) {
          background-color: var(--accent-icon) !important;
          color: var(--background-main) !important;
        }
      `}</style>
    </>
  )
}
