var requests = require('axios');
var moment = require('moment');

requests.get('http://127.0.0.1/feed.json').then(function(response) {
    var data = response.data;
    var feeds = data['feeds'];
    var lastUpdated = data['channel'].updated_at;
    var lUpdated = lastUpdated.split("T");
    var ludate = lUpdated[0];
    var lutime = lUpdated[1].split("+")[0];
    var ludnt = moment(ludate + " " + lutime).add(30, "m");
    var flu = ludnt.format("MM-DD HH:mm");
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
            timestamps[timestamps.length] = dnt.format("MM-DD HH:mm");
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
    timePacket.timestamps = unixtimestamps;
    timePacket.label = timestamps;
    timePacket.lastUpdated = flu;
    graph.temperature = temperatures;
    graph.humidity = humidities;
    graph.time = timePacket;
    console.log(graph);
});