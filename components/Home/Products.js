import Link from 'next/link'
import { useTranslation } from 'next-i18next'

const logo = '/images/logo-small.svg'

export default function Products() {
  const { t } = useTranslation()

  const products = [
    {
      type: 'nft',
      title: t('titles.nft', { ns: 'products' }),
      list: [
        {
          link: '/',
          text: t('items.search-name', { ns: 'products' }),
        },
        {
          link: '/',
          text: t('items.check', { ns: 'products' }),
        },
        {
          link: '/',
          text: t('items.your-nft', { ns: 'products' }),
        },
        {
          link: '/',
          text: t('items.buy-sell', { ns: 'products' }),
        },
        {
          link: '/',
          text: t('items.manage-nft', { ns: 'products' }),
        }
      ],
      bg: '/images/products/product-bg-1.png'
    },
    {
      type: 'api',
      title: t('titles.api', { ns: 'products' }),
      list: [
        {
          link: '/',
          text: t('items.registration', { ns: 'products' }),
        },
        {
          link: '/',
          text: t('items.balance', { ns: 'products' }),
        },
        {
          link: '/',
          text: t('items.transaction-status', { ns: 'products' }),
        },
        {
          link: '/',
          text: t('items.statistics', { ns: 'products' }),
        }
      ],
      bg: '/images/products/product-bg-2.png',
      gradient: '/images/products/gradient-3.svg'
    },
    {
      type: 'xrpl',
      title: t('titles.xrpl', { ns: 'products' }),
      list: [
        {
          link: '/',
          text: t('items.domain', { ns: 'products' }),
        },
        {
          link: '/',
          text: t('items.mint-nft', { ns: 'products' }),
        }
      ],
      bg: '/images/products/product-bg-3.png',
      gradient: '/images/products/gradient-1.svg'
    },
    {
      type: 'services',
      title: t('titles.services', { ns: 'products' }),
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
      ],
      bg: '/images/products/product-bg-4.png',
      gradient: '/images/products/gradient-2.svg'
    }
  ]

  return (
    <div className="products">
      {products.map((product, i) => {
        return (
          <div key={i} className={'product product--' + product.type}>
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
            <div className="product__bg">
              <img alt="bithomp logo" src={product.bg} />
            </div>
            {product.gradient && (
              <div className="product__gradient">
                <img alt="gradient" src={product.gradient} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
