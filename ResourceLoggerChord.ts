/// <reference path='Chord.ts'/>

var Engine = require('tingodb')();

class ResourceLoggerChord extends ResourceChord
{
    private db = new Engine.Db('database', {});

    constructor()
    {
        super();
        console.warn("ResourceLoggerChord");

        var _this = this;
        setInterval(function()
        {
            _this.pull_data();
        }, 5000);

	// Pre-load the html template
        var fs = require('fs')
        fs.readFile('template-logger.html', 'utf8', function (err, data)
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

    private pull_data() : void
    {
        var _this = this;
        Object.keys(_this.resources).forEach(function(key) 
        {
            var val = _this.resources[key];
            _this.get_resource_json(val.url, function(json_str)
            {
                var json = JSON.parse(json_str);
                var collection = _this.db.collection(val.hash + "_" + _this.info.port);
                collection.insert(json, function(err, result)
                {
                    if(err)
                    {
                        console.error("Error occured while inserted data: " + err);
                    }
                    else
                    {
                        console.info("Wrote entry");
                    }
                });
            });
        });
    }

    public handler(url_parts : string, path_name : string, query : any, res : any)
    {
        var _this = this;
        if(path_name === "/assign_resource")
        {
            super.handler(url_parts, path_name, query, res);
            // Create tables, register new db_table
        }
        else if(path_name === "/get_resource_dump")
        {
            var id = query['id'];
            res.writeHead(200, {'Content-Type': 'application/json'});

            var val = _this.resources[id];
            var collection = _this.db.collection(val.hash + "_" + _this.info.port);
            collection.find({}).toArray(function(err, results)
            {
                /*
                if(err)
                {
                    console.error("Error occured while querying data: " + err);
                }
                else
                {*/
                    console.info(results);
                    res.write(JSON.stringify(results));
                    res.end();
                //}
            });
        }
        else
        {
            super.handler(url_parts, path_name, query, res);
        }
    }
}
