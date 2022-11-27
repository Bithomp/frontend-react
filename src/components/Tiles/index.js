import { nftImageStyle } from '../../utils/nft';

import './styles.scss';

export default function Tiles({ nftList }) {

  const shortName = (name) => {
    if (name?.length > 30) {
      return name.slice(0, 27).trim() + '...';
    }
    return name;
  }

  return <div className='tiles'>
    <div className="grid">
      <ul className="hexGrid">
        {nftList.length > 0 && nftList.map((nft) =>
          <li className="hex" key={nft.nftokenID}>
            <div className="hexIn">
              <a className="hexLink" href={"/explorer/" + nft.nftokenID}>
                <div className='img' style={nftImageStyle(nft)}></div>
                <div className='title'></div>
                <h1>{nft.metadata?.name ? shortName(nft.metadata.name) : ''}</h1>
              </a>
            </div>
          </li>
        )}
      </ul>
    </div>
  </div>
};
