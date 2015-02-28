/// <reference path='utils.ts'/>
/// <reference path='IChord.ts'/>
/// <reference path='ChordHelper.ts'/>

var resource_json = {
    name: "SparkCore",
    url: "https://api.spark.io/v1/devices/54ff72066667515108311467/temperature?access_token=e9e7d759cc116c17549d74c7c4ad57f96c334810"
}

var resource_id : string = utils.hash_string(resource_json.url);
console.info(resource_id);

resource_json['hash'] = resource_id;
console.info(resource_json);

function assign_resource(json : Object, port : number, callback : () => void) : void
{
    // Setup the HTTP request
    var options = {
        host: 'localhost',
        port: port,
        path: '/assign_resource?json=' + JSON.stringify(json)
    };
    // ... and fire!
    http.get(options, function(res)
    {
        console.log("Got response code: " + res.statusCode);
        res.on("data", function(chunk)
        {
            console.log("Got response: " + chunk);
            callback();
        });
    }).on('error', function(e)
    {
        console.error("Error while assigning resource: " + e.message);
        console.error("Terminating");
        process.exit(1);
    });
}

ChordHelper.find_successor(resource_id, 8080, function(suc)
{
    assign_resource(resource_json, suc.port, function()
    {
        console.info("Resource assigned");
    });
});
