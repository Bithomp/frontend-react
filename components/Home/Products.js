import Link from 'next/link'
// import { useTranslation } from 'next-i18next'

const logo = '/images/logo-small.svg'

const products = [
  {
    type: 'nft',
    title: 'NFT Explorer',
    list: ['search by name', 'check statistics', 'present your NFT', 'buy/sell', 'manage NFT'],
    bg: '/images/products/product-bg-1.png'
  },
  {
    type: 'api',
    title: 'API',
    list: ['free registration', 'get balance', 'get transaction status', 'get statistics'],
    bg: '/images/products/product-bg-2.png'
  },
  {
    type: 'xrpl',
    title: 'XRPL Services',
    list: ['set domain', 'mint nft'],
    bg: '/images/products/product-bg-3.png'
  },
  {
    type: 'services',
    title: 'Services',
    list: ['nft bots', 'notifications', 'price alerts', 'usernames'],
    bg: '/images/products/product-bg-4.png'
  }
]

export default function Products() {
  // const { t } = useTranslation()

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
          </div>
        )
      })}
    </div>
  )
}
