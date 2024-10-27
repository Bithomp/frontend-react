import Link from 'next/link'
import { useTranslation } from 'next-i18next'

const logo = '/images/logo-small.svg'

export default function Products() {
  const { t } = useTranslation()

  const products = [
    {
      title: t('titles.for-you', { ns: 'products' }),
      list: [
        {
          link: '/',
          text: t('items.watchlist', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.tx-export', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.set-avatar', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.username-registration', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.project-registration', { ns: 'products' })
        }
      ]
    },
    {
      title: t('titles.list2', { ns: 'products' }),
      list: [
        {
          link: '/',
          text: t('items.registration', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.balance', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.transaction-status', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.statistics', { ns: 'products' })
        }
      ]
    },
    {
      title: t('titles.list3', { ns: 'products' }),
      list: [
        {
          link: '/',
          text: t('items.domain', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.mint-nft', { ns: 'products' })
        }
      ]
    },
    {
      title: t('titles.list4', { ns: 'products' }),
      list: [
        {
          link: '/',
          text: t('items.nft-bots', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.notifications', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.alerts', { ns: 'products' })
        },
        {
          link: '/',
          text: t('items.usernames', { ns: 'products' })
        }
      ]
    }
  ]

  return (
    <div className="products">
      {products.map((product, i) => {
        return (
          <div key={i} className={'product list' + (i + 1)}>
            <div className="product__wrap">
              <h2>{product.title}</h2>
              <ul>
                {product.list.map((item, index) => {
                  return (
                    <li key={index}>
                      <Link href={item.link}>
                        <img alt="bithomp logo" src={logo} />
                        <span>{item.text}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="product-bg" />
          </div>
        )
      })}
    </div>
  )
}
