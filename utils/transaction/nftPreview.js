export const getTransactionNftPreview = (data) => {
  const txType = data?.tx?.TransactionType || ''
  const isUriToken = txType.includes('URIToken')
  const isNfToken = txType.includes('NFToken')
  if (!isUriToken && !isNfToken) return null

  const objectKey = isUriToken ? 'uritokens' : 'nftokens'
  const changeKey = isUriToken ? 'uritokenChanges' : 'nftokenChanges'
  const idKey = isUriToken ? 'uritokenID' : 'nftokenID'
  const affectedNfts = data?.outcome?.affectedObjects?.[objectKey] || {}
  const affectedNftList = Object.values(affectedNfts)
  const nftChangeEntries = data?.outcome?.[changeKey] || []
  const nftChanges = nftChangeEntries.flatMap((entry) => entry?.[changeKey] || [])

  const nftId = isUriToken
    ? data?.tx?.URITokenID ||
      data?.meta?.uritoken_id ||
      data?.meta?.uritokenID ||
      data?.specification?.uritokenID ||
      nftChanges.find((entry) => entry?.uritokenID)?.uritokenID ||
      affectedNftList[0]?.uritokenID
    : data?.tx?.NFTokenID ||
      data?.meta?.nftoken_id ||
      data?.meta?.nftokenID ||
      data?.specification?.nftokenID ||
      data?.specification?.nftokenOffer?.nftokenID ||
      nftChanges.find((entry) => entry?.nftokenID)?.nftokenID ||
      affectedNftList[0]?.nftokenID

  const nft = (nftId && affectedNfts[nftId]) || affectedNftList[0] || null
  const id = nft?.[idKey] || nftId
  if (!nft || !id) return null

  const changeEntry =
    nftChangeEntries.find((entry) => (entry?.[changeKey] || []).some((change) => change?.[idKey] === id)) ||
    nftChangeEntries[0] ||
    null
  const change = changeEntry?.[changeKey]?.find((entry) => entry?.[idKey] === id) || nftChanges[0] || null
  const owner =
    txType === 'NFTokenModify' && changeEntry?.address
      ? {
          address: changeEntry.address,
          addressDetails: changeEntry.addressDetails
        }
      : null

  return { id, nft, change, owner, txType }
}
