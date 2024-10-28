import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { nativeCurrency, xahauNetwork } from '../../utils'

const logo = '/images/logo-small.svg'

export default function Products() {
  const { t } = useTranslation()

  let products = []
  products[0] = {
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
  }
  products[1] = {
    title: t('titles.top-lists', { ns: 'products' }),
    list: [
      {
        link: '/distribution',
        text: t('items.distribution', { ns: 'products', nativeCurrency })
      },

      {
        link: '/nft-distribution',
        text: t('items.nft-distribution', { ns: 'products' })
      }
    ]
  }

  if (!xahauNetwork) {
    products[1].list.unshift({
      link: '/amms',
      text: t('items.amms', { ns: 'products' })
    })
    products[1].list.push(
      {
        link: '/nft-volumes?list=marketplaces',
        text: t('items.nft-marketplaces', { ns: 'products' })
      },
      {
        link: '/nft-volumes?list=collections',
        text: t('items.nft-collections', { ns: 'products' })
      }
    )
  }

  products[2] = {
    title: t('titles.nft', { ns: 'products' }),
    list: [
      {
        link: '/nft-explorer',
        text: t('items.nft-explorer', { ns: 'products' })
      },
      {
        link: '/nft-sales',
        text: t('items.nft-sales', { ns: 'products' })
      },
      {
        link: '/nft-statistics',
        text: t('items.nft-statistics', { ns: 'products' })
      }
    ]
  }

  if (xahauNetwork) {
    products[2].list.unshift({
      link: '/nft-mint',
      text: t('items.nft-mint', { ns: 'products' })
    })
  } else {
    products[2].list.push({
      link: '/nft-minters',
      text: t('items.nft-minters', { ns: 'products' })
    })
  }

  products[3] = {
    title: t('titles.network', { ns: 'products' }),
    list: [
      {
        link: '/validators',
        text: t('items.validators', { ns: 'products' })
      },
      {
        link: '/amendments',
        text: t('items.amendments', { ns: 'products' })
      },
      {
        link: '/last-ledger-information',
        text: t('items.last-ledger-information', { ns: 'products' })
      },
      {
        link: '/ledger',
        text: t('items.ledger', { ns: 'products' })
      }
    ]
  }

  if (xahauNetwork) {
    products[3].list.unshift({
      link: '/governance',
      text: t('items.governance', { ns: 'products' })
    })
  }

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
