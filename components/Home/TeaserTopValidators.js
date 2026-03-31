import ReactCountryFlag from 'react-country-flag'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { shortHash } from '../../utils/format'
import { avatarServer } from '../../utils'
import Avatar from '../UI/Avatar'
import styles from '@/styles/components/home-teaser.module.scss'

const validatorName = (v) => v.principals?.[0]?.name || shortHash(v.publicKey, 6)

export default function TeaserTopValidators({ data = [], isLoading = false }) {
  return (
    <HomeTeaser title="home.teaser.topValidators" href="/validators" isLoading={isLoading} isEmpty={!data?.length}>
      {data?.map((validator) => (
        <HomeTeaseRow key={validator.publicKey} className={styles.validatorRow}>
          <div className={styles.validatorPrimary}>
            <Avatar
              src={avatarServer + validator.publicKey}
              size={35}
              style={{
                flexShrink: 0,
                background: '#fff',
                border: '1px solid #fff'
              }}
            />
            {validator.ownerCountry && (
              <ReactCountryFlag
                countryCode={validator.ownerCountry}
                style={{ fontSize: '1.3em', lineHeight: '1.3em', flexShrink: 0 }}
                title="Owner"
              />
            )}
            <span className={styles.validatorName}>{validatorName(validator)}</span>
          </div>
          <div className={styles.validatorDomain}>{validator.domain || ''}</div>
          <div className={styles.validatorServerMeta}>
            {validator.serverCountry && (
              <ReactCountryFlag
                countryCode={validator.serverCountry}
                style={{ fontSize: '1.3em', lineHeight: '1.3em' }}
                title="Server"
              />
            )}
            {validator.serverVersion ? (
              <span className={styles.amendmentVersion}>
                {String(validator.serverVersion).startsWith('v')
                  ? validator.serverVersion
                  : `v${validator.serverVersion}`}
              </span>
            ) : null}
          </div>
        </HomeTeaseRow>
      ))}
    </HomeTeaser>
  )
}
