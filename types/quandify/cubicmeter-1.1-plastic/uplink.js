// Cubicmeter 1.1 uplink decoder

var appStates = {
  3: "ready",
  4: "pipeSelection",
  5: "metering",
};

var uplinkTypes = {
  0: "ping",
  1: "statusReport",
  6: "response",
};

var responseStatuses = {
  0: "ok",
  1: "commandError",
  2: "payloadError",
  3: "valueError",
};

// More uplink types only available when using Quandify platform API
var responseTypes = {
  0: "none",
  1: "statusReport",
  2: "hardwareReport",
  4: "settingsReport",
};

/* Smaller water leakages only availble when using Quandify platform API
as it requires cloud analytics */
var leakStates = {
  3: "medium",
  4: "large",
};

var pipeTypes = {
  0: "Custom",
  1: "Copper 15 mm",
  2: "Copper 18 mm",
  3: "Copper 22 mm",
  4: "Chrome 15 mm",
  5: "Chrome 18 mm",
  6: "Chrome 22 mm",
  7: "Pal 16 mm",
  8: "Pal 20 mm",
  9: "Pal 25 mm",
  14: "Pex 16 mm",
  15: "Pex 20 mm",
  16: "Pex 25 mm",
  17: "Distpipe",
};

/**
 * 4.1 Uplink Decode
 * The 'decodeUplink' function takes a message object and returns a parsed data object.
 * @param input Message object
 * @param input.fPort int,  The uplink message LoRaWAN fPort.
 * @param input.bytes int[], The uplink payload byte array, where each byte is represented by an integer between 0 and 255.
 */
function decodeUplink(input) {
  const buffer = new ArrayBuffer(input.bytes.length);
  const data = new DataView(buffer);
  for (const index in input.bytes) {
    data.setUint8(index, input.bytes[index]);
  }

  var decoded = {};
  var errors = [];
  var warnings = [];

  try {
    switch (input.fPort) {
      case 1: // Status report
        ({ decoded, warnings } = statusReportDecoder(data));
        break;
      case 6: // Response
        ({ decoded, warnings } = responseDecoder(data));
        break;
    }
  } catch (err) {
    // Something went terribly wrong
    errors.push(err.message);
  }

  return {
    data: {
      fPort: input.fPort,
      length: input.bytes.length,
      hexBytes: decArrayToStr(input.bytes),
      type: uplinkTypes[input.fPort],
      decoded,
    },
    errors,
    warnings,
  };
}

const LSB = true;

var statusReportDecoder = function (data) {
  if (data.byteLength != 28) {
    throw new Error(
      `Wrong payload length (${data.byteLength}), should be 28 bytes`
    );
  }

  let warnings = [];
  const error = data.getUint16(4, LSB);

  // The is sensing value is a bit flag of the error field
  const isSensing = !(error & 0x8000);
  const errorCode = error & 0x7fff;

  const decoded = {
    errorCode: errorCode, // current error code
    isSensing: isSensing, // is the ultrasonic sensor sensing water
    totalVolume: data.getUint32(6, LSB), // All-time aggregated water usage in liters
    leakState: data.getUint8(22), // current water leakage state
    batteryActive: decodeBatteryLevel(data.getUint8(23)), // battery mV active
    batteryRecovered: decodeBatteryLevel(data.getUint8(24)), // battery mV recovered
    waterTemperatureMin: decodeTemperature(data.getUint8(25)), // min water temperature since last statusReport
    waterTemperatureMax: decodeTemperature(data.getUint8(26)), // max water temperature since last statusReport
    ambientTemperature: decodeTemperature(data.getUint8(27)), // current ambient temperature
  };

  // Warnings
  if (decoded.isSensing === false) {
    warnings.push("Not sensing water");
  }

  if (decoded.errorCode) {
    warnings.push(parseErrorCode(decoded.errorCode));
  }

  if (isLowBattery(decoded.batteryRecovered)) {
    warnings.push("Low battery");
  }

  return {
    decoded,
    warnings,
  };
};

var responseDecoder = function (data) {
  const status = responseStatuses[data.getUint8(1)];
  if (status === undefined) {
    throw new Error(`Invalid response status: ${data.getUint8(1)}`);
  }

  const type = responseTypes[data.getUint8(2)];
  if (type === undefined) {
    throw new Error(`Invalid response type: ${data.getUint8(2)}`);
  }

  const payload = new DataView(data.buffer, 3);

  var response = {
    decoded: {},
    warnings: [],
  };

  switch (type) {
    case "statusReport":
      response = statusReportDecoder(payload);
      break;
    case "hardwareReport":
      response = hardwareReportDecoder(payload);
      break;
    case "settingsReport":
      response = settingsReportDecoder(payload);
      break;
  }

  return {
    decoded: {
      fPort: data.getUint8(0),
      status: status,
      type: type,
      data: response.decoded,
    },
    warnings: response.warnings,
  };
};

