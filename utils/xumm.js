import axios from 'axios';

let xummWs;

export const xummGetSignedData = async (uuid, callback) => {
  const response = await axios("app/xumm/payload/" + uuid);
  const data = response.data;
  if (data) {
    callback(data);
    if (data.response && data.response.account) {
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
      */
      localStorage.setItem("xummUserToken", data.application.issued_user_token);
    } else {
      console.log("xummGetSignedData error: xumm get payload: no account");
    }
  } else {
    console.log("app/xumm/payload/" + uuid + " no data");
  }
}

export const xummCancel = async (uuid) => {
  if (xummWs) {
    xummWs.close();
  }
  if (!uuid) return;
  const payloadXumm = await axios.delete('app/xumm/payload/' + uuid).catch(error => {
    console.log(error.message);
  });
  if (payloadXumm) {
    //console.log("xumm canceled", payloadXumm);
    //{cancelled: true, reason: "OK"}
  } else {
    console.log("xumm payload cancelation - no data returned")
  }
}

export const payloadXummPost = async (payload, callback) => {
  const response = await axios.post('app/xumm/payload', payload).catch(error => {
    console.log("payloadXummPost error:", error.message);
    callback({ error: error.message });
  });
  if (response) {
    const { data } = response;
    if (data?.refs) {
      callback(data);
    } else {
      if (data?.error?.message) {
        console.log("payloadXummPost error:", data.error.message);
        callback({ error: data.error.message });
      } else {
        console.log("payloadXummPost error: no data or no refs in data");
        callback({ error: "no data or no refs in data" });
        console.log(data);
      }
    }
  }
}

export const xummWsConnect = (wsUri, callback) => {
  if (xummWs) {
    xummWs.close();
    xummWs = new WebSocket(wsUri);
  } else {
    xummWs = new WebSocket(wsUri);
  }
  xummWs.onopen = function () {
    //console.log("xummWs connected");
  };
  xummWs.onclose = function () {
    //console.log("xummWs disconnected");
  };
  xummWs.onmessage = function (evt) {
    const obj = JSON.parse(evt.data);
    if (obj.opened) {
      //nothing
    } else if (obj.signed) {
      xummWs.close();
    } else if (obj.hasOwnProperty('expires_in_seconds')) {
      if (obj.expires_in_seconds <= 0) {
        xummWs.close();
      }
    } else if (obj.expired) {
      xummWs.close();
    } else if (obj.message) {
      if (!obj.message.includes("Welcome")) {
        console.log("xummWs message:", obj.message);
      }
    } else {
      console.log("xummWs response:", evt.data);
    }
    callback(obj);
  };
  xummWs.onerror = function (evt) {
    console.log("xummWs error:", evt.data);
  };
}