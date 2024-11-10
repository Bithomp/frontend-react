import axios from 'axios'

let xamanWs

export const xamanProcessSignedData = async ({ uuid, afterSigning, onSignIn, afterSubmitExe }) => {
  const response = await axios('app/xaman/payload/' + uuid)
  const data = response.data
  if (data) {
    /*
      {
        "application": {
          "issued_user_token": "xxx"
        },
        "response": {
          "hex": "xxx",
          "txid": "xxx",
          "environment_nodeuri": "wss://testnet.xrpl-labs.com",
          "environment_nodetype": "TESTNET",
          "account": "xxx",
          "signer": "xxx"
        }
      }
      //data.payload.tx_type: "SignIn"
    */

    const signRequestData = data.custom_meta?.blob?.data
    const address = data.response?.account

    if (signRequestData?.signOnly) {
      afterSigning({ signRequestData, blob: data.response?.hex, address })
    } else {
      const redirectName = data.custom_meta?.blob?.redirect
      onSignIn({ address, wallet: 'xaman', redirectName })
      afterSubmitExe({
        redirectName,
        broker: data.custom_meta?.blob?.broker,
        txHash: data.response?.txid,
        txType: data.payload?.tx_type
      })
    }

    if (data.response?.account) {
      localStorage.setItem('xamanUserToken', data.application.issued_user_token)
    } else {
      console.log('xamanProcessSignedData error: xaman get payload: no account')
    }
  } else {
    console.log('app/xaman/payload/' + uuid + ' no data')
  }
}

export const xamanCancel = async (uuid) => {
  if (xamanWs) {
    xamanWs.close()
  }
  if (!uuid) return
  const payloadXaman = await axios.delete('app/xaman/payload/' + uuid).catch((error) => {
    console.log(error.message)
  })
  if (payloadXaman) {
    //console.log("xaman canceled", payloadXaman);
    //{cancelled: true, reason: "OK"}
  } else {
    console.log('xaman payload cancelation - no data returned')
  }
}

export const payloadXamanPost = async (payload, callback) => {
  const response = await axios.post('app/xaman/payload', payload).catch((error) => {
    console.log('payloadXamanPost error:', error.message)
    callback({ error: error.message })
  })
  if (response) {
    const { data } = response
    if (data?.refs) {
      callback(data)
    } else {
      if (data?.error?.message) {
        console.log('payloadXamanPost error:', data.error.message)
        callback({ error: data.error.message })
      } else {
        console.log('payloadXamanPost error: no data or no refs in data')
        callback({ error: 'no data or no refs in data' })
        console.log(data)
      }
    }
  }
}

export const xamanWsConnect = (wsUri, callback) => {
  if (xamanWs) {
    xamanWs.close()
    xamanWs = new WebSocket(wsUri)
  } else {
    xamanWs = new WebSocket(wsUri)
  }
  xamanWs.onopen = function () {
    //console.log("xamanWs connected");
  }
  xamanWs.onclose = function () {
    //console.log("xamanWs disconnected");
  }
  xamanWs.onmessage = function (evt) {
    const obj = JSON.parse(evt.data)
    if (obj.opened) {
      //nothing
    } else if (obj.signed) {
      xamanWs.close()
    } else if (obj.hasOwnProperty('expires_in_seconds')) {
      if (obj.expires_in_seconds <= 0) {
        xamanWs.close()
      }
    } else if (obj.expired) {
      xamanWs.close()
    } else if (obj.message) {
      if (!obj.message.includes('Welcome')) {
        console.log('xamanWs message:', obj.message)
      }
    } else {
      if (obj.signed === false) {
        xamanWs.close()
        callback({ status: 'canceled' })
        return
      } else {
        console.log('xamanWs response:', evt.data)
      }
    }
    callback(obj)
  }
  xamanWs.onerror = function (evt) {
    console.log('xamanWs error:', evt.data)
  }
}
