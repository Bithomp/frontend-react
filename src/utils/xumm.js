import axios from 'axios';

let xummWs;

export const xummSignedData = async (uuid, callback) => {
  const response = await axios("app/xumm/payload/" + uuid);
  const data = response.data;
  if (data) {
    if (data.response && data.response.account) {
      callback(data);
    } else {
      console.log("xummSignedData error: xumm get payload: no account");
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
  });
  if (response) {
    const { data } = response;
    if (data?.refs) {
      callback(data);
    } else {
      if (data?.error?.message) {
        console.log("payloadXummPost error:", data.error.message);
      } else {
        console.log("payloadXummPost error: no data or no refs in data");
      }
    }
  } else {
    console.log("payloadXummPost error: no response");
  }
}

export const xummWsConnect = (wsUri, callback) => {
  xummWs = new WebSocket(wsUri);
  xummWs.onopen = function () {
    console.log("xummWs connected");
  };
  xummWs.onclose = function () {
    console.log("xummWs disconnected");
  };
  xummWs.onmessage = function (evt) {
    const obj = JSON.parse(evt.data);
    if (obj.opened) {
      //nothing
    } else if (obj.signed) {
      xummWs.close();
    } else if (obj.expires_in_seconds) {
      if (obj.expires_in_seconds <= 0) {
        xummWs.close();
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