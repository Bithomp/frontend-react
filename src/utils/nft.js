import { Buffer } from 'buffer';
import { stripText } from '.';

const isValidCid = (hash) => {
  return /^Qm[a-zA-Z0-9]{44}$|^baf[a-zA-Z0-9]{56}$/.test(hash);
}

const ipfsUrl = (url) => {
  if (!url) return null;
  if (url.includes('.ipfs.w3s.link') || url.includes('.ipfs.nftstorage.link')) {
    url = url.replace("https://", "");
    url = url.replace(".ipfs.w3s.link", "");
    url = url.replace(".ipfs.nftstorage.link", "");
  } else if (url.slice(0, 4) === 'cid:') {
    return 'https://wallet.xrplnft.art/ipfs/' + url.slice(4);
    //url = slice(4);
  } else if (url.includes('?filename=')) {
    url = url.split('?filename=')[0];
  } else if (url.slice(0, 5) === 'hash:') {
    url = url.slice(5);
  }

  const urlParts = url.split('/');

  let cid = null;

  for (let i = 0; i < urlParts.length; i++) {
    if (isValidCid(urlParts[i])) {
      cid = urlParts[i];
      break;
    }
  }

  if (cid) {
    url = cid + url.split(cid).pop();
    return 'https://ipfs.bithomp.com/image/' + stripText(url);
  } else {
    return null;
  }
}

const assetUrl = (uri) => {
  const ipfs = ipfsUrl(uri);
  if (ipfs) {
    return ipfs;
  } else if (uri.slice(0, 8) === 'https://' || uri.slice(0, 10) === 'data:image') {
    return stripText(uri);
  } else {
    return null;
  }
}

const metaImageUrl = (meta) => {
  if (!meta) return null;
  if (meta.image) return assetUrl(meta.image);
  if (meta.image_url) return assetUrl(meta.image_url);
  if (isIpfsImage(meta.animation)) return assetUrl(meta.animation);
  if (isIpfsImage(meta.animation_url)) return assetUrl(meta.animation_url);
  return null;
}

const isIpfsImage = (url) => {
  if (!url) return false;
  let type = url.slice(-4).toString().toUpperCase();
  if (type === '.JPG' || type === '.PNG' || type === '.GIF') {
    return true;
  }
  if (url.slice(0, 10) === 'data:image') {
    return true;
  }
  return false;
}

const nftImageUrl = (nft) => {
  const imageUrl = metaImageUrl(nft.metadata);
  if (imageUrl) {
    return imageUrl;
  } else {
    const decodedUri = Buffer.from(nft.uri, 'hex');
    if (isIpfsImage(decodedUri)) {
      return assetUrl(decodedUri);
    }
  }
}

export const nftImageStyle = (nft, style = {}) => {
  if (!nft) { return {} };
  const imageUrl = nftImageUrl(nft);
  if (imageUrl) {
    style.backgroundImage = "url('" + imageUrl + "')";

    if (imageUrl.slice(0, 10) === 'data:image') {
      style.imageRendering = 'pixelated';
    }
  }
  return style;
}