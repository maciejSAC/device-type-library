// Parse Hex Byte Array
function parseHexString(str) {
  const result = [];
  while (str.length >= 2) {
    result.push(parseInt(str.substring(0, 2), 16));
    str = str.substring(2, str.length);
  }
  return result;
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function consume(event) {
  const payload = event.data.payloadHex;
  const bytes = parseHexString(payload);

  const data = {};
  const lifecycle = {};

  for (let i = 0; i < bytes.length; ) {
    const channelId = bytes[i++];
    const channelType = bytes[i++];
    // BATTERY
    if (channelId === 0x01 && channelType === 0x75) {
      lifecycle.batteryLevel = bytes[i];
      i += 1;
    }
    // PRESS STATE
    else if (channelId === 0xff && channelType === 0x2e) {
      switch (bytes[i]) {
        case 1:
          data.press = "SHORT";
          break;
        case 2:
          data.press = "LONG";
          break;
        case 3:
          data.press = "DOUBLE";
          break;
        default:
          data.press = "NOT_VALID";
      }
      i += 1;
    } else {
      break;
    }
  }

  if (!isEmpty(lifecycle)) {
    emit("sample", { data: lifecycle, topic: "lifecycle" });
  }

  if (!isEmpty(data)) {
    emit("sample", { data, topic: "button_pressed" });
  }
}
