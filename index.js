const pad = require('node-string-pad');
const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');

const IotfDevice = require("ibmiotf").IotfDevice;
const IotfApp = require("ibmiotf").IotfApplication;

const config = {
	"org" : "b0jbhc",
	"id" : "1C69C",
	"type" : "RPi-Atelier",
	"auth-method" : "token",
	"auth-token" : "nocj@EWvcur4E@n?+j"
};

var configApp = {
    "org" : "b0jbhc",
    "id" : "raspiCommand",
    "auth-key" : "a-b0jbhc-4xoeozwahv",
    "auth-token" : "kOHTuwt@2LkgW7aCGf"
}

const appClient = new IotfApp(configApp);

const device = new IotfDevice(config);

const data = [];
const switchLedCmd = [];

// setup middleware
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

device.on("connect", function () {
	var dataToPush ;
	while((dataToPush=data.pop()) != null){ 
		var msg = '{"d" : '+ JSON.stringify(dataToPush) + '}';
		//publishing event using the default quality of service
		device.publish("status","json", msg);
	}
setTimeout(function() {
device.disconnect();
}, 30000);

	device.disconnect();
		
});

device.on("error", function (err) {
	console.log("Error : "+err);
});

device.on("disconnect", function () {
	console.log("Disconnected");
});

appClient.on("connect", function () {
	var ledSwitch={'redLed' : 1, 'greenLed' : 1, 'blueLed' : 0}
	var dataToPush ;
	while((dataToPush=switchLedCmd.pop()) != null){ 
		var msg = JSON.stringify(dataToPush);
		appClient.publishDeviceEvent("RPi-Atelier","1C69C", "switchLed", "json", msg);
	}
    appClient.disconnect();
});

app.post('/command', function(req, res) {
	switchLedCmd.push(req.body);

	appClient.connect();
	res.writeHead(200, {"Content-Type": "plain/text"})
    res.end("OK\n");
});


function patchedGetAllHistoricalEventsByDeviceId(evtType, typeId, deviceId) {
	console.info("getAllHistoricalEvents("+evtType+")");
	var params = {
	  evt_type : evtType, 
	  top: 1
	};
	return appClient.callApi('GET', 200, true, [ 'historian', 'types', typeId, 'devices', deviceId], null, params);
}

app.post('/', function(req, res) {

	data.push(req.body);

	if(!device.isConnected){
		console.log("Client is not connected, connecting ...");
		device.connect();
	} else {
		console.log("Client is connected");
	}

	patchedGetAllHistoricalEventsByDeviceId('switchLed', 'RPi-Atelier', '1C69C')
	.then(
		function onSuccess (response) {
			console.log("Led state :" + JSON.stringify(response.events[0].evt));
			var state = [];
			if(response.events[0].evt.redLed==1){
				state.push(1);
			}
			if(response.events[0].evt.greenLed==1){
				state.push(2);
			}
			if(response.events[0].evt.blueLed==1){
				state.push(3);
			}
			const hex = ledStateUsingHex(state);
			var paddedHex = pad(hex, 16, '0');
			var response = '{"' + req.body.device + '": { "downlinkData" : "' + paddedHex +'" }}';
			res.writeHead(200, {"Content-Type": "application/json"})
			res.end(response);
		}, 
		function onError (error) {
			console.log("Fail\n");
			console.log(error);
			var response = '{"' + req.body.device + '": {"noData" : true}}';
			res.writeHead(200, {"Content-Type": "application/json"})
			res.end(response);
		}
	);
	
});

function ledStateUsingHex(litLeds) {
  var numRepr = 0|0;
  for(var i = 0; i < litLeds.length; i++) {
    numRepr |= (1 << litLeds[i] - 1)
  }
  return ("00" + numRepr.toString(16)).slice(-2);
}

var port = process.env.VCAP_APP_PORT || 8080;

app.listen(port);
console.log('Magic happens on port ' + port);


require("cf-deployment-tracker-client").track();
