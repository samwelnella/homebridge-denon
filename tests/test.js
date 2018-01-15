const Denon = require("denon-client");

const denonClient = new Denon.DenonClient("172.16.1.173");

// Setup Event Listeners
denonClient.on('masterVolumeChanged', function(volume) {
    // This event will fire every time when the volume changes.
    // Including non requested volume changes (Using a remote, using the volume wheel on the device).

    console.log("Volume changed to: " + volume);
});

denonClient.on("muteChanged", function(mute) {

   console.log("Mute changed - " + mute);

});

denonClient.on("powerChanged", function(power) {

    console.log("Power changed - " + power);

});

denonClient.on("inputChanged", function(input) {

    console.log("Input changed - " + input);

});

// Connect
denonClient.connect().then(function() {

    console.log("Connected!");

});