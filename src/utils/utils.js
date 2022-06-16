export const numberWithSpaces = (x) => {
  if (!x) {
    return '';
  }
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(".");
}

//const networks = ['local', 'mainnet', 'testnet', 'beta', 'xls20', 'hooks'];
//const devNetworks = ['testnet', 'beta', 'xls20', 'hooks'];

export const network = process.env.REACT_APP_NETWORK_NAME ? process.env.REACT_APP_NETWORK_NAME : "mainnet";
export const devNet = ['mainnet', 'local'].includes(network) ? false : network;

const Server = () => {
  let server = "https://test.bithomp.com";
  switch (network) {
    case 'mainnet':
      server = "https://bithomp.com";
      break;
    case 'testnet':
      server = "https://test.bithomp.com";
      break;
    case 'hooks':
      server = "https://hooks.bithomp.com";
      break;
    case 'beta':
      server = "https://beta.bithomp.com";
      break;
    case 'xls20':
      server = "https://xls20.bithomp.com";
      break;
    case 'local':
      server = "https://test.bithomp.com";
      break;
    default:
      break;
  }
  return server;
}

export const server = Server();

const WssServer = () => {
  let token = '';
  if (process.env.NODE_ENV === 'development') {
    token = '?x-bithomp-token=' + process.env.REACT_APP_BITHOMP_API_TEST_KEY;
  }
  return server.replace("https://", "wss://") + '/wss/' + token;
}

export const wssServer = WssServer();
