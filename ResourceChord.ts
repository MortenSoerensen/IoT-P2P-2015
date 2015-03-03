/// <reference path='Chord.ts'/>

class ResourceChord extends FingerChord
{
    protected resources : any = {};

    constructor()
    {
        super();
        var _this = this;
        console.warn("ResourceChord");
         // Pre-load the html template
        var fs = require('fs')
        fs.readFile('template-resource.html', 'utf8', function (err, data)
        {
            if (err)
            {
                console.error("Error loading html template: " + err);
                console.error("Terminating");
                process.exit(1);
            }
            _this.template_string = data;
        });
    }

    protected get_resource_json(url : string, callback : (any) => void) : void
    {
        var https = require('https');
        https.get(url, function(res)
        {
            console.log("Got response code: " + res.statusCode);
            res.on("data", function(chunk)
            {
                console.log("Got response: " + chunk);
                callback(chunk);
            });
        }).on('error', function(e)
        {
            console.error("Error while getting resource json: " + e.message);
            console.error("Terminating");
            process.exit(1);
        });
    }

    public handler(url_parts : string, path_name : string, query : any, res : any)
    {
        var _this = this;
        if(path_name === "/assign_resource")
        {
            var json = JSON.parse(query['json']);
            console.info(json);

            _this.resources[json.hash] = json;

            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write("Succes!");
            res.end();
        }
        else if(path_name === "/list_resources")
        {
            res.writeHead(200, {'Content-Type': 'application/json'});
            var answer_json = {};
            Object.keys(_this.resources).forEach(function(key) 
            {
                var val = _this.resources[key];
                answer_json[val.name] = val.hash;
            });
            console.info(_this.resources);
            console.info(answer_json);
            res.write(JSON.stringify(answer_json));
            res.end();
        }
        else if(path_name === "/get_resource")
        {
            var id = query['id'];
            res.writeHead(200, {'Content-Type': 'application/json'});
            _this.get_resource_json(_this.resources[id].url, function(json_str)
            {
                res.write(json_str);
                res.end();
            });
            /*
            res.write(JSON.stringify(_this.resources[id]));
            res.end();
            */
        }
        else
        {
            super.handler(url_parts, path_name, query, res);
        }
    }
}
