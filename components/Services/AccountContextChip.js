import Link from 'next/link'
import { avatarSrc } from '../../utils'
import Avatar from '../UI/Avatar'
import styles from './AccountContextChip.module.scss'

export default function AccountContextChip({ account }) {
  if (!account?.address) return null

  const accountDisplayName = account.username || account.service || ''

  return (
    <div className={styles.context}>
      <Link href={`/account/${account.address}`} className={styles.chip} aria-label={account.address}>
        <span className={styles.avatar}>
          <Avatar src={avatarSrc(account.address)} alt="" size={30} />
        </span>
        <span className={styles.text}>
          {accountDisplayName && <span className={styles.name}>{accountDisplayName}</span>}
          <span className={`${styles.address} ${accountDisplayName ? '' : styles.primary}`}>
            <span className={styles.addressFull}>{account.address}</span>
          </span>
        </span>
      </Link>
    </div>
  )
}
