var io = require('socket.io')(process.env.PORT || 8080);

console.log("Socket server running on port 80");

var identifier = "#5521SHCBUV";
var pi_ID
var packet = {};


io.on('connection', function(client){
  client.auth = false;
  client.on('authenticate', function(data){
    var recData = JSON.parse(data);
    if(identifier == recData.identifier) {
      client.auth = true;
    }
    switch (recData.type) {
      case "smartPi":
        pi_ID = client.id;
        console.log("----------------------------------------");
        console.log("Smart PI connected.");
        console.log("Authentication ID - " + client.id);
        console.log("----------------------------------------");
        client.on('status', function(data){
          var status = JSON.parse(data);
          packet.lights = status.lights;
          packet.temperature = status.temperature;
          packet.humidity = status.humidity;
        });
        client.emit("authenticated");
        break;
      case "smartUsr":
        if(pi_ID != null) {
          console.log("---------------------------------------");
          console.log("Smart User connected.");
          console.log("Authentication ID - " + client.id);
          console.log("---------------------------------------");
          client.emit("authenticated", packet);
          client.on('status', function(data){
            client.emit("authenticated", packet);
          });
        }
        else {
          client.emit("No PI");
        }
        break;
    }
  });

  setTimeout(function() {
    if (!client.auth) {
      console.log("Disconnecting socket ", client.id);
      client.disconnect('unauthorized');
    }
  }, 1000);

  client.on("disconnect", function() {
    if (client.id == pi_ID) {
      pi_ID = null;
      console.log("-------------------------");
      console.log("Smart PI disconnected.");
      console.log("ID - " + client.id);
      console.log("-------------------------");
    }
    else {
      console.log("-------------------------");
      console.log("Smart User disconnected.");
      console.log("ID - " + client.id);
      console.log("-------------------------");
    }
  });
});
