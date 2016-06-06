var fs = require('fs');
const unirest = require('unirest');


var config = {
    "org": "<org>",
    "id": "<device id>",
    "type": "<device type>",
    "auth-method": "token",
    "auth-token": "<device token>"
};

var configFile = JSON.parse(fs.readFileSync('./1C69C.json')).config

var finalConfig = configFile


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

            postMessageToDevice(value, finalConfig, res)
        } catch (e) {
            console.log(e)
        }
    }

}

const postMessageToDevice = (value, config, res) => {
    var IotfDevice = require("ibmiotf").IotfDevice;
    var device = new IotfDevice(config);

    device.on("connect", function () {
        var msg = JSON.stringify(value)
        //publishing event using the default quality of service
        device.publish("status", "json", msg);

        device.disconnect();

        var result = {'result': {'msg': msg}};
        res.status(200).json(result);
    });

    device.connect();

}

SigfoxService.getService = function (rawLog, logger) {
    return new SigfoxService(rawLog, logger);
}

module.exports = SigfoxService;



