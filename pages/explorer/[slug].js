import { isAddressOrUsername, isIdValid, isLedgerIndexValid, isValidCTID } from '../../utils'
import { axiosServer, passHeaders } from '../../utils/axios'
import SEO from '../../components/SEO'

const slugRegex = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i
const forbiddenSlugsRegex = /^.((?!\$).)*.?\.(7z|gz|rar|tar)$/i

const legacySearchTypeToRoute = {
  transaction: '/tx/',
  nftoken: '/nft/',
  uriToken: '/nft/',
  nftokenOffer: '/nft-offer/',
  amm: '/amm/',
  ledgerEntry: '/object/',
  ledger: '/ledger/'
}

async function resolveLegacyExplorerDestination(slug, req) {
  if (typeof slug !== 'string' || !slugRegex.test(slug) || forbiddenSlugsRegex.test(slug)) {
    return null
  }

  if (isValidCTID(slug)) {
    return '/tx/' + slug
  }

  if (isLedgerIndexValid(slug)) {
    return '/ledger/' + slug
  }

  if (isAddressOrUsername(slug)) {
    return '/account/' + encodeURIComponent(slug)
  }

  if (!isIdValid(slug)) {
    return null
  }

  try {
    const response = await axiosServer({
      method: 'get',
      url: 'v3/search/' + slug,
      headers: passHeaders(req)
    })

    const routePrefix = legacySearchTypeToRoute[response?.data?.type]
    if (!routePrefix) {
      return null
    }

    return routePrefix + slug
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getServerSideProps(context) {
  const { params, req } = context
  const slug = params?.slug
  const destination = await resolveLegacyExplorerDestination(slug, req)

  if (destination) {
    return {
      redirect: {
        destination,
        permanent: true
      }
    }
  }

  return {
    notFound: true
  }
}

export default function ExplorerRedirectFallback() {
  return <SEO noindex />
}
