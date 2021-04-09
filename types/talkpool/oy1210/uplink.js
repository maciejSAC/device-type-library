function consume(event) {
  var payload = event.data.payload_hex;
  var port = event.data.port;
  var bits = Bits.hexToBits(payload);
  var data = {};
  var topic = "default";

  if (port == 1) {
    if (payload == "012000") {
      data.message = "Standart startup";
    } else {
      data.message = "Something went wrong while startup";
    }
    topic = "startup";
  } else if (port == 2) {
    // Taking the temperature from different positions in the payload and converting it through the defined offsets (same for humidity)
    data.temperature = Math.round((Bits.bitsToUnsigned(bits.substr(0, 8) + bits.substr(16, 4)) / 10 - 80) * 10) / 10;
    data.humidity = Math.round((Bits.bitsToUnsigned(bits.substr(8, 8) + bits.substr(20, 4)) / 10 - 25) * 10) / 10;
    data.co2 = Bits.bitsToUnsigned(bits.substr(24, 16));
  }
  emit('sample', { data: data, topic: topic });
}