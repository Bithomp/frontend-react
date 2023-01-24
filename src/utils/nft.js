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

const ipfsUrl = (url, type = 'image', gateway = 'our') => {
  if (!url) return null;
  url = url.toString();
  if (url.includes('.ipfs.w3s.link') || url.includes('.ipfs.nftstorage.link')) {
    url = url.replace("https://", "");
    url = url.replace(".ipfs.w3s.link", "");
    url = url.replace(".ipfs.nftstorage.link", "");
  } else if (url.slice(0, 4) === 'cid:') {
    return 'https://wallet.xrplnft.art/ipfs/' + url.slice(4); //centralised option
    //url = url.slice(4); //decentralised option is too slow
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
    url = stripText(cid + url.split(cid).pop());
    url = url.replace('#', '%23');
    if (gateway === 'our' && (type === 'image' || type === 'video' || type === 'thumbnail')) {
      return 'https://ipfs.bithomp.com/' + type + '/' + url;
    } else if (gateway === 'cl' || type === 'audio') {
      return 'https://cloudflare-ipfs.com/ipfs/' + url;
    }
  } else {
    return null;
  }
}

const assetUrl = (uri, type = 'image', gateway = 'our') => {
  uri = uri.toString();
  if (type === 'image' && isCorrectFileType(uri, 'video')) {
    return null;
  }
  if (type === 'video' && isCorrectFileType(uri, 'image')) {
    return null;
  }

  const ipfs = ipfsUrl(uri, type, gateway);
  if (ipfs) {
    return ipfs;
  } else if (uri.slice(0, 8) === 'https://') {
    return stripText(uri);
  } else if ((type === 'image' || type === 'thumbnail') && uri.slice(0, 10) === 'data:image') {
    return stripText(uri);
  } else {
    return null;
  }
}

const metaUrl = (meta, type = 'image', gateway = 'our') => {
  if (!meta) return null;
  if (type === 'image' || type === 'thumbnail') {
    if (meta.image) return assetUrl(meta.image, type, gateway);
    if (meta.image_url) return assetUrl(meta.image_url, type, gateway);
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type, gateway);
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type, gateway);
  }
  if (type === 'video' || type === 'thumbnail') {
    if (meta.video) return assetUrl(meta.video, type, gateway);
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type, gateway);
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type, gateway);
    if (meta.content) return assetUrl(meta.content, type, gateway);
  }
  if (type === 'audio') {
    if (meta.audio) return assetUrl(meta.audio, type, gateway);
  }
  return null;
}

const isCorrectFileType = (url, nftType = 'image') => {
  if (!url) return false;
  let type = url.toString().slice(-4).toUpperCase();
  if (nftType === 'thumbnail') {
    return true;
  } else if (nftType === 'image') {
    if (type === '.JPG' || type === '.PNG' || type === '.GIF' || type === '.PDF') {
      return true;
    }
    if (url.slice(0, 10) === 'data:image') {
      return true;
    }
  } else if (nftType === 'video') {
    if (type === '.MP4') {
      return true;
    }
  } else if (nftType === 'audio') {
    if (type === '.MP3') {
      return true;
    }
  }
  return false;
}

export const nftUrl = (nft, type = 'image', gateway = 'our') => {
  if (!nft) return null;
  const url = metaUrl(nft.metadata, type, gateway);
  if (url) {
    return url;
  } else {
    if (nft.uri) {
      const decodedUri = Buffer.from(nft.uri, 'hex');
      if (isCorrectFileType(decodedUri, type)) {
        return assetUrl(decodedUri, type, gateway);
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
    if (nft.deletedAt) {
      style.filter = 'grayscale(1)';
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