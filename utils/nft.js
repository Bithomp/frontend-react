import { Buffer } from 'buffer'
import { stripText } from '.'

import Link from 'next/link'
import { ReactComponent as LinkIcon } from "../public/images/link.svg";

//identified NFT Market Places
export const mpUrl = (offer) => {
  if (!offer || !offer.destination || !offer.destinationDetails) return "";
  const service = offer.destinationDetails.service;
  let url = '';
  if (service === "onXRP") {
    url = "https://nft.onxrp.com/nft/";
  } else if (service === "xrp.cafe") {
    url = "https://xrp.cafe/nft/";
  } else if (service === "xMart") {
    url = "https://api.xmart.art/nft/";
  } else if (service === "nftmaster") {
    url = "https://nftmaster.com/nft/";
  } else if (service === "XPmarket") {
    url = "https://xpmarket.com/nfts/item/";
  } else if (service === "Equilibrium Games") {
    url = "https://equilibrium-games.com/marketplace/nft/";
  }
  if (url) {
    return url + offer.nftokenID;
  } else {
    return "";
  }
}

export const bestSellOffer = sellOffers => {
  if (!sellOffers) return null;
  //sellOffers = sellOffers.filter(function (offer) { return offer.valid; });
  //best xrp offer available or an IOU offer, if it's only one IOU offer available
  let bestSellOffer = null;
  if (sellOffers.length) {
    let iouOffers = [];
    let xrpOffers = [];

    for (let i = 0; i < sellOffers.length; i++) {
      if (sellOffers[i].amount.value) {
        iouOffers.push(sellOffers[i]);
      } else {
        xrpOffers.push(sellOffers[i]);
      }
    }

    if (xrpOffers.length > 0) {
      //without destination firsts
      xrpOffers = xrpOffers.sort((a, b) => {
        if (!a.destination && b.destination) return 1;
        if (a.destination && !b.destination) return -1;
        return a.createdAt - b.createdAt;
      });
      //sort cheapest on top
      xrpOffers = xrpOffers.sort((a, b) => (parseFloat(a.amount) > parseFloat(b.amount)) ? 1 : -1);

      for (let i = 0; i < xrpOffers.length; i++) {
        if (mpUrl(xrpOffers[i]) || !xrpOffers[i].destination) {
          //if known destination - (not a private offer) or on Open Market
          bestSellOffer = xrpOffers[i];
          break;
        }
      }
    }

    if (!bestSellOffer && iouOffers.length > 0) {
      // if no XRP offers fits creterias above choose IOU if it's only one fits.
      let iouFitOffers = [];
      //check that if it's not a private offer (only MP and public)
      for (let i = 0; i < iouOffers.length; i++) {
        if (mpUrl(iouOffers[i]) || !iouOffers[i].destination) {
          iouFitOffers.push(iouOffers[i]);
        }
      }
      if (iouFitOffers.length > 1) {
        //public offers firsts
        iouFitOffers = iouFitOffers.sort((a, b) => {
          if (!a.destination && b.destination) return 1;
          if (a.destination && !b.destination) return -1;
          return a.createdAt - b.createdAt;
        });
        //latest on top, need to test
        //iouFitOffers = iouFitOffers.sort((a, b) => (parseFloat(a.createdAt) < parseFloat(b.createdAt)) ? 1 : -1);
      }
      if (iouFitOffers.length > 0) {
        bestSellOffer = iouFitOffers[0];
      }
    }
    return bestSellOffer;
  } else {
    return null;
  }
}

export const nftThumbnail = nft => {
  if (!nft || !nft.nftokenID) return "";
  const imageSrc = nftUrl(nft, 'thumbnail');
  if (!imageSrc) return "";
  return <Link href={"/nft/" + nft.nftokenID}>
    <img
      src={imageSrc}
      width="32px"
      height="32px"
      style={{ borderRadius: "50% 20% / 10% 40%", verticalAlign: "middle" }}
      alt={nft.metadata?.name}
    />
  </Link>
}

export const nftNameLink = nft => {
  if (!nft) return "";
  return <Link href={"/nft/" + nft.nftokenID}>
    {nft?.metadata?.name ? nft.metadata.name : <LinkIcon />}
  </Link>
}

