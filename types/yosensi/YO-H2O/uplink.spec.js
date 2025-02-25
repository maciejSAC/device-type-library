const chai = require("chai");

const rewire = require("rewire");
const utils = require("test-utils");

const { assert } = chai;

describe("Yosensi YO H2O uplink", () => {
  let batteryVoltageSchema = null;
  let consume = null;
  before((done) => {
    const script = rewire("./uplink.js");
    consume = utils.init(script);
    utils
      .loadSchema(`${__dirname}/batteryVoltage.schema.json`)
      .then((parsedSchema) => {
        batteryVoltageSchema = parsedSchema;
        done();
      });
  });

  let internalTemperatureSchema = null;
  before((done) => {
    utils
      .loadSchema(`${__dirname}/internalTemperature.schema.json`)
      .then((parsedSchema) => {
        internalTemperatureSchema = parsedSchema;
        done();
      });
  });

  let humiditySchema = null;
  before((done) => {
    utils
      .loadSchema(`${__dirname}/humidity.schema.json`)
      .then((parsedSchema) => {
        humiditySchema = parsedSchema;
        done();
      });
  });

  let accelerometerSchema = null;
  before((done) => {
    utils
      .loadSchema(`${__dirname}/accelerometer.schema.json`)
      .then((parsedSchema) => {
        accelerometerSchema = parsedSchema;
        done();
      });
  });

  let floodStateSchema = null;
  before((done) => {
    utils
      .loadSchema(`${__dirname}/floodState.schema.json`)
      .then((parsedSchema) => {
        floodStateSchema = parsedSchema;
        done();
      });
  });

  describe("consume()", () => {
    it("should decode the Yosensi YO H2O payload", () => {
      const data = {
        data: {
          port: 0,
          payloadHex:
            "0226000004000000410005ffc50030006f0800010d480d000100e21000001f",
        },
      };

      utils.expectEmits((type, value) => {
        assert.equal(type, "sample");
        assert.isNotNull(value);
        assert.typeOf(value.data, "object");

        assert.equal(value.topic, "batteryVoltage");
        assert.equal(value.data.batteryVoltage, 3400);

        utils.validateSchema(value.data, batteryVoltageSchema, {
          throwError: true,
        });
      });

      utils.expectEmits((type, value) => {
        assert.equal(type, "sample");
        assert.isNotNull(value);
        assert.typeOf(value.data, "object");

        assert.equal(value.topic, "internalTemperature");
        assert.equal(value.data.internalTemperature, 22.6);

        utils.validateSchema(value.data, internalTemperatureSchema, {
          throwError: true,
        });
      });

      utils.expectEmits((type, value) => {
        assert.equal(type, "sample");
        assert.isNotNull(value);
        assert.typeOf(value.data, "object");

        assert.equal(value.topic, "humidity");
        assert.equal(value.data.humidity, 31);

        utils.validateSchema(value.data, humiditySchema, { throwError: true });
      });

      utils.expectEmits((type, value) => {
        assert.equal(type, "sample");
        assert.isNotNull(value);
        assert.typeOf(value.data, "object");

        assert.equal(value.topic, "floodState");
        assert.equal(value.data.floodState, 0);

        utils.validateSchema(value.data, floodStateSchema, {
          throwError: true,
        });
      });

      utils.expectEmits((type, value) => {
        assert.equal(type, "sample");
        assert.isNotNull(value);
        assert.typeOf(value.data, "object");

        assert.equal(value.topic, "accelerometer");
        assert.equal(value.data.accelerometer_x, -5.9);
        assert.equal(value.data.accelerometer_y, 4.8);
        assert.equal(value.data.accelerometer_z, 11.1);

        utils.validateSchema(value.data, accelerometerSchema, {
          throwError: true,
        });
      });

      consume(data);
    });
  });
});