var hardwareReportDecoder = function (data) {
  if (data.byteLength != 35) {
    throw new Error(
      `Wrong payload length (${data.byteLength}), should be 35 bytes`
    );
  }

  const appState = appStates[data.getUint8(5)];
  if (appState === undefined) {
    throw new Error(`Invalid app state (${data.getUint8(5)})`);
  }

  const pipeType = pipeTypes[data.getUint8(28)];
  if (pipeType === undefined) {
    throw new Error(`Invalid pipe index (${data.getUint8(28)})`);
  }

  const firmwareVersion = intToSemver(data.getUint32(0, LSB));

  return {
    decoded: {
      firmwareVersion,
      hardwareVersion: data.getUint8(4),
      appState: appState,
      pipe: {
        id: data.getUint8(28),
        type: pipeType,
      },
    },
    warnings: [],
  };
};

var settingsReportDecoder = function (data) {
  if (data.byteLength != 38) {
    throw new Error(
      `Wrong payload length (${data.byteLength}), should be 38 bytes`
    );
  }

  return {
    decoded: {
      lorawanReportInterval: data.getUint32(5, LSB),
    },
    warnings: [],
  };
};

var decodeBatteryLevel = function (input) {
  return 1800 + (input << 3); // convert to milliVolt
};

var decodeTemperature = function (input) {
  return parseFloat(input) * 0.5 - 20.0; // to °C
};

var isLowBattery = function (batteryRecovered) {
  return batteryRecovered <= 3100;
};

var parseErrorCode = function (errorCode) {
  switch (errorCode) {
    case 384:
      return "Reverse flow";
    default:
      return `Contact Quandify support, error ${errorCode}`;
  }
};

// Convert a hex string to decimal array
var hexToDecArray = function (hexString) {
  const size = 2;
  const length = Math.ceil(hexString.length / size);
  const decimalList = new Array(length);

  for (let i = 0, o = 0; i < length; ++i, o += size) {
    decimalList[i] = parseInt(hexString.substr(o, size), 16);
  }

  return decimalList;
};

var base64ToDecArray = function (base64String) {
  const buffer = Buffer.from(base64String, "base64");
  const bufString = buffer.toString("hex");

  return hexToDecArray(bufString);
};

var decArrayToStr = function (byteArray) {
  return Array.from(byteArray, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2).toUpperCase();
  }).join("");
};

var intToSemver = function (version) {
  const major = (version >> 24) & 0xff;
  const minor = (version >> 16) & 0xff;
  const patch = version & 0xffff;
  return `${major}.${minor}.${patch}`;
};

// Wrapping functions around the LoRaWAN decoder API standard

var normalizeUplink = function (input) {
  switch (input.data.type) {
    case "statusReport":
      return normalizeStatusReport(input.data.decoded);
    case "response":
      return normalizeResponse(input.data.decoded);
  }

  return [];
}

var normalizeResponse = function (decoded) {
  var response = [
    {
      topic: "response",
      data: {
        fPort: decoded.fPort,
        status: camelToSnakeCase(decoded.status),
        type: camelToSnakeCase(decoded.type),
      }
    }
  ];

  switch (decoded.type) {
    case "statusReport":
      response = response.concat(normalizeStatusReport(decoded.data));
      break;
    case "hardwareReport":
      response = response.concat(normalizeHardwareReport(decoded.data));
      break;
    case "settingsReport":
      response = response.concat(normalizeSettingsReport(decoded.data));
      break;
  }

  return response;
}

var normalizeHardwareReport = function (data) {
  return [
    {
      topic: "system",
      data: {
        firmwareVersion: data.firmwareVersion,
        hardwareVersion: data.hardwareVersion,
        appState: camelToSnakeCase(data.appState),
        pipeId: data.pipe.id,
        pipeType: data.pipe.type,
      }
    }
  ];
};

var normalizeSettingsReport = function (data) {
  return [
    {
      topic: "settings",
      data: {
        lorawanReportInterval: data.lorawanReportInterval,
      }
    }
  ];
};

var normalizeStatusReport = function (decoded) {
  return [
    {
      topic: "default",
      data: {
        totalVolume: decoded.totalVolume,
        leakIsOngoing: decoded.leakState > 2,
        leakState: decoded.leakState,
        leakStatus: camelToSnakeCase(leakStates[decoded.leakState] ?? "noLeak"),
        waterTemperatureMin: decoded.waterTemperatureMin,
        waterTemperatureMax: decoded.waterTemperatureMax,
        ambientTemperature: decoded.ambientTemperature,
      }
    },
    {
      topic: "lifecycle",
      data: {
        isSensing: decoded.isSensing,
        batteryVoltage: decoded.batteryRecovered / 1000,
        batteryStatus: isLowBattery(decoded.batteryRecovered) ? "LOW" : "OK",
      }
    },
  ];
};

function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).toUpperCase();
}

function hexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
}

function consume(event) {
  const input = {
    fPort: event.data.port,
    bytes: hexToBytes(event.data.payloadHex)
  }

  const decoded = decodeUplink(input);
  const topics = normalizeUplink(decoded);

  decoded.warnings.forEach(warning => {
    topics.push({
      topic: "error",
      data: {
        level: "warning",
        message: warning
      }
    });
  });

  decoded.errors.forEach(error => {
    topics.push({
      topic: "error",
      data: {
        level: "error",
        message: error
      }
    });
  });

  topics.forEach(topic => {
    emit("sample", { ...topic });
  });
}