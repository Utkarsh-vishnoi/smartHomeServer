var fs = require('fs');
var https = require('https');
var app = require('express')();
var port = (process.env.PORT || 443);

var options = {
    key: fs.readFileSync('./certs/privkey.pem'),
    cert: fs.readFileSync('./certs/fullchain.pem')
};
var server = https.createServer(options, app);
var io = require('socket.io')(server);

var identifier = "#5521SHCBUV";
var pi_ID, user_ID;
var pi_client;
var temperature, humidity, lights = {1: false, 2: false, 3: false};
var packet = {};


var pi_namespace = io.of("/smart-pi");
var user_namespace = io.of("/smart-user");

var disconnect = function(id) {
    if (id === pi_ID) {
        pi_ID = null;
        console.log("----------------------------------------");
        console.log("Smart PI disconnected.");
        console.log("ID - " + id);
        console.log("----------------------------------------");
    }
    else {
        user_ID = null;
        console.log("----------------------------------------");
        console.log("Smart User disconnected.");
        console.log("ID - " + id);
        console.log("----------------------------------------");
    }
};
var timeOut = function(client) {
    setTimeout(function() {
        if (!client.auth) {
            console.log("Disconnecting socket ", client.id);
            client.disconnect('unauthorized');
        }
    }, 1000);
};

pi_namespace.on("connection", function (client) {
    client.auth = false;
    pi_client = client;

    client.on("authenticate", function (data) {
        var authData = JSON.parse(data);
        if(identifier === authData.identifier) {
            client.auth = true;
            authenticated();
        }
    });

    timeOut(client);

    client.on("disconnect", function() {
        disconnect(client.id)
    });

    var authenticated = function() {
        pi_ID = client.id;
        console.log("----------------------------------------");
        console.log("Smart PI connected.");
        console.log("Authentication ID - " + client.id);
        console.log("----------------------------------------");

        client.on('dht', function(data){
            var pData = JSON.parse(data);
            temperature = pData.temperature;
            humidity = pData.humidity;
            // console.log(data);
        });

        client.on('lights', function (data) {
            lights = JSON.parse(data);
            console.log(lights);
        });

        client.emit("authenticated");
    };
});

user_namespace.on("connection", function (client) {
    client.auth = false;

    client.on("authenticate", function (data) {
        var authData = JSON.parse(data);
        if(identifier === authData.identifier) {
            client.auth = true;
            authenticated();
        }
    });

    timeOut(client);

    client.on("disconnect", function() {
        disconnect(client.id)
    });

    var authenticated = function () {
        user_ID = client.id;
        console.log("---------------------------------------");
        console.log("Smart User connected.");
        console.log("Authentication ID - " + client.id);
        console.log("---------------------------------------");

        client.on("requestStatus", function () {
            packet.temperature = temperature;
            packet.humidity = humidity;
            packet.lights = lights;
            client.emit("statusResponse", packet);
        });

        client.on("switch", function (light, state) {
            var boolState;
            if(state) {
                boolState = 1;
            }
            else {
                boolState = 0;
            }

            pi_client.emit('toggle', light, boolState);
        });

        if(pi_ID != null) {
            client.emit("authenticated");
        }
        else {
            client.emit("No PI");
        }
    };
});

server.listen(port, function() {
    console.log('server up and running at %s port', port);
});