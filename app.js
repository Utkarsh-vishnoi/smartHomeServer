var io = require('socket.io')(80);

console.log("Socket server running on port 80");

var identifier = "#5521SHCBUV";
var pi_ID, lights, temperature, humidity;

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
          lights = status.lights;
          temperature = status.temperature;
          humidity = status.humidity;
          // console.log(lights[1]);
          // console.log(lights[2]);
          // console.log(lights[3]);
        });
        client.emit("authenticated");
        break;
      case "smartUsr":
        if(pi_ID != null) {
          console.log("---------------------------------------");
          console.log("Smart User connected.");
          console.log("Authentication ID - " + client.id);
          console.log("---------------------------------------");
          client.emit("authenticated");
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
      pi_ID = temperature = humidity = lights = null;
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
