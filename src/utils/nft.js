import { Buffer } from 'buffer';
import { stripText } from '.';

export const isValidTaxon = (taxon) => {
  if (taxon !== 0 && !taxon) return false;
  taxon = Number(taxon);
  return Number.isInteger(taxon) && taxon > -1 && taxon < 2147483648;
}

const isValidCid = (hash) => {
  return /^Qm[a-zA-Z0-9]{44}$|^baf[a-zA-Z0-9]{56}$/.test(hash);
}

const ipfsUrl = (url, type = 'image') => {
  if (!url) return null;
  url = url.toString();
  if (url.includes('.ipfs.w3s.link') || url.includes('.ipfs.nftstorage.link')) {
    url = url.replace("https://", "");
    url = url.replace(".ipfs.w3s.link", "");
    url = url.replace(".ipfs.nftstorage.link", "");
  } else if (url.slice(0, 4) === 'cid:') {
    return 'https://wallet.xrplnft.art/ipfs/' + url.slice(4);
    //url = url.slice(4);
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
    return 'https://ipfs.bithomp.com/' + type + '/' + stripText(url);
  } else {
    return null;
  }
}

const assetUrl = (uri, type = 'image') => {
  uri = uri.toString();
  if (type === 'image' && isCorrectFileType(uri, 'video')) {
    return null;
  }
  if (type === 'video' && isCorrectFileType(uri, 'image')) {
    return null;
  }

  const ipfs = ipfsUrl(uri, type);
  if (ipfs) {
    return ipfs;
  } else if (uri.slice(0, 8) === 'https://') {
    return stripText(uri);
  } else if (type === 'image' && uri.slice(0, 10) === 'data:image') {
    return stripText(uri);
  } else {
    return null;
  }
}

const metaUrl = (meta, type = 'image') => {
  if (!meta) return null;
  if (type === 'image') {
    if (meta.image) return assetUrl(meta.image, type);
    if (meta.image_url) return assetUrl(meta.image_url, type);
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type);
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type);
  }
  if (type === 'video') {
    if (meta.video) return assetUrl(meta.video, type);
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type);
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type);
    if (meta.content) return assetUrl(meta.content, type);
  }
  return null;
}

const isCorrectFileType = (url, nftType = 'image') => {
  if (!url) return false;
  let type = url.toString().slice(-4).toUpperCase();
  if (nftType === 'image') {
    if (type === '.JPG' || type === '.PNG' || type === '.GIF') {
      return true;
    }
    if (url.slice(0, 10) === 'data:image') {
      return true;
    }
  }
  if (nftType === 'video') {
    if (type === '.MP4') {
      return true;
    }
  }
  return false;
}

export const nftUrl = (nft, type = 'image') => {
  if (!nft) return null;
  const url = metaUrl(nft.metadata, type);
  if (url) {
    return url;
  } else {
    if (nft.uri) {
      const decodedUri = Buffer.from(nft.uri, 'hex');
      if (isCorrectFileType(decodedUri, type)) {
        return assetUrl(decodedUri);
      }
    }
    return null;
  }
}

export const nftImageStyle = (nft, style = {}) => {
  if (!nft) { return {} };
  const imageUrl = nftUrl(nft, 'image');
  if (imageUrl) {
    style.backgroundImage = "url('" + imageUrl + "')";
    if (imageUrl.slice(0, 10) === 'data:image') {
      style.imageRendering = 'pixelated';
    }
  } else if (!nft.uri) {
    style.imageRendering = 'pixelated';
    style.backgroundSize = "80%";
    style.backgroundRepeat = "no-repeat";
    style.backgroundColor = "white";
    style.backgroundImage = "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAMAgMAAABO9kYLAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACVBMVEUAAAAAscH///9gi2cVAAAAAXRSTlMAQObYZgAAAAFiS0dEAmYLfGQAAAAJb0ZGcwAAAAQAAAAMAO0Ou9QAAAAJdnBBZwAAAE0AAAAaABY5XmAAAABCSURBVAjXdc6xEYAwDATBI1AHcj9fwhOo/1ZsEQIKd+aCw3iVCLJKYerjW2Tb5CXsyadvx2QHbUbjXz8/lEycn5c3880aCfVVMdcAAAAASUVORK5CYII=')";
  }
  return style;
}