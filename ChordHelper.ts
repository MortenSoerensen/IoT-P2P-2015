/// <reference path='IChord.ts'/>

// Declare the nodejs require function
declare function require(name : string);

var http = require('http');

module ChordHelper
{
    export function find_successor(id : string, port : number, callback : (NodeInfo) => void) : void
    {
        this.find_neighbours(id, port, function(object : TransferNodePair)
        {
            callback(object.successor);
        });
    }

    export function find_neighbours(id: string, port : number, callback : (TransferNodePair) => void) : void
    {
        // Setup the HTTP request
        var options = {
            host: 'localhost',
            port: port,
            path: '/find_neighbours?id=' + id
        };
        // ... and fire!
        http.get(options, function(res)
        {
            console.log("Got response code: " + res.statusCode);
            res.on("data", function(chunk)
            {
                console.log("Got response: " + chunk);
                var object : TransferNodePair = JSON.parse(chunk);
                callback(object);
            });
        }).on('error', function(e)
        {
            console.error("Error while finding neighbours: " + e.message);
            console.error("Terminating");
            process.exit(1);
        });
    }
}
