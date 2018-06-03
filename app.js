var port = (process.env.PORT || 8090);
var io = require('socket.io').listen(port);
var requests = require('axios');
var moment = require('moment');
var ip = require('ip');

console.log("Socket server started!");
console.log(ip.address() + ":" + port);

var identifier = "#5521SHCBUV";
var pi_ID, user_ID;
var pi_client, user_client = null;
var packet = {};
packet.lights = {1: false, 2: false, 3: false};

var config = {	headers: {'Content-Type': 'application/json','Cache-Control' : 'no-cache'}};

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

        client.on('lights', function (data) {
            packet.lights = JSON.parse(data);
            if(user_client != null)
                user_client.emit('switch_backflip', packet.lights);
        });

        client.on("dhtResponse", function (data) {
            var tSLASHh = data.split("|");
            requests.get('http://139.59.83.220/update', {
                params: {
                    api_key: "WKHLKHVJPX8ZC6QM",
                    field1: tSLASHh[0],
                    field2: tSLASHh[1]
                }
            }, config);
        });

        client.emit("authenticated");
        dht();
        setInterval(dht, 60000);

        function dht() {
            client.emit("dhtRequest");
        }
    };
});

user_namespace.on("connection", function (client) {
    client.auth = false;
    user_client = client;

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
            requests.get('http://139.59.83.220/channels/1/feed.json', {
                params:{
                    key : "D3YB1P5MKS27LHRO",
                    results: 1440,
                    days: 1,
                    average: 60,
                    offset: 5
                }
            }, config).then(function(response) {
                var data = response.data;
                var feeds = data['feeds'];
                var lastUpdated = data['channel'].updated_at;
                var lUpdated = lastUpdated.split("T");
                var ludate = lUpdated[0];
                var lutime = lUpdated[1].split("+")[0];
                var ludnt = moment(ludate + " " + lutime).add(30, "m");
                var flu = ludnt.format("DD-MM HH:mm");
                var temperatures = [];
                var humidities = [];
                var unixtimestamps = [];
                var timestamps = [];
                for(var i=0;i<feeds.length;i++) {
                    var feed = feeds[i];
                    if(feed['field1']) {
                        temperatures[temperatures.length] = feed['field1'];
                        humidities[humidities.length] = feed['field2'];
                        var created_at = feed['created_at'];
                        var timestamp = created_at.split("T");
                        var date = timestamp[0];
                        var time = timestamp[1].split("+")[0];
                        var dnt = moment(date + " " + time).add(30, "m");
                        timestamps[timestamps.length] = dnt.unix();
                        unixtimestamps[unixtimestamps.length] = dnt.unix();
                    }
                }
                var baseStamp;
                for(var j = 0; j < unixtimestamps.length;j++) {
                    if(j === 0) {
                        baseStamp=unixtimestamps[j];
                        unixtimestamps[j] = 0;
                    }
                    else {
                        unixtimestamps[j] = unixtimestamps[j] - baseStamp;
                    }
                }
                var graph = {};
                var timePacket = {};
                timePacket.timeDifference = unixtimestamps;
                timePacket.unix = timestamps;
                timePacket.lastUpdated = flu;
                graph.temperature = temperatures;
                graph.humidity = humidities;
                graph.time = timePacket;
                packet.graph = graph;
                client.emit("statusResponse", packet);
                console.log(packet);
            });
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
