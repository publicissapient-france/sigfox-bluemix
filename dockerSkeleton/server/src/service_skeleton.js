var config = {
    "org": "<org>",
    "id": "<device id>",
    "type": "<device type>",
    "auth-method": "token",
    "auth-token": "<device token>"
};


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

            postMessageToDevice(value, config, res)
        } catch (e) {
            console.log(e)
        }
    }

}

const postMessageToDevice = (value, config, res) => {
    var IotfDevice = require("ibmiotf").IotfDevice;
    // TODO create a device from configuration
    var device;

    device.on("connect", function () {
        var msg = JSON.stringify(value)
        // TODO publish event using the default quality of service
        // TODO release connection

        var result = {'result': {'msg': msg}};
        res.status(200).json(result);
    });

    // TODO connect device

}

SigfoxService.getService = function (rawLog, logger) {
    return new SigfoxService(rawLog, logger);
}

module.exports = SigfoxService;



