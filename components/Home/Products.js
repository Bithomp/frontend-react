import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { nativeCurrency } from '../../utils'

const logo = '/images/logo-small.svg'

export default function Products() {
  const { t } = useTranslation()

  const products = [
    {
      title: t('titles.for-you', { ns: 'products' }),
      list: [
        {
          link: '/admin/watchlist',
          text: t('items.watchlist', { ns: 'products' })
        },
        {
          link: '/admin/pro/history',
          text: t('items.tx-export', { ns: 'products' })
        },
        {
          link: '/admin/pro',
          text: t('items.set-avatar', { ns: 'products' })
        },
        {
          link: '/username',
          text: t('items.username-registration', { ns: 'products' })
        },
        {
          link: '/submit-account-information',
          text: t('items.project-registration', { ns: 'products' })
        }
      ]
    },
    {
      title: t('titles.top-lists', { ns: 'products' }),
      list: [
        {
          link: '/amms',
          text: t('items.amms', { ns: 'products' })
        },
        {
          link: '/distribution',
          text: t('items.distribution', { ns: 'products', nativeCurrency })
        },
        {
          link: '/nft-volumes?list=marketplaces',
          text: t('items.nft-marketplaces', { ns: 'products' })
        },
        {
          link: '/nft-volumes?list=collections',
          text: t('items.nft-collections', { ns: 'products' })
        },
        {
          link: '/nft-distribution',
          text: t('items.nft-distribution', { ns: 'products' })
        }
      ]
    },
    {
      title: t('titles.nft', { ns: 'products' }),
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
      title: t('titles.network-developers', { ns: 'products' }),
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
