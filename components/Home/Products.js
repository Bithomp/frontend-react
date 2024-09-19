import Link from 'next/link'
import { useTranslation } from 'next-i18next'

const logo = '/images/logo-small.svg'

export default function Products() {
  const { t } = useTranslation(['common', 'products', 'volumes'])

  const products = [
    {
      type: 'nft',
      title: t('titles.nft', { ns: 'products' }),
      list: [t('items.search-name', { ns: 'products' }), t('items.check', { ns: 'products' }), t('items.your-nft', { ns: 'products' }), t('items.buy-sell', { ns: 'products' }), t('items.manage-nft', { ns: 'products' })],
      bg: '/images/products/product-bg-1.png'
    },
    {
      type: 'api',
      title: t('titles.api', { ns: 'products' }),
      list: [t('items.registration', { ns: 'products' }), t('items.balance', { ns: 'products' }), t('items.transaction-status', { ns: 'products' }), t('items.statistics', { ns: 'products' })],
      bg: '/images/products/product-bg-2.png',
      gradient: '/images/products/gradient-3.svg'
    },
    {
      type: 'xrpl',
      title: t('titles.xrpl', { ns: 'products' }),
      list: [t('items.domain', { ns: 'products' }), t('items.mint-nft', { ns: 'products' })],
      bg: '/images/products/product-bg-3.png',
      gradient: '/images/products/gradient-1.svg'
    },
    {
      type: 'services',
      title: t('titles.services', { ns: 'products' }),
      list: [t('items.nft-bots', { ns: 'products' }), t('items.notifications', { ns: 'products' }), t('items.alerts', { ns: 'products' }), t('items.usernames', { ns: 'products' })],
      bg: '/images/products/product-bg-4.png',
      gradient: '/images/products/gradient-2.svg'
    }
  ]

  return (
    <div className="products">
      {products.map((product, i) => {
        return (
          <div key={i} className={'product product--' + product.type}>
            <Link className="product__wrap" href="/">
              <h2>{product.title}</h2>
              <ul>
                {product.list.map((item, index) => {
                  return (
                    <li key={index}>
                      <img alt="bithomp logo" src={logo} />
                      <span>{item}</span>
                    </li>
                  )
                })}
              </ul>
            </Link>
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
