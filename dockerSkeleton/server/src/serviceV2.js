var fs = require('fs');
const unirest = require('unirest');

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

            getConfigurationForDevice(value, postMessageToDevice, res)
        } catch (e) {
            console.log(e)
        }
    }

}

const postMessageToDevice = (value, configFile, res) => {
    var IotfDevice = require("ibmiotf").IotfDevice;
    var device = new IotfDevice(configFile.config);

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

const getConfigurationForDevice = (value, cb, res) => {
    unirest.post('https://identity.open.softlayer.com/v3/auth/tokens')
        .header('Content-type', 'application/json')
        .send(JSON.parse(fs.readFileSync('objectStorage.json')))
        .end(function (responseToken) {
            unirest.get('https://lon.objectstorage.open.softlayer.com/v1/AUTH_' + JSON.parse(fs.readFileSync('objectStorage.json')).scope.project.id + '/iotConfigs/' + value.device +'.json')
                .header('X-Auth-Token', responseToken.headers['x-subject-token'])
                .header('Content-type', 'application/json')
                .send(JSON.parse(fs.readFileSync('objectStorage.json')))
                .end(function (response) {
                    cb(value, response.body, res)
                });
        });
}

SigfoxService.getService = function (rawLog, logger) {
    return new SigfoxService(rawLog, logger);
}

module.exports = SigfoxService;



