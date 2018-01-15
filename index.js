'use strict';

const Denon = require("denon-client");
const EventEmitter = require('events').EventEmitter;
const util = require('util');

let Accessory, PlatformAccessory, Characteristic, Service, UUIDGen;

module.exports = function (homebridge) {

    Accessory = homebridge.hap.Accessory;
    Characteristic = homebridge.hap.Characteristic;
    Service = homebridge.hap.Service;
    UUIDGen = homebridge.hap.uuid;

    Characteristic.InputMode = function() {

        Characteristic.call(this, 'Input', 'cf5168ed-4565-4130-b41a-7ba49c64f330');
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    util.inherits(Characteristic.InputMode, Characteristic);
    Characteristic.InputMode.UUID = 'cf5168ed-4565-4130-b41a-7ba49c64f330';

    Characteristic.TargetInputMode = function() {

        Characteristic.call(this, 'Target Input', 'b7616767-935b-4c0a-baa6-70d58483b7f1');
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    util.inherits(Characteristic.TargetInputMode, Characteristic);
    Characteristic.TargetInputMode.UUID = 'b7616767-935b-4c0a-baa6-70d58483b7f1';

    homebridge.registerAccessory('homebridge-denon', 'DenonReceiver', DenonReceiver, true);
};

function DenonReceiver(log, config, api) {

    this.log = log;
    this.ip = config['ip'];
    this.name = config['name'];
    this.denonClient = new Denon.DenonClient(this.ip);

    this.log("Creating receiver '" + this.name + "' at " + this.ip + "...");

    // Power
    this.powerService = new Service.Switch(this.name);

    // Accessory Information
    this.accessoryInformationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'Denon')
        .setCharacteristic(Characteristic.Model, 'Receiver')
        .setCharacteristic(Characteristic.SerialNumber, '-');

    // Speaker
    this.speakerService = new Service.Speaker(this.name);
    this.speakerService.addCharacteristic(Characteristic.Volume);
    this.speakerService.addCharacteristic(Characteristic.InputMode);
    this.speakerService.addCharacteristic(Characteristic.TargetInputMode);

    // Connect
    this.denonClient.connect().then(function() {

        // Log
        this.log("Connected to receiver at " + this.ip);




        ///////////////////
        // Bind Events

        this.denonClient.on("muteChanged", function(mute) {

            mute = (mute == "ON");
            //this.log("Mute changed - " + (mute ? "Muted" : "Unmuted"));
            this.speakerService.getCharacteristic(Characteristic.Mute).updateValue(mute, null, "remote");

        }.bind(this));

        this.denonClient.on("masterVolumeChanged", function(volume) {

            //this.log("Volume changed - " + volume);
            var returnVolume = (parseFloat(volume) / 98) * 100;
            this.speakerService.getCharacteristic(Characteristic.Volume).updateValue(returnVolume, null, "remote");

        }.bind(this));

        this.denonClient.on("powerChanged", function(power) {

            power = (power == "ON");
            //this.log("Power changed - " + (power ? "On" : "Off"));
            this.powerService.getCharacteristic(Characteristic.On).updateValue(power, null, "remote");

        }.bind(this));

        this.denonClient.on("inputChanged", function(input) {

            //this.log("Input changed - " + input);
            this.speakerService.getCharacteristic(Characteristic.InputMode).updateValue(input, null, "remote");
            this.speakerService.getCharacteristic(Characteristic.TargetInputMode).updateValue(input, null, "remote");

        }.bind(this));



        ///////////////////
        // Bind Actions

        // Power
        this.powerService.getCharacteristic(Characteristic.On)
            .on("get", function(callback) {

                //this.log("Get Power");
                this.denonClient.getPower().then(function(powerState) {
                    callback(null, (powerState == Denon.Options.PowerOptions.On));
                });


            }.bind(this))
            .on("set", function(powerOn, callback) {

                //this.log("Set Power");
                this.denonClient.setPower((powerOn ? Denon.Options.PowerOptions.On: Denon.Options.PowerOptions.Off)).then(function() {
                    callback(null, false);
                });


            }.bind(this));

        // Mute
        this.speakerService.getCharacteristic(Characteristic.Mute)
            .on("get", function(callback) {

                //this.log("Get Mute");
                this.denonClient.getMute().then(function(mute) {
                    callback(null, (mute == Denon.Options.MuteOptions.On));
                });


            }.bind(this))
            .on("set", function(mute, callback) {

                //this.log("Set Mute");
                this.denonClient.setMute((mute ? Denon.Options.MuteOptions.On: Denon.Options.MuteOptions.Off)).then(function() {
                    callback(null, false);
                });


            }.bind(this));


        // Target Input
        this.speakerService.getCharacteristic(Characteristic.TargetInputMode)

            .on("set", function(desiredInput, callback) {

                //this.log("Set Target Input - " + desiredInput);

                var validValue = false;
                for (var key in Denon.Options.InputOptions) {
                    if (Denon.Options.InputOptions[key] === desiredInput) {
                        validValue = true;
                    }
                }

                if (validValue) {
                    this.denonClient.setInput(desiredInput).then(function() {
                        callback(null, false);
                    });
                }
                else {
                    this.log.warn("Invalid input '" + desiredInput + "'");
                    callback("Invalid Value", false);
                }


            }.bind(this));

        // Input
        this.speakerService.getCharacteristic(Characteristic.InputMode)
            .on("get", function(callback) {

                //this.log("Get Input");
                this.denonClient.getInput().then(function(input) {
                    callback(null, input);
                });


            }.bind(this))

        // Volume
        this.speakerService.getCharacteristic(Characteristic.Volume)
            .on("get", function(callback) {

                //this.log("Get Volume");
                this.denonClient.getVolume().then(function(volume) {
                    var returnVolume = (parseFloat(volume) / 98) * 100;
                    //this.log("...got raw of " + volume + ", returning " + returnVolume);
                    callback(null, returnVolume);
                });


            }.bind(this))
            .on("set", function(volume, callback) {

                //this.log("Set Volume");
                var setVolume = (parseFloat(volume)/100) * 98;
                setVolume = Math.round(setVolume*2)/2;
                //this.log("...got raw of " + volume + ", setting " + setVolume);
                this.denonClient.setVolume(setVolume).then(function() {

                    callback(null, false);
                });


            }.bind(this));


        ///////////////////
        // Initial State

        // Power
        this.denonClient.getPower();

        // Mute
        this.denonClient.getMute();

        // Volume
        this.denonClient.getVolume();

        // Input
        this.denonClient.getInput();


    }.bind(this));



}


DenonReceiver.prototype.getServices = function() {
    return [
        this.powerService,
        this.speakerService,
        this.accessoryInformationService
    ]
};