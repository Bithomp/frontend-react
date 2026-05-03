import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { xahauNetwork } from '../../utils'
import Tabs from '.'

export default function ServicesTabs({ category, tab }) {
  const router = useRouter()
  const { t } = useTranslation(['common', 'services'])
  const ts = (key) => t(key, { ns: 'services' })

  const groups = [
    {
      value: 'payments',
      label: ts('services-nav.payments'),
      items: [
        { value: 'trustline', label: ts('services-nav.trustline'), href: '/services/trustline' },
        { value: 'send', label: ts('services-nav.send'), href: '/services/send' },
        { value: 'check', label: ts('services-nav.check'), href: '/services/check' },
        { value: 'escrow', label: ts('services-nav.escrow'), href: '/services/escrow' }
      ]
    },
    !xahauNetwork && {
      value: 'amm',
      label: ts('services-nav.amm'),
      items: [
        { value: 'deposit', label: ts('amm.tabs.deposit'), href: '/services/amm/deposit' },
        { value: 'withdraw', label: ts('amm.tabs.withdraw'), href: '/services/amm/withdraw' },
        { value: 'vote', label: ts('amm.tabs.vote'), href: '/services/amm/vote' },
        { value: 'create', label: ts('amm.tabs.create'), href: '/services/amm/create' }
      ]
    },
    {
      value: 'nft',
      label: ts('services-nav.nft'),
      items: [{ value: 'nft-mint', label: ts('services-nav.nft-mint'), href: '/services/nft-mint' }]
    },
    {
      value: 'account',
      label: ts('services-nav.account'),
      items: [
        { value: 'account-settings', label: ts('services-nav.account-settings'), href: '/services/account-settings' },
        { value: 'account-control', label: ts('services-nav.account-control'), href: '/services/account-control' },
        {
          value: 'token-issuer-settings',
          label: ts('services-nav.token-issuer-settings'),
          href: '/services/token-issuer-settings'
        },
        { value: 'account-delete', label: ts('services-nav.account-delete'), href: '/services/account-delete' }
      ]
    }
  ].filter(Boolean)

  const activeGroup =
    groups.find((group) => group.value === category) || groups.find((group) => group.items.some((item) => item.value === tab))

  const activeCategory = activeGroup?.value || groups[0].value
  const activeTab = tab || activeGroup?.items[0]?.value

  const categoryTabs = groups.map(({ value, label }) => ({ value, label }))
  const serviceTabs = activeGroup?.items || groups[0].items

  const changeCategory = (newCategory) => {
    const nextGroup = groups.find((group) => group.value === newCategory)
    const firstItem = nextGroup?.items[0]
    if (firstItem) router.push(firstItem.href)
  }

  const changeService = (newTab) => {
    const nextItem = serviceTabs.find((item) => item.value === newTab)
    if (nextItem) router.push(nextItem.href)
  }

  return (
    <nav className="services-tabs" aria-label={ts('services-nav.label')}>
      <Tabs tabList={categoryTabs} tab={activeCategory} setTab={changeCategory} name="serviceCategories" />
      {serviceTabs.length > 1 && (
        <Tabs tabList={serviceTabs} tab={activeTab} setTab={changeService} name="servicePages" />
      )}
    </nav>
  )
}
