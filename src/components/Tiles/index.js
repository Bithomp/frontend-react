import { nftImageStyle } from '../../utils/nft';

import './styles.scss';

export default function Tiles({ nftList }) {

  return <div className='tiles'>
    <div className="grid">
      <ul className="hexGrid">
        {nftList.length > 0 && nftList.map((nft) =>
          <li className="hex" key={nft.nftokenID}>
            <div className="hexIn">
              <a className="hexLink" href={"/explorer/" + nft.nftokenID}>
                <div className='img' style={nftImageStyle(nft)}></div>
                <h1 id="demo1">{nft.metadata?.name}</h1>
                <p id="demo2">{nft.nftSerial}</p>
              </a>
            </div>
          </li>
        )}
      </ul>
    </div>
  </div>
};
