function consume(event) {
  const payload = event.data.payloadHex;
  const bytes = Hex.hexToBytes(payload);

  const mode = (bytes[6] & 0x7c) >> 2;

  let topic = "default";
  const data = {};
  const lifecycle = {};

  if (mode !== 2) {
    lifecycle.batteryVoltage = ((bytes[0] << 8) | bytes[1]) / 1000;
    let batteryLevel =
      Math.round((lifecycle.batteryVoltage - 2.45) / 0.0115 / 10) * 10;

    if (batteryLevel > 100) {
      batteryLevel = 100;
    } else if (batteryLevel < 0) {
      batteryLevel = 0;
    }
    lifecycle.batteryLevel = batteryLevel;

    data.temperature = parseFloat(
      ((((bytes[2] << 24) >> 16) | bytes[3]) / 10).toFixed(2),
    );

    data.c0adc = ((bytes[4] << 8) | bytes[5]) / 1000;

    data.digitalStatus = bytes[6] & 0x02 ? "HIGH" : "LOW";

    if (mode !== 6) {
      data.extTrigger = !!(bytes[6] & 0x01);
      data.open = !!(bytes[6] & 0x80);
    }
  }

  if (mode === 0) {
    topic = "iic";

    if (((bytes[9] << 8) | bytes[10]) === 0) {
      data.light = ((bytes[7] << 24) >> 16) | bytes[8];
    } else {
      data.extTemperature = parseFloat(
        ((((bytes[7] << 24) >> 16) | bytes[8]) / 10).toFixed(2),
      );

      data.extHumidity = parseFloat(
        (((bytes[9] << 8) | bytes[10]) / 10).toFixed(1),
      );
    }
  } else if (mode === 1) {
    topic = "distance";

    data.distance = parseFloat((((bytes[7] << 8) | bytes[8]) / 10).toFixed(1));

    if (((bytes[9] << 8) | bytes[10]) !== 65535) {
      data.distanceSignalStrength = parseFloat(
        ((bytes[9] << 8) | bytes[10]).toFixed(0),
      );
    }
  } else if (mode === 2) {
    topic = "adc";

    lifecycle.batteryVoltage = bytes[11] / 10;
    let batteryLevel =
      Math.round((lifecycle.batteryVoltage - 2.45) / 0.0115 / 10) * 10;

    if (batteryLevel > 100) {
      batteryLevel = 100;
    } else if (batteryLevel < 0) {
      batteryLevel = 0;
    }
    lifecycle.batteryLevel = batteryLevel;

    data.c0adc = ((bytes[0] << 8) | bytes[1]) / 1000;

    data.c1adc = ((bytes[2] << 8) | bytes[3]) / 1000;

    data.c4adc = ((bytes[4] << 8) | bytes[5]) / 1000;

    data.digitalStatus = bytes[6] & 0x02 ? "HIGH" : "LOW";

    data.extTrigger = bytes[6] & 0x01 ? "TRUE" : "FALSE";

    data.open = !!(bytes[6] & 0x80);

    if (((bytes[9] << 8) | bytes[10]) === 0) {
      data.light = ((bytes[7] << 24) >> 16) | bytes[8];
    } else {
      data.temperature = parseFloat(
        ((((bytes[7] << 24) >> 16) | bytes[8]) / 10).toFixed(2),
      );

      data.humidity = parseFloat(
        (((bytes[9] << 8) | bytes[10]) / 10).toFixed(1),
      );
    }
  } else if (mode === 3) {
    topic = "ds";

    data.c2temperature = parseFloat(
      ((((bytes[7] << 24) >> 16) | bytes[8]) / 10).toFixed(2),
    );

    data.c3temperature = parseFloat(
      ((((bytes[9] << 24) >> 16) | bytes[10]) / 10).toFixed(1),
    );
  } else if (mode === 4) {
    topic = "weight";

    data.weight = ((bytes[7] << 24) >> 16) | bytes[8];
  } else if (mode === 5) {
    topic = "count";

    data.count =
      (bytes[7] << 24) | (bytes[8] << 16) | (bytes[9] << 8) | bytes[10];
  }

  if (Object.keys(data).length > 0) {
    emit("sample", { data, topic });
  }

  if (Object.keys(lifecycle).length > 0) {
    emit("sample", { data: lifecycle, topic: "lifecycle" });
  }
}