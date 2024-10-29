import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { nativeCurrency, xahauNetwork, devNet, useWidth } from '../../utils'
import Slider from 'react-slick'
import Image from 'next/image'

import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

const logo = '/images/logo-small.svg'

export default function Products() {
  const { t } = useTranslation()
  const width = useWidth()

  const enoughSpaceFor4 = width > 1320

  const settings = {
    lazyLoad: 'ondemand',
    dots: !enoughSpaceFor4,
    infinite: !enoughSpaceFor4,
    speed: 1200,
    autoplay: true,
    autoplaySpeed: 5000,
    slidesToShow: enoughSpaceFor4 ? 4 : width > 680 ? 2 : 1,
    slidesToScroll: 1,
    arrows: false
  }

  let products = []
  let part1 = {}
  if (devNet) {
    part1 = {
      title: t('titles.developer', { ns: 'products' }),
      list: [
        {
          link: '/faucet',
          text: t('items.faucet', { ns: 'products', nativeCurrency })
        },
        {
          externalLink: 'https://docs.bithomp.com/',
          text: t('items.api-docs', { ns: 'products' })
        },
        {
          link: '/admin',
          text: t('items.get-api-key', { ns: 'products' })
        },
        {
          externalLink: 'https://docs.bithomp.com/#nft-content-plans',
          text: t('items.nft-cdn', { ns: 'products' })
        }
      ]
    }
    if (!xahauNetwork) {
      part1.list.unshift({
        oldLink: '/tools/',
        text: t('items.tools', { ns: 'products' })
      })
    }
  } else {
    part1 = {
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
  }
  part1.image = '/images/products/for-you.png'
  part1.imageWidth = 133
  products.push(part1)

  if (!devNet) {
    let part2 = {
      image: '/images/products/top-lists.png',
      imageWidth: 185,
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
      part2.list.unshift({
        link: '/amms',
        text: t('items.amms', { ns: 'products' })
      })
      part2.list.push(
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
    products.push(part2)

    let part3 = {
      image: '/images/products/nft.png',
      imageWidth: 180,
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
      part3.list.unshift({
        link: '/nft-mint',
        text: t('items.nft-mint', { ns: 'products' })
      })
    } else {
      part3.list.push({
        link: '/nft-minters',
        text: t('items.nft-minters', { ns: 'products' })
      })
    }

    products.push(part3)
  }

  let part4 = {
    image: '/images/products/network.png',
    imageWidth: 103,
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
    part4.list.unshift({
      link: '/governance',
      text: t('items.governance', { ns: 'products' })
    })
  } else {
    part4.list.push({
      link: '/nodes',
      text: t('items.nodes', { ns: 'products' })
    })
  }

  products.push(part4)

  return (
    <Slider {...settings} className="products">
      {products.map((product, i) => {
        return (
          <div key={i} className={'product list' + (i + 1)}>
            <div className="product-wrap">
              <h2>{product.title}</h2>
              <ul>
                {product.list.map((item, index) => {
                  return (
                    <li key={index}>
                      {item.externalLink || item.oldLink ? (
                        <a href={item.externalLink || item.oldLink}>
                          <img alt="bithomp logo" src={logo} />
                          <span>{item.text}</span>
                        </a>
                      ) : (
                        <Link href={item.link}>
                          <img alt="bithomp logo" src={logo} />
                          <span>{item.text}</span>
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
            {width <= 680 ? (
              <Image
                src={product.image}
                alt={product.title}
                className="product-bg"
                fill={true}
                style={{ objectFit: 'contain', objectPosition: 'right' }}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            ) : (
              <Image
                src={product.image}
                alt={product.title}
                className="product-bg"
                fill={true}
                style={{ objectFit: 'contain', objectPosition: 'right' }}
                priority={true}
              />
            )}
          </div>
        )
      })}
    </Slider>
  )
}
