export const DAPPS_META = [
  (() => {
    const order = ['xaman', 'ledger', 'dcent', 'gemwallet', 'crossmark', 'metamask', 'walletconnect', 'joey']
    const meta = {
      10011010: {
        name: 'Magnetic',
        url: 'xmagnetic.org',
        wallets: ['xaman', 'walletconnect', 'joey', 'metamask', 'gemwallet', 'crossmark'],
        x: 'MagneticXRPL',
        logo: 'magnetic.png'
      },
      101102979: {
        name: 'xrp.cafe',
        url: 'xrp.cafe',
        wallets: ['walletconnect', 'xaman', 'gemwallet', 'crossmark'],
        x: 'xrpcafe',
        discord: 'invite/xrpcafe',
        logo: 'xrpcafe.png'
      },
      74920348: {
        name: 'First Ledger',
        url: 'firstledger.net',
        wallets: ['joey'],
        x: 'first_ledger',
        logo: 'firstledger.png'
      },
      20221212: {
        name: 'XPMarket',
        url: 'xpmarket.com',
        wallets: ['walletconnect', 'xaman', 'ledger', 'metamask'],
        x: 'xpmarket',
        linkedin: 'company/xpmarket',
        logo: 'xpmarket.png'
      },
      69420589: {
        name: 'bidds',
        url: 'bidds.com',
        wallets: ['xaman', 'gemwallet', 'walletconnect'],
        x: 'biddsonxrpl',
        logo: 'bidds.png'
      },
      744925538: {
        name: 'Phi Wallet',
        url: 'phiwallet.com',
        x: 'PhiWallet',
        instagram: 'phi.wallet',
        linkedin: 'company/phiwallet',
        facebook: 'PhiWallet',
        logo: 'phiwallet.png'
      },
      110100111: {
        name: 'Sologenic',
        url: 'sologenic.com',
        wallets: ['ledger', 'dcent', 'xaman', 'crossmark'],
        x: 'realsologenic',
        discord: 'invite/UhUBwPKNdu',
        instagram: 'realsologenic',
        facebook: 'realsologenic',
        logo: 'sologenic.png'
      },
      11782013: {
        name: 'Anodos',
        url: 'anodos.finance',
        wallets: ['xaman', 'walletconnect'],
        x: 'AnodosFinance',
        discord: 'invite/CVUkhxCHvZ',
        linkedin: 'company/anodosfinance',
        logo: 'anodos.png'
      },
      42697468: {
        name: 'Bithomp',
        url: 'bithomp.com',
        wallets: ['xaman', 'ledger', 'crossmark', 'gemwallet', 'walletconnect', 'metamask'],
        x: 'bithomp',
        discord: 'invite/ZahGJ29WEs',
        instagram: 'bithomp',
        linkedin: 'company/bithomp',
        facebook: 'xrpexplorer',
        logo: 'bithomp.png'
      },
      89898989: {
        name: 'Axelar Bridge',
        url: 'axelar.foundation',
        wallets: ['metamask'],
        x: 'axelar',
        discord: 'invite/axelar',
        logo: 'axelar.png'
      },
      20102305: {
        name: 'OpulenceX',
        url: 'opulencex.io',
        wallets: ['xaman', 'crossmark', 'gemwallet', 'walletconnect'],
        x: '_OpulenceX',
        linkedin: 'company/opulencex-ltd',
        logo: 'opulencex.png'
      },
      13888813: {
        name: 'Zerpmon',
        url: 'zerpmon.world',
        wallets: ['xaman', 'joey', 'walletconnect'],
        x: 'zerpmon',
        linkedin: 'company/gen3labs',
        logo: 'zerpmon.png'
      },
      100010010: {
        name: 'Static Bit',
        url: 'staticbit.io',
        x: 'StaticBit_io',
        logo: 'staticbit.png'
      },
      19089388: {
        name: 'Hummingbot',
        url: 'hummingbot.org',
        x: '_hummingbot',
        discord: 'invite/hummingbot',
        linkedin: 'hummingbot-foundation',
        logo: 'hummingbot.png'
      },
      658879330: {
        name: 'Filedgr',
        url: 'filedgr.com',
        x: 'filedgr',
        discord: 'invite/MbxvxFszRw',
        linkedin: 'company/filedger',
        logo: 'filedgr.png'
      },
      510162502: {
        name: 'Sonar Muse',
        url: 'sonarmuse.org',
        wallets: ['xaman'],
        x: 'SonarMuse',
        instagram: 'sonar-muse',
        logo: 'sonarmuse.png'
      },
      60006000: {
        name: 'Moai Finance',
        url: 'moai-finance.xyz',
        wallets: ['metamask', 'walletconnect'],
        x: 'MoaiFinance',
        discord: 'invite/PSrF5z34dV',
        logo: 'moaifinance.png'
      },
      280957156: {
        name: 'Dhali',
        url: 'dhali.io',
        wallets: ['xaman', 'crossmark', 'gemwallet'],
        x: 'dhali_io',
        linkedin: 'company/dhali-io',
        logo: 'dhali.png'
      },
      38887387: {
        name: 'Futureverse',
        url: 'futureverse.com',
        x: 'futureverse',
        discord: 'invite/futureverse',
        instagram: 'futureverse',
        linkedin: 'company/futureverseofficial',
        logo: 'futureverse.png'
      },
      80008000: {
        name: 'Orchestra Finance',
        url: 'orchestra.finance',
        wallets: ['crossmark', 'xaman', 'gemwallet'],
        x: 'OrchestraFi',
        discord: 'invite/orchestrafinance',
        logo: 'orchestrafinance.png'
      },
      20220613: {
        name: 'DalliPay',
        url: 'www.dallipay.com',
        x: 'DalliPay',
        logo: 'dallipay.png'
      },
      30033003: {
        name: 'Calypso wallet',
        url: 'xcalypso.com',
        x: 'CalypsoWallet',
        logo: 'calypsowallet.png'
      },
      111: {
        name: 'Horizon',
        url: 'horizonxrpl.com',
        x: 'HorizonXRPL',
        logo: 'horizon.png'
      },
      10102021: {
        name: 'Junction'
      },
      1741383633: {
        name: 'Trust Wallet',
        url: 'trustwallet.com',
        x: 'trustwallet',
        discord: 'invite/trustwallet',
        instagram: 'trustwallet',
        linkedin: 'company/trustwallet',
        facebook: 'trustweb3',
        logo: 'trustwallet.png'
      },
      494456745: {
        name: 'Aigent',
        url: 'aigent.run',
        x: 'aigentdotrun',
        discord: 'invite/cE4s2MNhkR',
        logo: 'aigent.png'
      },
      524942424: {
        name: 'Ribble Trading Bot',
        url: 't.me/ribble_trading_bot',
        logo: 'ribbletradingbot.png'
      }
    }
    // Sort wallets in each entry
    Object.values(meta).forEach((entry) => {
      if (Array.isArray(entry.wallets)) {
        entry.wallets = [...entry.wallets].sort((a, b) => {
          const ia = order.indexOf(a)
          const ib = order.indexOf(b)
          if (ia === -1 && ib === -1) return a.localeCompare(b)
          if (ia === -1) return 1
          if (ib === -1) return -1
          return ia - ib
        })
      }
    })
    return meta
  })()
]
