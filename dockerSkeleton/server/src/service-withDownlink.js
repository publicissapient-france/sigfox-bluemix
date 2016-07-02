var fs = require('fs');
var pad = require('pad');
const unirest = require('unirest');

var config = {
    "org": "r3lj82",
    "id": "1C69C",
    "type": "BluemixUserGroup",
    "auth-method": "token",
    "auth-token": "ocILie*pIcXB5EOKwJ"
};


var configApp = {
    "org": "r3lj82",
    "id": "raspiCommand",
    "auth-key": "a-r3lj82-ezucidlb10",
    "auth-token": "8krqkM9n+mjSpG-6a3"
}

const IotfApp = require("ibmiotf").IotfApplication;
const appClient = new IotfApp(configApp);


function ledStateUsingHex(litLeds) {
    var numRepr = 0 | 0;
    for (var i = 0; i < litLeds.length; i++) {
        numRepr |= (1 << litLeds[i] - 1)
    }
    return ("00" + numRepr.toString(16)).slice(-2);
}


function patchedGetAllHistoricalEventsByDeviceId(evtType, typeId, deviceId) {
    console.info("getAllHistoricalEvents(" + evtType + ")");
    var params = {
        evt_type: evtType,
        top: 1
    };
    return appClient.callApi('GET', 200, true, ['historian', 'types', typeId, 'devices', deviceId], null, params);
}

function SigfoxService(rawLog, logger) {

    var server = undefined;

    /**
     * Starts the server.
     *
     * @param app express app
     */
    this.start = function start(app) {
        server = app.listen(app.get('port'), function () {
            var host = server.address().address;
            var port = server.address().port;
            logger.info('[start] listening at http://%s:%s', host, port);
        });
    }

    /**
     * req.body = { main: String, code: String, name: String }
     */
    this.initCode = function initCode(req, res) {
        if (status === Status.ready) {
            try {
                var body = req.body || {};
                var message = body.value || {};
                logger.info('[initCode]', body);

                // Not expected zip which would come from message.lib
                if (message.main && message.code && typeof message.main === 'string' && typeof message.code === 'string') {
                    // .... app-specific initialization ...
                    res.status(200).send();
                }
            } catch (e) {
                logger.error('[initCode]', 'excception', e);
                res.status(500).send();
            }
        } else res.status(409).send();
    }

    /**
     * req.body = { value: Object, meta { activationId : int } }
     */
    this.runCode = function runCode(req, res) {
        try {
            var value = (req.body || {}).value;

            postMessageToDevice(value, res)
        } catch (e) {
            console.log(e)
        }
    }

}

const postMessageToDevice = (value, res) => {
    var IotfDevice = require("ibmiotf").IotfDevice;
    var device = new IotfDevice(config);

    device.on("connect", function () {
        var msg = JSON.stringify(value)
        //publishing event using the default quality of service
        device.publish("status", "json", msg);

        device.disconnect();

        patchedGetAllHistoricalEventsByDeviceId('switchLed', config.type, config.id)
            .then(
                function onSuccess(response) {
                    console.log(response)
                    console.log("Led state :" + JSON.stringify(response.events[0].evt));
                    var state = [];
                    if (response.events[0].evt.redLed == 1) {
                        state.push(1);
                    }
                    if (response.events[0].evt.greenLed == 1) {
                        state.push(2);
                    }
                    if (response.events[0].evt.blueLed == 1) {
                        state.push(3);
                    }
                    const hex = ledStateUsingHex(state);
                    var paddedHex = pad(hex, 16, '0');

                    var response = '{"' + config.id + '": { "downlinkData" : "' + paddedHex + '" }}';
                    res.writeHead(200, {"Content-Type": "application/json"})
                    res.end(response);
                },
                function onError(error) {
                    console.log("Fail\n");
                    console.log(error);
                    var response = '{"' + req.body.device + '": {"noData" : true}}';
                    res.writeHead(200, {"Content-Type": "application/json"})
                    res.end(response);
                }
            );

        //var result = {'result': {'msg': msg}};
        //res.status(200).json(result);
    });

    device.connect();

}

SigfoxService.getService = function (rawLog, logger) {
    return new SigfoxService(rawLog, logger);
}

module.exports = SigfoxService;



