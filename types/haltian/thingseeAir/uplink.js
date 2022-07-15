function consume(event) {
  const { data } = event;
  const header = data.tsmId;
  const type = data.tsmEv;

  const lifecycle = {};
  let sample = {};

  let topic = "default";

  if (type === 9) {
    lifecycle.reason = "CHANGE";
  } else if (type === 10) {
    lifecycle.reason = "TIME";
  } else if (type === 11) {
    lifecycle.reason = "STARTUP";
  } else if (type === 29) {
    lifecycle.reason = "ERROR";
  } else if (type === 33) {
    lifecycle.reason = "FIRMWARE_RESPONSE";
  }

  switch (header) {
    // System message
    case 1100: {
      topic = "system_info";
      sample.swVersion = data.swVersion;
      sample.modelCode = data.modelCode;
      sample.psn = data.psn;

      break;
    }
    case 1102: {
      topic = "firmware_response";
      sample.requestTsmId = data.requestTsmId;

      break;
    }
    case 1110: {
      topic = "battery_level";
      sample.batteryLevel = data.batl;

      let { chrg } = data.chrg;
      if (chrg === undefined) {
        chrg = null;
      }
      sample.batteryCharge = chrg;

      break;
    }
    case 1111: {
      topic = "orientation";
      sample.accX = data.accx;
      sample.accY = data.accy;
      sample.accZ = data.accz;

      break;
    }
    case 1202: {
      topic = "network";
      sample.rssi = data.rssi;

      let { rssiDbm } = data;
      let { neighNodeInfo } = data;
      let { neighRadioPower } = data;
      let { neighRadioPowerDbm } = data;

      if (rssiDbm === undefined) {
        rssiDbm = null;
      }

      if (neighNodeInfo === undefined) {
        neighNodeInfo = null;
      }

      if (neighRadioPower === undefined) {
        neighRadioPower = null;
      }

      if (neighRadioPowerDbm === undefined) {
        neighRadioPowerDbm = null;
      }

      sample.rssiDbm = rssiDbm;
      sample.neighNodeInfo = neighNodeInfo;
      sample.neighRadioPower = neighRadioPower;
      sample.neighRadioPowerDbm = neighRadioPowerDbm;

      break;
    }
    case 1312: {
      topic = "firmware_binary";
      sample.binaryType = data.binaryType;
      sample.binaryVersion = data.binaryVersion;

      break;
    }
    case 1403: {
      topic = "error_event";
      sample.errorType = data.errorType;
      sample.errorCause = data.errorCause;

      break;
    }
    // Sensordata
    case 12100: {
      topic = "weather";
      let pressure = data.airp;
      let humidity = data.humd;
      let temperature = data.temp;
      let light = data.lght;

      if (pressure === undefined) {
        pressure = null;
      }

      if (humidity === undefined) {
        humidity = null;
      }

      if (temperature === undefined) {
        temperature = null;
      }

      if (light === undefined) {
        light = null;
      }

      sample.pressure = pressure;
      sample.humidity = humidity;
      sample.temperature = temperature;
      sample.light = light;

      break;
    }
    case 24100: {
      topic = "co2";
      sample.co2 = data.carbonDioxide;
      const { status } = data;
      switch (status) {
        case -1:
          sample.co2Status = "MEASUREMENT_FAILED";
          break;
        case 0:
          sample.co2Status = "OK";
          break;
        case 1:
          sample.co2Status = "AUTO_CALIBRATED";
          break;
        case 2:
          sample.co2Status = "AUTO_CALIBRATEN_FAILED";
          break;
        default:
          break;
      }
      break;
    }
    case 24101: {
      topic = "tvoc";
      sample.tvoc = data.tvoc;
      break;
    }
    default:
      topic = "unknown";
      sample = data;
      break;
  }
  emit("sample", { data: sample, topic });
  emit("sample", { data: lifecycle, topic: "lifecycle" });
}