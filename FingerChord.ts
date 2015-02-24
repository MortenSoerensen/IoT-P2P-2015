/// <reference path='Chord.ts'/>

class FingerChord extends Chord
{
    static fingertableSize : number = 3;
    static fingertableSpan : number = Math.pow(2, (FingerChord.fingertableSize-1));
    private fingertable : Array<NodeInfo>;

    constructor()
    {
        super();
        console.warn("FingerChord");  

        this.fingertable = Array<NodeInfo>(3);
    }

    public handler(url_parts : string, path_name : string, query : any, res : any)
    {
        if(path_name === "/update_finger")
        {
            // NOTE: Should probably take an id of the inserted node as url argument
            // XXX: var insertID = query['insertID']
            function update_finger_worker(callback : () => void)
            {
                // TODO: Update the finger table:
                //
                // XXX: Loop through the fingers, find the insertion spot,
                //      i.e. between which fingers the new node was inserted.
                // XXX: Update all the ones after the insertion spot with +1
                //      i.e. go to the finger, and find it predecessor, it's the new finger.
                // XXX: Check if our finger table is filled, if so return now.
                // XXX: Check if there's enough additional nodes to extend our finger table.
                //      i.e. by doing a linear search forward.
                // XXX: Call callback when everything is done
                callback();
            }

            res.writeHead(200, {'Content-Type': 'text/plain'});
            // Update the finger table, and respond when done
            update_finger_worker(function()
            {
                res.write("SUCCES!");
                res.end();
            });
        }
        if(path_name === "/pre")
        {
            res.writeHead(200, {'Content-Type': 'application/JSON'});
            res.write(JSON.stringify(this.predecessor));
            res.end();
        }
        if(path_name === "/suc")
        {
            res.writeHead(200, {'Content-Type': 'application/JSON'});
            res.write(JSON.stringify(this.successor));
            res.end();
        }
        else
        {
            super.handler(url_parts, path_name, query, res);
        }
    }


    // Function to join the Chord ring, via the known main node
    protected chord_join(join_port : number) : void
    {
        function invoke_update_finger(port, callback)
        {
            // Setup the HTTP request
            var options = {
                host: 'localhost',
                port: port,
                path: '/update_finger'
            };
            // ... and fire!
            http.get(options, function(res)
            {
                res.on("data", function(chunk)
                {
                    callback();
                });
            }).on('error', function(e)
            {
                console.error("Error while calling invoke_update_finger: " + e.message);
                console.error("Terminating");
                process.exit(1);
            });
        }

        function get_predecessor(port, callback)
        {
            // Setup the HTTP request
            var options = {
                host: 'localhost',
                port: port,
                path: '/pre'
            };
            // ... and fire!
            http.get(options, function(res)
            {
                res.on("data", function(chunk)
                {
                    callback(JSON.parse(chunk));
                });
            }).on('error', function(e)
            {
                console.error("Error while calling get_predecessor: " + e.message);
                console.error("Terminating");
                process.exit(1);
            });
        }
        var _this = this;   
        var starter = function recursive_pred(nodesVisited : number, current: NodeInfo)
        {
            if(nodesVisited === FingerChord.fingertableSpan 
            || current.port === _this.info.port)
            {
                console.log("Successfully joined the Chord ring");
                return;
            }
            else
            {
                // Update the fingers of current
                invoke_update_finger(current.port, function()
                {
                    // Get the predecessor of current, and recurse on that
                    get_predecessor(current.port, function(predecessor: NodeInfo)
                    {
                        recursive_pred(nodesVisited+1, predecessor);
                    });
                });
            }
        }
        super.chord_join(join_port, function()
        {
            // Tell everyone before us to update their fingers
            starter(0, _this.predecessor);
            // TODO: We need to build our own initial finger table
            // XXX: Ask someone for theirs, and use that to construct ours
        });
    }
}