export const nftName = nft => {
  if (nft?.metadata?.name) {
    return stripText(nft.metadata.name);
  } else if (nft?.uri) {
    let name = Buffer.from(nft.uri, 'hex');
    if (name.includes('filename=')) {
      name = name.split('filename=')[1];
      return stripText(name);
    }
  }
}

export const isValidTaxon = taxon => {
  if (taxon !== 0 && !taxon) return false;
  taxon = Number(taxon);
  return Number.isInteger(taxon) && taxon > -1 && taxon < 2147483648;
}

const isValidCid = hash => {
  return /^Qm[a-zA-Z0-9]{44}$|^baf[a-zA-Z0-9]{56}$/.test(hash);
}

const ipfsUrl = (uri, type = 'image', gateway = 'our') => {
  if (!uri) return null;
  let url = uri.toString();
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

  //3d model
  if (url.includes('QmUR2XyUZvGvsNMmLBA5joPduT4f95jSMGzzzmCkckKSF4/?object=')) {
    url = url.split('QmUR2XyUZvGvsNMmLBA5joPduT4f95jSMGzzzmCkckKSF4/?object=')[1];
    if (url.includes('&filename=')) {
      url = url.split('&filename=')[0];
    }
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
    } else if (gateway === 'cl' && type === 'model') {
      return stripText(uri);
    } else if (gateway === 'cl' || type === 'audio' || type === 'model' || type === 'viewer') {
      return 'https://cloudflare-ipfs.com/ipfs/' + url;
    }
  } else {
    return null;
  }
}

const assetUrl = (uri, type = 'image', gateway = 'our') => {
  uri = uri.toString();
  if (type === 'image' && (isCorrectFileType(uri, 'video') || isCorrectFileType(uri, 'audio') || isCorrectFileType(uri, 'model'))) {
    return null;
  }
  if (type === 'video' && (isCorrectFileType(uri, 'image') || isCorrectFileType(uri, 'audio') || isCorrectFileType(uri, 'model'))) {
    return null;
  }
  if (type === 'model' && (isCorrectFileType(uri, 'image') || isCorrectFileType(uri, 'audio') || isCorrectFileType(uri, 'video'))) {
    return null;
  }
  if (type === 'audio' && (isCorrectFileType(uri, 'image') || isCorrectFileType(uri, 'model') || isCorrectFileType(uri, 'video'))) {
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

const metaUrl = (nft, type = 'image', gateway = 'our') => {
  if (!nft.metadata) return null;
  let meta = nft.metadata;
  if (type === 'image' || type === 'thumbnail') {
    if (meta.image) return assetUrl(meta.image, type, gateway);
    if (meta.image_url) return assetUrl(meta.image_url, type, gateway);
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type, gateway);
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type, gateway);
    //sologenic
    if (meta.content_type && meta.content_type.includes("image") && meta.file_extension && nft.uri) {
      let decodedUri = Buffer.from(nft.uri, 'hex').toString();
      if (decodedUri.toLowerCase().includes("metadata.json")) {
        return assetUrl(decodedUri.replace("metadata.json", ("data." + meta.file_extension)), type, gateway);
      }
    };
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
  if (type === 'model') {
    if (meta['3D_model']) return assetUrl(meta['3D_model'], type, gateway);
  }
  if (type === 'viewer') {
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type, gateway);
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type, gateway);
  }
  return null;
}

const isCorrectFileType = (url, nftType = 'image') => {
  if (!url) return false;
  url = url.toString().trim();
  let type = url.slice(-4).toUpperCase();
  let type4 = url.slice(-5).toUpperCase();
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
  } else if (nftType === 'model') {
    if (url.includes('QmUR2XyUZvGvsNMmLBA5joPduT4f95jSMGzzzmCkckKSF4')) {
      return true;
    }
    if (type4 === '.GLTF' || type === '.GLB' || type === '.OBJ' || type === '.3DS' || type === '.STL' || type === '.PLY' || type === '.3DM' || type === '.OFF') {
      return true;
    }
  } else if (nftType === 'viewer') {
    if (type4 === '.HTML' || type === '.HTM' || type === '.PHP') {
      return true;
    }
  }
  return false;
}

export const nftUrl = (nft, type = 'image', gateway = 'our') => {
  if (!nft) return null;
  const url = metaUrl(nft, type, gateway);
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