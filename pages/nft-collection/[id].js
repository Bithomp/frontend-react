import { i18n, useTranslation } from 'next-i18next'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import {
  usernameOrAddress,
  AddressWithIconFilled,
  addressUsernameOrServiceLink,
  amountFormat,
  convertedAmount,
  nativeCurrencyToFiat,
  fullDateAndTime,
  timeFromNow,
  AddressWithIconInline
} from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import { nftName, ipfsUrl, NftImage } from '../../utils/nft'

import SEO from '../../components/SEO'
import { nftClass } from '../../styles/pages/nft.module.scss'
import { useWidth } from '../../utils'
import { axiosServer, passHeaders } from '../../utils/axios'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id } = query
  const collectionId = id ? (Array.isArray(id) ? id[0] : id) : ''
  let dataRes = []
  let nftRes = []

  let errorMessage = ''
  try {
    ;[dataRes, nftRes] = await Promise.all([
      axiosServer({
        method: 'get',
        url: `/v2/nft-collection/${encodeURIComponent(collectionId)}?floorPrice=true&statistics=true`,
        headers: passHeaders(req)
      }),
      axiosServer({
        method: 'get',
        url: `/v2/nfts?collection=${encodeURIComponent(collectionId)}&limit=16&order=mintedNew&hasMedia=true`,
        headers: passHeaders(req)
      })
    ])
  } catch (error) {
    errorMessage = 'error.' + error.message
  }

  if (!dataRes?.data) errorMessage = 'No data found'

  return {
    props: {
      id: collectionId || null,
      data: dataRes?.data || null,
      nftList: nftRes?.data?.nfts || [],
      isSsrMobile: getIsSsrMobile(context),
      errorMessage: errorMessage || null,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function NftCollection({ id, nftList, selectedCurrency, isSsrMobile, fiatRate, errorMessage, data }) {
  data = {
    type: 'xls20',
    floorPrice: true,
    statistics: true,
    collection: {
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      name: 'sraebyzzuF',
      family: null,
      description: null,
      image: 'bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#383.png',
      createdAt: 1759327260,
      updatedAt: 1761155150,
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      issuerDetails: {
        address: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
        username: null,
        service: 'Fuzzybear'
      },
      taxon: 0,
      floorPrices: [
        {
          open: {
            amount: '8288000000'
          },
          private: {
            amount: '215000000',
            destination: 'rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC',
            destinationDetails: {
              username: 'xrpcafe',
              service: 'xrp.cafe'
            }
          }
        }
      ],
      statistics: {
        owners: 383,
        nfts: 1220,
        all: {
          buyers: 158,
          tradedNfts: 380
        },
        day: {
          buyers: 9,
          tradedNfts: 9
        },
        week: {
          buyers: 69,
          tradedNfts: 161
        },
        month: {
          buyers: 158,
          tradedNfts: 380
        },
        year: {
          buyers: 157,
          tradedNfts: 377
        }
      }
    }
  }
  nftList = [
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC94961979D05E9EC02',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216386,
      owner: 'rwyNi4qUd7PXMM61zhcxAWvTKQj9kXADWe',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233736392E6A736F6E',
      nftSerial: 99216386,
      issuedAt: 1761155150,
      ownerChangedAt: 1761155211,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23769.json',
      metadata: {
        name: 'raebyzzuF #769',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#769.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'yerG LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'nworB'
          },
          {
            trait_type: 'seyE',
            value: 'eulB'
          },
          {
            trait_type: 'sehtolC',
            value: 'ieL'
          },
          {
            trait_type: 'htuoM',
            value: 'nioC'
          },
          {
            trait_type: 'raewdaeH',
            value: 'rethgiferiF'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#769.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC9327BC69C05E9EC01',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216385,
      owner: 'rwyNi4qUd7PXMM61zhcxAWvTKQj9kXADWe',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233139332E6A736F6E',
      nftSerial: 99216385,
      issuedAt: 1761155111,
      ownerChangedAt: 1761155200,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23193.json',
      metadata: {
        name: 'raebyzzuF #193',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#193.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'wolleY LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'nworB'
          },
          {
            trait_type: 'ksaM',
            value: 'ksaM dloG'
          },
          {
            trait_type: 'seyE',
            value: 'eulB'
          },
          {
            trait_type: 'sehtolC',
            value: 'eceiP-eerhT'
          },
          {
            trait_type: 'htuoM',
            value: 'prahS'
          },
          {
            trait_type: 'raewdaeH',
            value: 'ekureP'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#193.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC91B95F59B05E9EC00',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216384,
      owner: 'rBMv1oKS4KiJF7BoiAMX1AU9Jo7Jj4MphQ',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233938312E6A736F6E',
      nftSerial: 99216384,
      issuedAt: 1759746280,
      ownerChangedAt: 1760926961,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23981.json',
      metadata: {
        name: 'raebyzzuF #981',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#981.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'yerG LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'nworB'
          },
          {
            trait_type: 'seyE',
            value: 'elconoM'
          },
          {
            trait_type: 'sehtolC',
            value: 'tiuS ecaR'
          },
          {
            trait_type: 'htuoM',
            value: 'nioC'
          },
          {
            trait_type: 'raewdaeH',
            value: 'nayiaS'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#981.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC904B0249A05E9EBFF',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216383,
      owner: 'rGrnqJovoTZ3mgNP7jAJhPJjUm2YWhDqqo',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233932372E6A736F6E',
      nftSerial: 99216383,
      issuedAt: 1759690561,
      ownerChangedAt: 1759690620,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23927.json',
      metadata: {
        name: 'raebyzzuF #927',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#927.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'egnarO LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'yenoH'
          },
          {
            trait_type: 'ksaM',
            value: 'ksaM dloG'
          },
          {
            trait_type: 'seyE',
            value: 'seyE eriF'
          },
          {
            trait_type: 'sehtolC',
            value: 'ommA'
          },
          {
            trait_type: 'htuoM',
            value: 'ragiC'
          },
          {
            trait_type: 'raewdaeH',
            value: 'reitalocohC'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#927.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC9EDCA539905E9EBFE',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216382,
      owner: 'rfTASBA5vSNaKn5myMz7qiN3ixQ46DsAzq',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233735342E6A736F6E',
      nftSerial: 99216382,
      issuedAt: 1759655081,
      ownerChangedAt: 1759655171,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23754.json',
      metadata: {
        name: 'raebyzzuF #754',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#754.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'neerG LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'yenoH'
          },
          {
            trait_type: 'seyE',
            value: 'eulB'
          },
          {
            trait_type: 'sehtolC',
            value: 'lennalF'
          },
          {
            trait_type: 'htuoM',
            value: 'nioC'
          },
          {
            trait_type: 'raewdaeH',
            value: 'nogarD'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#754.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC9D6E4829805E9EBFD',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216381,
      owner: 'rfTASBA5vSNaKn5myMz7qiN3ixQ46DsAzq',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233636322E6A736F6E',
      nftSerial: 99216381,
      issuedAt: 1759655081,
      ownerChangedAt: 1759655232,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23662.json',
      metadata: {
        name: 'raebyzzuF #662',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#662.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'wolleY LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'nworB'
          },
          {
            trait_type: 'seyE',
            value: 'srotaivA'
          },
          {
            trait_type: 'sehtolC',
            value: 'laitnediserP'
          },
          {
            trait_type: 'htuoM',
            value: 'prahS'
          },
          {
            trait_type: 'raewdaeH',
            value: 'feihC'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#662.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC9BFFEB19705E9EBFC',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216380,
      owner: 'rfTASBA5vSNaKn5myMz7qiN3ixQ46DsAzq',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233930392E6A736F6E',
      nftSerial: 99216380,
      issuedAt: 1759655081,
      ownerChangedAt: 1759655191,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23909.json',
      metadata: {
        name: 'raebyzzuF #909',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#909.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'atnegaM LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'TMD'
          },
          {
            trait_type: 'seyE',
            value: 'gninthgiL'
          },
          {
            trait_type: 'sehtolC',
            value: 'ommA'
          },
          {
            trait_type: 'htuoM',
            value: 'lamroN'
          },
          {
            trait_type: 'raewdaeH',
            value: 'taH repaP'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#909.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC9A918E09605E9EBFB',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216379,
      owner: 'rwnUartEhN32NegquKcDAMf8bauA3UsHrY',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A75462023313136372E6A736F6E',
      nftSerial: 99216379,
      issuedAt: 1759595091,
      ownerChangedAt: 1759595130,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%231167.json',
      metadata: {
        name: 'raebyzzuF #1167',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#1167.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'atnegaM LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'kcalB'
          },
          {
            trait_type: 'ksaM',
            value: 'ksaM dloG'
          },
          {
            trait_type: 'seyE',
            value: 'elconoM'
          },
          {
            trait_type: 'sehtolC',
            value: 'lennalF'
          },
          {
            trait_type: 'htuoM',
            value: 'yfooG'
          },
          {
            trait_type: 'raewdaeH',
            value: 'reitalocohC'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#1167.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC992330F9505E9EBFA',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216378,
      owner: 'raiJs637z3ojvsehKRUyXuBxJgFVKoEogE',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233335322E6A736F6E',
      nftSerial: 99216378,
      issuedAt: 1759590921,
      ownerChangedAt: 1759590951,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23352.json',
      metadata: {
        name: 'raebyzzuF #352',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#352.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'wolleY LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'nworB'
          },
          {
            trait_type: 'seyE',
            value: 'seyE yppaH'
          },
          {
            trait_type: 'sehtolC',
            value: 'ommA'
          },
          {
            trait_type: 'htuoM',
            value: 'ragiC'
          },
          {
            trait_type: 'raewdaeH',
            value: 'paC talF'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#352.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC97B4D3E9405E9EBF9',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216377,
      owner: 'rGrnqJovoTZ3mgNP7jAJhPJjUm2YWhDqqo',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233538352E6A736F6E',
      nftSerial: 99216377,
      issuedAt: 1759578411,
      ownerChangedAt: 1759578440,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23585.json',
      metadata: {
        name: 'raebyzzuF #585',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#585.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'yerG LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'raloP'
          },
          {
            trait_type: 'ksaM',
            value: 'ksaM dloG'
          },
          {
            trait_type: 'seyE',
            value: 'eulB'
          },
          {
            trait_type: 'sehtolC',
            value: 'yrediorbmE'
          },
          {
            trait_type: 'htuoM',
            value: 'prahS'
          },
          {
            trait_type: 'raewdaeH',
            value: 'AGAM kraD'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#585.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC964676D9305E9EBF8',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216376,
      owner: 'rKqqb5QZXVAL3VqXJL6obfRGeHou1DtyBV',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233930312E6A736F6E',
      nftSerial: 99216376,
      issuedAt: 1759514490,
      ownerChangedAt: 1759514490,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23901.json',
      metadata: {
        name: 'raebyzzuF #901',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#901.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'atnegaM LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'kcalB'
          },
          {
            trait_type: 'seyE',
            value: 'eulB'
          },
          {
            trait_type: 'sehtolC',
            value: 'ngiS'
          },
          {
            trait_type: 'htuoM',
            value: 'eugnoT'
          },
          {
            trait_type: 'raewdaeH',
            value: 'temleH nI kcoL'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#901.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC94D819C9205E9EBF7',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216375,
      owner: 'rGrnqJovoTZ3mgNP7jAJhPJjUm2YWhDqqo',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233238392E6A736F6E',
      nftSerial: 99216375,
      issuedAt: 1759508510,
      ownerChangedAt: 1759508561,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23289.json',
      metadata: {
        name: 'raebyzzuF #289',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#289.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'wolleY LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'nworB'
          },
          {
            trait_type: 'seyE',
            value: 'eulB'
          },
          {
            trait_type: 'sehtolC',
            value: 'nI kcoL'
          },
          {
            trait_type: 'htuoM',
            value: 'nioC'
          },
          {
            trait_type: 'raewdaeH',
            value: 'nwolbdniM'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#289.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC9369BCB9105E9EBF6',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216374,
      owner: 'rKRDnGGz9GttgSNRe6iMsQHFe3KQyqwFZP',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233435392E6A736F6E',
      nftSerial: 99216374,
      issuedAt: 1759466841,
      ownerChangedAt: 1759466862,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23459.json',
      metadata: {
        name: 'raebyzzuF #459',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#459.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'neerG LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'raloP'
          },
          {
            trait_type: 'seyE',
            value: 'eulB'
          },
          {
            trait_type: 'sehtolC',
            value: 'eceiP-eerhT'
          },
          {
            trait_type: 'htuoM',
            value: 'yfooG'
          },
          {
            trait_type: 'raewdaeH',
            value: 'lacitcaT'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#459.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC91FB5FA9005E9EBF5',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216373,
      owner: 'rsEvQmfNYxQZE6csWtYo1YesgKBRWPwZHn',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233532372E6A736F6E',
      nftSerial: 99216373,
      issuedAt: 1759466741,
      ownerChangedAt: 1760301320,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23527.json',
      metadata: {
        name: 'raebyzzuF #527',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#527.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'dedoC'
          },
          {
            trait_type: 'ruF',
            value: 'nworB'
          },
          {
            trait_type: 'seyE',
            value: 'oeN'
          },
          {
            trait_type: 'sehtolC',
            value: 'nI kcoL'
          },
          {
            trait_type: 'htuoM',
            value: 'eugnoT'
          },
          {
            trait_type: 'raewdaeH',
            value: 'paC lortaP'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#527.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC908D0298F05E9EBF4',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216372,
      owner: 'rUmB9q64vyf4jKBDNEzk11M4MbunWo9xDV',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233835342E6A736F6E',
      nftSerial: 99216372,
      issuedAt: 1759460480,
      ownerChangedAt: 1759460592,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23854.json',
      metadata: {
        name: 'raebyzzuF #854',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#854.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'elpruP-deR LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'toirtaP'
          },
          {
            trait_type: 'seyE',
            value: 'sessalgeyE'
          },
          {
            trait_type: 'sehtolC',
            value: 'rediaR'
          },
          {
            trait_type: 'htuoM',
            value: 'draeB'
          },
          {
            trait_type: 'raewdaeH',
            value: 'galF'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#854.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    },
    {
      type: 'xls20',
      flags: {
        burnable: false,
        onlyXRP: false,
        trustLine: false,
        transferable: true,
        mutable: false
      },
      issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
      nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC9F1EA588E05E9EBF3',
      nftokenTaxon: 0,
      transferFee: 3000,
      sequence: 99216371,
      owner: 'r9vcymgCTNX91gxx33ULFrmYBTBrVKuRsk',
      uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A75462023313133342E6A736F6E',
      nftSerial: 99216371,
      issuedAt: 1759439601,
      ownerChangedAt: 1759439640,
      deletedAt: null,
      mintedByMarketplace: 'xrp.cafe',
      collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
      url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%231134.json',
      metadata: {
        name: 'raebyzzuF #1134',
        description: '.regdeL PRX eht no sraebyzzuF lanigirO',
        external_url: '',
        image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#1134.png',
        attributes: [
          {
            trait_type: 'dnuorgkcaB',
            value: 'wolleY LPRX'
          },
          {
            trait_type: 'ruF',
            value: 'adnaP'
          },
          {
            trait_type: 'ksaM',
            value: 'ksaM dloG'
          },
          {
            trait_type: 'seyE',
            value: 'seyE-ediS'
          },
          {
            trait_type: 'sehtolC',
            value: 'dlanoDcM'
          },
          {
            trait_type: 'htuoM',
            value: 'eugnoT'
          },
          {
            trait_type: 'raewdaeH',
            value: 'nogarD'
          }
        ],
        properties: {
          files: [
            {
              uri: 'raebyzzuf-#1134.png',
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: []
        },
        compiler: 'NFTexport.io'
      },
      jsonMeta: true,
      issuerDetails: {
        username: null,
        service: 'Fuzzybear'
      },
      ownerDetails: {
        username: null,
        service: null
      }
    }
  ]
  errorMessage = null

  const { t } = useTranslation()
  const width = useWidth()
  const collection = data?.collection
  const statistics = collection?.statistics
  const [activityData, setActivityData] = useState({
    sales: [],
    listings: [],
    mints: []
  })
  const [activityLoading, setActivityLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(isSsrMobile)

  useEffect(() => {
    // Client-side viewport fallback for mobile detection
    const updateIsMobile = () => {
      try {
        setIsMobile(isSsrMobile || width <= 768)
      } catch (_) {}
    }
    updateIsMobile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  useEffect(() => {
    fetchActivityData()
  }, [selectedCurrency])

  const fetchActivityData = async () => {
    setActivityLoading(true)

    try {
      let [salesRes, listingsRes] = await Promise.all([
        axios(
          `/v2/nft-sales?collection=${encodeURIComponent(
            id
          )}&list=lastSold&limit=3&convertCurrencies=${selectedCurrency}`
        ).catch(() => null),

        axios(
          `/v2/nfts?collection=${encodeURIComponent(
            id
          )}&list=onSale&order=offerCreatedNew&limit=3&currency=${selectedCurrency}`
        ).catch(() => null)
      ])

      salesRes = {
        data: {
          list: 'lastSold',
          order: 'soldNew',
          type: 'xls20',
          saleType: 'all',
          period: 'all',
          convertCurrencies: ['usd'],
          collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
          total: {
            primary: 0,
            secondary: 493
          },
          marker: '16F6C71A00000001',
          sales: [
            {
              type: 'xls20',
              nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC90E8BAE9705E9E8FC',
              acceptedAt: '1761200230',
              acceptedLedgerIndex: '99710021',
              acceptedTxHash: '848E1CC9386DD0B73AF17C2D3497AA63D8AE15A9F0F97561B2D753C1B9795650',
              acceptedAccount: 'rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC',
              seller: 'rPQBftvkb3oD7TqG9sDAAd6DU5bgPNKD6Q',
              buyer: 'rEp5TJg3qCdnC8oKRM29gTYhGh9CtgegJ7',
              amount: '160000000',
              broker: true,
              marketplace: 'xrp.cafe',
              saleType: 'secondary',
              amountInConvertCurrencies: {
                usd: '385.7424'
              },
              nftoken: {
                type: 'xls20',
                flags: {
                  burnable: false,
                  onlyXRP: false,
                  trustLine: false,
                  transferable: true,
                  mutable: false
                },
                issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
                nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC90E8BAE9705E9E8FC',
                nftokenTaxon: 0,
                transferFee: 3000,
                sequence: 99215612,
                owner: 'rEp5TJg3qCdnC8oKRM29gTYhGh9CtgegJ7',
                uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233334382E6A736F6E',
                nftSerial: 99215612,
                issuedAt: 1759327490,
                ownerChangedAt: 1761200230,
                deletedAt: null,
                mintedByMarketplace: 'xrp.cafe',
                collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
                url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23348.json',
                metadata: {
                  name: 'raebyzzuF #348',
                  description: '.regdeL PRX eht no sraebyzzuF lanigirO',
                  external_url: '',
                  image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#348.png',
                  attributes: [
                    {
                      trait_type: 'dnuorgkcaB',
                      value: 'atnegaM LPRX'
                    },
                    {
                      trait_type: 'ruF',
                      value: 'nworB'
                    },
                    {
                      trait_type: 'seyE',
                      value: 'seyE-X resaL'
                    },
                    {
                      trait_type: 'sehtolC',
                      value: 'ieL'
                    },
                    {
                      trait_type: 'htuoM',
                      value: 'yfooG'
                    },
                    {
                      trait_type: 'raewdaeH',
                      value: 'paC lortaP'
                    }
                  ],
                  properties: {
                    files: [
                      {
                        uri: 'raebyzzuf-#348.png',
                        type: 'image/png'
                      }
                    ],
                    category: 'image',
                    creators: []
                  },
                  compiler: 'NFTexport.io'
                },
                jsonMeta: true,
                issuerDetails: {
                  username: null,
                  service: 'Fuzzybear'
                },
                ownerDetails: {
                  username: null,
                  service: null
                }
              },
              sellerDetails: {
                username: null,
                service: null
              },
              buyerDetails: {
                username: null,
                service: null
              },
              acceptedAccountDetails: {
                username: 'xrpcafe',
                service: 'xrp.cafe'
              }
            },
            {
              type: 'xls20',
              nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC96CD4164E05E9E9B3',
              acceptedAt: '1761192741',
              acceptedLedgerIndex: '99708090',
              acceptedTxHash: 'DD0EAA5C0607A704AB15061015798941055A80C6E37E5865094D27C07C86CC96',
              acceptedAccount: 'rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC',
              seller: 'rrhDuWYTsHzRGemQJJCjnSwr4EE9RyghDE',
              buyer: 'rafg7VDdbjEtpJPp1XAqYcgvFerRgK5pwf',
              amount: '200000000',
              broker: true,
              marketplace: 'xrp.cafe',
              saleType: 'secondary',
              amountInConvertCurrencies: {
                usd: '475.704'
              },
              nftoken: {
                type: 'xls20',
                flags: {
                  burnable: false,
                  onlyXRP: false,
                  trustLine: false,
                  transferable: true,
                  mutable: false
                },
                issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
                nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC96CD4164E05E9E9B3',
                nftokenTaxon: 0,
                transferFee: 3000,
                sequence: 99215795,
                owner: 'rDeJ4nvQ5oC5dEstxTCeYqhr9GvnDRtmjK',
                uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233439372E6A736F6E',
                nftSerial: 99215795,
                issuedAt: 1759327672,
                ownerChangedAt: 1761204381,
                deletedAt: null,
                mintedByMarketplace: 'xrp.cafe',
                collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
                url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23497.json',
                metadata: {
                  name: 'raebyzzuF #497',
                  description: '.regdeL PRX eht no sraebyzzuF lanigirO',
                  external_url: '',
                  image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#497.png',
                  attributes: [
                    {
                      trait_type: 'dnuorgkcaB',
                      value: 'atnegaM LPRX'
                    },
                    {
                      trait_type: 'ruF',
                      value: 'nworB'
                    },
                    {
                      trait_type: 'seyE',
                      value: 'seyE ratS'
                    },
                    {
                      trait_type: 'sehtolC',
                      value: 'yrediorbmE'
                    },
                    {
                      trait_type: 'htuoM',
                      value: 'yfooG'
                    },
                    {
                      trait_type: 'raewdaeH',
                      value: 'relpdiR'
                    }
                  ],
                  properties: {
                    files: [
                      {
                        uri: 'raebyzzuf-#497.png',
                        type: 'image/png'
                      }
                    ],
                    category: 'image',
                    creators: []
                  },
                  compiler: 'NFTexport.io'
                },
                jsonMeta: true,
                issuerDetails: {
                  username: null,
                  service: 'Fuzzybear'
                },
                ownerDetails: {
                  username: null,
                  service: null
                }
              },
              sellerDetails: {
                username: null,
                service: null
              },
              buyerDetails: {
                username: null,
                service: null
              },
              acceptedAccountDetails: {
                username: 'xrpcafe',
                service: 'xrp.cafe'
              }
            },
            {
              type: 'xls20',
              nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC972365DB405E9EB19',
              acceptedAt: '1761188720',
              acceptedLedgerIndex: '99707051',
              acceptedTxHash: 'F7AFAF4C3EE4972A6417ED23A8437653E0A01A8C56C35C5B135BDD056718242A',
              acceptedAccount: 'rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC',
              seller: 'rEgKovBZ4Q9Uo8RC2e6vriF6wXmbWea44e',
              buyer: 'rJuVwXaTL3KUpJN4rjtgZecrtn5kxfM31n',
              amount: '225753108',
              broker: true,
              marketplace: 'xrp.cafe',
              saleType: 'secondary',
              amountInConvertCurrencies: {
                usd: '537.1366'
              },
              nftoken: {
                type: 'xls20',
                flags: {
                  burnable: false,
                  onlyXRP: false,
                  trustLine: false,
                  transferable: true,
                  mutable: false
                },
                issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
                nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC972365DB405E9EB19',
                nftokenTaxon: 0,
                transferFee: 3000,
                sequence: 99216153,
                owner: 'rJuVwXaTL3KUpJN4rjtgZecrtn5kxfM31n',
                uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233533362E6A736F6E',
                nftSerial: 99216153,
                issuedAt: 1759329421,
                ownerChangedAt: 1761188720,
                deletedAt: null,
                mintedByMarketplace: 'xrp.cafe',
                collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
                url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23536.json',
                metadata: {
                  name: 'raebyzzuF #536',
                  description: '.regdeL PRX eht no sraebyzzuF lanigirO',
                  external_url: '',
                  image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#536.png',
                  attributes: [
                    {
                      trait_type: 'dnuorgkcaB',
                      value: 'eulB LPRX'
                    },
                    {
                      trait_type: 'ruF',
                      value: 'kcalB'
                    },
                    {
                      trait_type: 'seyE',
                      value: 'seyE yppaH'
                    },
                    {
                      trait_type: 'sehtolC',
                      value: 'laitnediserP'
                    },
                    {
                      trait_type: 'htuoM',
                      value: 'eugnoT'
                    },
                    {
                      trait_type: 'raewdaeH',
                      value: 'reitalocohC'
                    }
                  ],
                  properties: {
                    files: [
                      {
                        uri: 'raebyzzuf-#536.png',
                        type: 'image/png'
                      }
                    ],
                    category: 'image',
                    creators: []
                  },
                  compiler: 'NFTexport.io'
                },
                jsonMeta: true,
                issuerDetails: {
                  username: null,
                  service: 'Fuzzybear'
                },
                ownerDetails: {
                  username: null,
                  service: null
                }
              },
              sellerDetails: {
                username: null,
                service: null
              },
              buyerDetails: {
                username: null,
                service: null
              },
              acceptedAccountDetails: {
                username: 'xrpcafe',
                service: 'xrp.cafe'
              }
            }
          ]
        }
      }
      listingsRes = {
        data: {
          type: 'xls20',
          list: 'onSale',
          order: 'offerCreatedNew',
          currency: 'usd',
          collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
          collectionDetails: {
            collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
            name: 'sraebyzzuF',
            family: null,
            description: null,
            image: 'bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#383.png',
            createdAt: 1759327260,
            updatedAt: 1761155150,
            issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
            issuerDetails: {
              address: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
              username: null,
              service: 'Fuzzybear'
            },
            taxon: 0
          },
          sellOffers: true,
          summary: {
            total: 360
          },
          nfts: [
            {
              type: 'xls20',
              flags: {
                burnable: false,
                onlyXRP: false,
                trustLine: false,
                transferable: true,
                mutable: false
              },
              issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
              nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC93A7D03DC05E9E941',
              nftokenTaxon: 0,
              transferFee: 3000,
              sequence: 99215681,
              owner: 'rsRBA6pgV3dTT7TA4GBzqnewQ5wxn9h17J',
              uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233638312E6A736F6E',
              nftSerial: 99215681,
              issuedAt: 1759327532,
              ownerChangedAt: 1761067411,
              deletedAt: null,
              mintedByMarketplace: 'xrp.cafe',
              collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
              url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23681.json',
              metadata: {
                name: 'raebyzzuF #681',
                description: '.regdeL PRX eht no sraebyzzuF lanigirO',
                external_url: '',
                image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#681.png',
                attributes: [
                  {
                    trait_type: 'dnuorgkcaB',
                    value: 'elpruP-deR LPRX'
                  },
                  {
                    trait_type: 'ruF',
                    value: 'yenoH'
                  },
                  {
                    trait_type: 'seyE',
                    value: 'seyE-X resaL'
                  },
                  {
                    trait_type: 'sehtolC',
                    value: 'gaT emaN'
                  },
                  {
                    trait_type: 'htuoM',
                    value: 'prahS'
                  },
                  {
                    trait_type: 'raewdaeH',
                    value: 'temleH nI kcoL'
                  }
                ],
                properties: {
                  files: [
                    {
                      uri: 'raebyzzuf-#681.png',
                      type: 'image/png'
                    }
                  ],
                  category: 'image',
                  creators: []
                },
                compiler: 'NFTexport.io'
              },
              jsonMeta: true,
              issuerDetails: {
                username: null,
                service: 'Fuzzybear'
              },
              ownerDetails: {
                username: null,
                service: null
              },
              sellOffers: [
                {
                  type: 'xls20',
                  nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC93A7D03DC05E9E941',
                  offerIndex: '434D96FDB3D557B0F8BEE0A0C5B1676BFDFB991B41A796660A3C4BA9DDD60C13',
                  createdAt: 1761211512,
                  createdLedgerIndex: 99712933,
                  createdTxHash: '9AC8AEB6DC8DA9AEB48A28BBCF8066A27B3DA735BC369C07E59BBBDA8D3FDADF',
                  account: 'rsRBA6pgV3dTT7TA4GBzqnewQ5wxn9h17J',
                  owner: 'rsRBA6pgV3dTT7TA4GBzqnewQ5wxn9h17J',
                  destination: 'rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC',
                  expiration: null,
                  amount: '232000000',
                  flags: {
                    sellToken: true
                  },
                  accountDetails: {
                    username: null,
                    service: null
                  },
                  ownerDetails: {
                    username: null,
                    service: null
                  },
                  destinationDetails: {
                    username: 'xrpcafe',
                    service: 'xrp.cafe'
                  }
                }
              ]
            },
            {
              type: 'xls20',
              flags: {
                burnable: false,
                onlyXRP: false,
                trustLine: false,
                transferable: true,
                mutable: false
              },
              issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
              nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC90E8BAE9705E9E8FC',
              nftokenTaxon: 0,
              transferFee: 3000,
              sequence: 99215612,
              owner: 'rEp5TJg3qCdnC8oKRM29gTYhGh9CtgegJ7',
              uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233334382E6A736F6E',
              nftSerial: 99215612,
              issuedAt: 1759327490,
              ownerChangedAt: 1761200230,
              deletedAt: null,
              mintedByMarketplace: 'xrp.cafe',
              collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
              url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23348.json',
              metadata: {
                name: 'raebyzzuF #348',
                description: '.regdeL PRX eht no sraebyzzuF lanigirO',
                external_url: '',
                image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#348.png',
                attributes: [
                  {
                    trait_type: 'dnuorgkcaB',
                    value: 'atnegaM LPRX'
                  },
                  {
                    trait_type: 'ruF',
                    value: 'nworB'
                  },
                  {
                    trait_type: 'seyE',
                    value: 'seyE-X resaL'
                  },
                  {
                    trait_type: 'sehtolC',
                    value: 'ieL'
                  },
                  {
                    trait_type: 'htuoM',
                    value: 'yfooG'
                  },
                  {
                    trait_type: 'raewdaeH',
                    value: 'paC lortaP'
                  }
                ],
                properties: {
                  files: [
                    {
                      uri: 'raebyzzuf-#348.png',
                      type: 'image/png'
                    }
                  ],
                  category: 'image',
                  creators: []
                },
                compiler: 'NFTexport.io'
              },
              jsonMeta: true,
              issuerDetails: {
                username: null,
                service: 'Fuzzybear'
              },
              ownerDetails: {
                username: null,
                service: null
              },
              sellOffers: [
                {
                  type: 'xls20',
                  nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC90E8BAE9705E9E8FC',
                  offerIndex: 'CEB7FB87A90BE8A8AB512AF3453FFB0845F3FAE251111C67AE4CF046A4922F34',
                  createdAt: 1761210452,
                  createdLedgerIndex: 99712660,
                  createdTxHash: 'D1C4ED6D6AD90F8B8DFF6BA66178762FB26BF9F5D1E53EBB775F3747390B0169',
                  account: 'rEp5TJg3qCdnC8oKRM29gTYhGh9CtgegJ7',
                  owner: 'rEp5TJg3qCdnC8oKRM29gTYhGh9CtgegJ7',
                  destination: 'rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC',
                  expiration: null,
                  amount: '232500000',
                  flags: {
                    sellToken: true
                  },
                  accountDetails: {
                    username: null,
                    service: null
                  },
                  ownerDetails: {
                    username: null,
                    service: null
                  },
                  destinationDetails: {
                    username: 'xrpcafe',
                    service: 'xrp.cafe'
                  }
                }
              ]
            },
            {
              type: 'xls20',
              flags: {
                burnable: false,
                onlyXRP: false,
                trustLine: false,
                transferable: true,
                mutable: false
              },
              issuer: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR',
              nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC96CD4164E05E9E9B3',
              nftokenTaxon: 0,
              transferFee: 3000,
              sequence: 99215795,
              owner: 'rDeJ4nvQ5oC5dEstxTCeYqhr9GvnDRtmjK',
              uri: '697066733A2F2F62616679626569677567637466686E696C706A74327032766678626F666370686E717479366A7963726F376A7562366B6D33787278676E366A67342F72616562797A7A754620233439372E6A736F6E',
              nftSerial: 99215795,
              issuedAt: 1759327672,
              ownerChangedAt: 1761204381,
              deletedAt: null,
              mintedByMarketplace: 'xrp.cafe',
              collection: 'r3NftTqH2hv3skuWAEDWKvqnxjtuqcFWYR:0',
              url: 'https://ipfs.io/ipfs/bafybeigugctfhnilpjt2p2vfxbofcphnqty6jycro7jub6km3xrxgn6jg4/raebyzzuF%20%23497.json',
              metadata: {
                name: 'raebyzzuF #497',
                description: '.regdeL PRX eht no sraebyzzuF lanigirO',
                external_url: '',
                image: 'ipfs://bafybeid7c2wzlm6z6fhcruulavmqonlqqdkzdvhaw54lygwxyr24zbtfki/raebyzzuf-#497.png',
                attributes: [
                  {
                    trait_type: 'dnuorgkcaB',
                    value: 'atnegaM LPRX'
                  },
                  {
                    trait_type: 'ruF',
                    value: 'nworB'
                  },
                  {
                    trait_type: 'seyE',
                    value: 'seyE ratS'
                  },
                  {
                    trait_type: 'sehtolC',
                    value: 'yrediorbmE'
                  },
                  {
                    trait_type: 'htuoM',
                    value: 'yfooG'
                  },
                  {
                    trait_type: 'raewdaeH',
                    value: 'relpdiR'
                  }
                ],
                properties: {
                  files: [
                    {
                      uri: 'raebyzzuf-#497.png',
                      type: 'image/png'
                    }
                  ],
                  category: 'image',
                  creators: []
                },
                compiler: 'NFTexport.io'
              },
              jsonMeta: true,
              issuerDetails: {
                username: null,
                service: 'Fuzzybear'
              },
              ownerDetails: {
                username: null,
                service: null
              },
              sellOffers: [
                {
                  type: 'xls20',
                  nftokenID: '00080BB84F44098667FBB6C8E7F589183B68708A94C05FC96CD4164E05E9E9B3',
                  offerIndex: 'E91B1FC2BEC5243C4513F9371E363CA3DB6EB01C09CD95EEEC628F23CAB0E431',
                  createdAt: 1761204482,
                  createdLedgerIndex: 99711118,
                  createdTxHash: '0C85F4E308978F3BB08BEA3B9E8D3F258C1F9A41D1AEA5D1520F1681BA39EC36',
                  account: 'rDeJ4nvQ5oC5dEstxTCeYqhr9GvnDRtmjK',
                  owner: 'rDeJ4nvQ5oC5dEstxTCeYqhr9GvnDRtmjK',
                  destination: 'rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC',
                  expiration: null,
                  amount: '825000000',
                  flags: {
                    sellToken: true
                  },
                  accountDetails: {
                    username: null,
                    service: null
                  },
                  ownerDetails: {
                    username: null,
                    service: null
                  },
                  destinationDetails: {
                    username: 'xrpcafe',
                    service: 'xrp.cafe'
                  }
                }
              ]
            }
          ],
          limit: 3,
          marker: '16E5DA2A00000001'
        }
      }

      setActivityData({
        sales: salesRes?.data?.sales || [],
        listings: listingsRes?.data?.nfts || [],
        mints: nftList.slice(0, 3)
      })
    } catch (error) {
      console.error('Error fetching activity data:', error)
      setActivityData({ sales: [], listings: [], mints: [] })
    } finally {
      setActivityLoading(false)
    }
  }

  const collectionName = (data) => {
    return (
      data?.collection?.name || (
        <>
          {addressUsernameOrServiceLink(data?.collection, 'issuer', { short: isMobile })} ({data?.collection?.taxon})
        </>
      )
    )
  }

  const imageUrl = ipfsUrl(collection?.image)

  const renderActivityTable = (kind) => {
    let title = ''
    let headers = []
    let items = []
    if (kind === 'sales') {
      title = 'Recent Sales'
      headers = ['NFT', 'Seller / Buyer', 'Price', 'Sold']
      items = activityData.sales || []
    } else if (kind === 'listings') {
      title = 'Recent Listings'
      headers = ['NFT', 'Owner', 'Price', 'Listed']
      items = activityData.listings || []
    } else if (kind === 'mints') {
      title = 'Recent Mints'
      headers = ['NFT', 'Owner', 'Minted']
      items = activityData.mints || []
    }

    // Mobile: render blocks instead of table
    if (isMobile) {
      return (
        <table className="table-details">
          <thead>
            <tr>
              <th colSpan="100">{title}</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, i) => {
                return (
                  <React.Fragment key={i}>
                    <tr>
                      <td>NFT</td>
                      <td>
                        <NftImage nft={item} style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4 }} />{' '}
                        <Link href={'/nft/' + item.nftokenID}>{nftName(item?.nftoken || item)}</Link>
                      </td>
                    </tr>
                    {kind === 'sales' && (
                      <>
                        <tr>
                          <td>Seller</td>
                          <td>
                            <AddressWithIconInline data={item} name="seller" options={{ short: true }} />
                          </td>
                        </tr>
                        <tr>
                          <td>Buyer</td>
                          <td>
                            <AddressWithIconInline data={item} name="buyer" options={{ short: true }} />
                          </td>
                        </tr>
                        <tr>
                          <td>Price</td>
                          <td>
                            {amountFormat(item.amount)}≈ {convertedAmount(item, selectedCurrency, { short: true })}
                          </td>
                        </tr>
                        <tr>
                          <td>Sold</td>
                          <td>{timeFromNow(item.acceptedAt, i18n)}</td>
                        </tr>
                      </>
                    )}
                    {kind === 'listings' && (
                      <>
                        <tr>
                          <td>Owner</td>
                          <td>{item.owner && addressUsernameOrServiceLink(item, 'owner', { short: 6 })}</td>
                        </tr>
                        <tr>
                          <td>Price</td>
                          <td>
                            {amountFormat(item?.sellOffers?.[0]?.amount)}
                            {nativeCurrencyToFiat({
                              amount: item?.sellOffers?.[0]?.amount,
                              selectedCurrency,
                              fiatRate
                            })}
                          </td>
                        </tr>
                        <tr>
                          <td>Date</td>
                          <td>{fullDateAndTime(item.ownerChangedAt)}</td>
                        </tr>
                      </>
                    )}
                    {kind === 'mints' && (
                      <>
                        <tr>
                          <td>Owner</td>
                          <td>{item.owner && addressUsernameOrServiceLink(item, 'owner', { short: 6 })}</td>
                        </tr>
                        <tr>
                          <td>Date</td>
                          <td>{fullDateAndTime(item.issuedAt)}</td>
                        </tr>
                      </>
                    )}
                    {i !== items.length - 1 && (
                      <tr>
                        <td colSpan="100">
                          <hr />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            ) : (
              <tr>
                <td colSpan="100">No information found</td>
              </tr>
            )}
          </tbody>
        </table>
      )
    }

    const nftImageSize = kind === 'sales' ? 40 : 20

    // Desktop: render table
    return (
      <table className="table-details" style={{ marginBottom: '20px' }}>
        <thead>
          <tr>
            <th colSpan="100">{title}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {items.length > 0 &&
              headers.map((h, i) => (
                <td className={'bold' + (['Price', 'Sold', 'Listed', 'Minted'].includes(h) ? ' right' : '')} key={i}>
                  {h}
                </td>
              ))}
          </tr>
          {items.length > 0 ? (
            items.map((item, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <NftImage
                      nft={item}
                      style={{ width: nftImageSize, height: nftImageSize, objectFit: 'cover', borderRadius: 4 }}
                    />
                    <span className="code" style={{ display: 'flex', flexDirection: 'column' }}>
                      <Link href={'/nft/' + item.nftokenID}>{nftName(item?.nftoken || item)}</Link>
                    </span>
                  </div>
                </td>
                {kind === 'sales' && (
                  <>
                    <td style={{ width: 'fit-content' }}>
                      <AddressWithIconInline data={item} name="seller" options={{ short: true }} />
                      <br />
                      <AddressWithIconInline data={item} name="buyer" options={{ short: true }} />
                    </td>
                    <td className="right">
                      {amountFormat(item.amount)}{' '}
                      <span className="no-brake">≈{convertedAmount(item, selectedCurrency, { short: true })}</span>
                    </td>
                    <td className="right">{timeFromNow(item.acceptedAt, i18n)}</td>
                  </>
                )}
                {kind === 'listings' && (
                  <>
                    <td>{item.owner && <AddressWithIconInline data={item} name="owner" options={{ short: 5 }} />}</td>
                    <td className="right">
                      {amountFormat(item?.sellOffers?.[0]?.amount)}
                      {nativeCurrencyToFiat({ amount: item?.sellOffers?.[0]?.amount, selectedCurrency, fiatRate })}
                    </td>
                    <td className="right">{timeFromNow(item.ownerChangedAt, i18n)}</td>
                  </>
                )}
                {kind === 'mints' && (
                  <>
                    <td>
                      {item.owner && <AddressWithIconInline data={item} name="owner" options={{ short: true }} />}
                    </td>
                    <td className="right">{timeFromNow(item.issuedAt, i18n)}</td>
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length}>No information found</td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }

  const statsTdClass = isMobile ? 'right' : ''

  return (
    <div className={nftClass}>
      <SEO
        page="NFT Collection"
        title={'NFT Collection'}
        description={
          collection?.description ||
          t('desc', { ns: 'nft' }) +
            (collection?.issuer ? ' - ' + t('table.issuer') + ': ' + usernameOrAddress(collection, 'issuer') : '')
        }
        image={{ file: imageUrl }}
      />
      <div className="content-profile">
        {id && !data?.error ? (
          <>
            {!data && !errorMessage ? (
              <div className="center" style={{ marginTop: '80px' }}>
                <span className="waiting"></span>
                <br />
                {t('general.loading')}
              </div>
            ) : (
              <>
                {errorMessage ? (
                  <div className="center orange bold">{errorMessage}</div>
                ) : (
                  <>
                    {data && (
                      <>
                        <div className="column-left">
                          <div>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={collectionName(data)}
                                style={{ width: '100%', height: 'auto' }}
                              />
                            ) : (
                              'No image available'
                            )}
                          </div>
                        </div>

                        <div className="column-right">
                          {collection?.issuer && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Collection information</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Collection</td>
                                  <td>{collectionName(data)}</td>
                                </tr>
                                {collection?.description && (
                                  <tr>
                                    <td>Description</td>
                                    <td>{collection?.description}</td>
                                  </tr>
                                )}
                                <tr>
                                  <td>Issuer</td>
                                  <td>
                                    <AddressWithIconFilled
                                      data={collection}
                                      name="issuer"
                                      options={{ short: isMobile }}
                                    />
                                  </td>
                                </tr>
                                {collection?.taxon !== undefined && (
                                  <tr>
                                    <td>Taxon</td>
                                    <td>{collection?.taxon}</td>
                                  </tr>
                                )}
                                {collection?.createdAt && (
                                  <tr>
                                    <td>Created</td>
                                    <td>
                                      {timeFromNow(collection.createdAt, i18n)} ({fullDateAndTime(collection.createdAt)}
                                      )
                                    </td>
                                  </tr>
                                )}
                                {collection?.updatedAt && (
                                  <tr>
                                    <td>Updated</td>
                                    <td>
                                      {timeFromNow(collection.updatedAt, i18n)} ({fullDateAndTime(collection.updatedAt)}
                                      )
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}

                          {statistics && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Statistics</th>
                                </tr>
                              </thead>
                              <tbody>
                                {statistics?.nfts && (
                                  <tr>
                                    <td style={isMobile ? null : { width: 200 }}>Total NFTs</td>
                                    <td className={statsTdClass}>{statistics.nfts}</td>
                                  </tr>
                                )}
                                {statistics?.owners && (
                                  <tr>
                                    <td>Unique owners</td>
                                    <td className={statsTdClass}>{statistics.owners}</td>
                                  </tr>
                                )}
                                {statistics?.all?.buyers && (
                                  <tr>
                                    <td>Total buyers</td>
                                    <td className={statsTdClass}>{statistics.all.buyers}</td>
                                  </tr>
                                )}
                                {statistics?.all?.tradedNfts && (
                                  <tr>
                                    <td>Total traded NFTs</td>
                                    <td className={statsTdClass}>{statistics.all.tradedNfts}</td>
                                  </tr>
                                )}
                                {statistics?.month?.tradedNfts && (
                                  <tr>
                                    <td>Monthly traded NFTs</td>
                                    <td className={statsTdClass}>{statistics.month.tradedNfts}</td>
                                  </tr>
                                )}
                                {statistics?.week?.tradedNfts && (
                                  <tr>
                                    <td>Weekly traded NFTs</td>
                                    <td className={statsTdClass}>{statistics.week.tradedNfts}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}

                          <table className="table-details">
                            <thead>
                              <tr>
                                <th colSpan="100">
                                  NFTs in this Collection
                                  {collection?.issuer && (collection?.taxon || collection?.taxon === 0) ? (
                                    <>
                                      {' '}
                                      [
                                      <Link
                                        href={`/nft-explorer?issuer=${collection?.issuer}&taxon=${collection?.taxon}&includeWithoutMediaData=true`}
                                      >
                                        View all
                                      </Link>
                                      ]
                                    </>
                                  ) : (
                                    collection?.collection && (
                                      <>
                                        {' '}
                                        [
                                        <Link
                                          href={`/nft-explorer?collection=${encodeURIComponent(
                                            data
                                          )}&includeWithoutMediaData=true`}
                                        >
                                          View all
                                        </Link>
                                        ]
                                      </>
                                    )
                                  )}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td colSpan={100}>
                                  <div>
                                    {nftList.length === 0 && <span>No NFTs found</span>}
                                    {nftList?.map((nft, i) => (
                                      <Link href={`/nft/${nft.nftokenID}`} key={i}>
                                        <NftImage
                                          nft={nft}
                                          style={
                                            width > 800
                                              ? {
                                                  width: 67.3,
                                                  height: 67.3,
                                                  borderRadius: 4,
                                                  margin: 2
                                                }
                                              : { width: 80.5, height: 80.5, borderRadius: 4, margin: 2 }
                                          }
                                        />
                                      </Link>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <div style={{ marginTop: '20px' }}>
                            {activityLoading && (
                              <div className="center" style={{ marginTop: '10px' }}>
                                <span className="waiting"></span>
                              </div>
                            )}

                            {!activityLoading && (
                              <div style={{ marginTop: '10px' }}>
                                {renderActivityTable('sales')}
                                {renderActivityTable('listings')}
                                {renderActivityTable('mints')}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="center">NFT Collection</h2>
            <p className="center">{data?.error || t('desc', { ns: 'nft' })}</p>
          </>
        )}
      </div>
    </div>
  )
}
