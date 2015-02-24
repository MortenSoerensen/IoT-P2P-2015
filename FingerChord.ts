/// <reference path='Chord.ts'/>

    var fingertableSize: number = 3;
    //var fingertable: Array<NodeInfo> = [0,1,2];

class FingerChord extends Chord
{
    constructor()
    {
        super();
        console.warn("FingerChord");  
    }

    public run(host_port : number, handler_override : any) : void
    {
        super.run(host_port, handler_override);
    }

    private build_fingertable() : void
    {
        //fingertable.length = fingertableSize;
        /*if()
        {

        }
        */

    }

    public handler(url_parts : string, path_name : string, query : any, res : any)
    {
        if(path_name === "/update_finger")
        {
            res.writeHead(200, {'Content-Type': 'application/JSON'});
            //update fingers, callbackk when done {
            res.write(JSON.stringify(this.successor));
            res.end();
            // }
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
        else super.handler(url_parts, path_name, query, res)
    }


    // Function to join the Chord ring, via the known main node
    protected chord_join(join_port : number) : void
    {

        function getpredecessor(port, callback)
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
                console.error("Error while calling get_info: " + e.message);
                console.error("Terminating");
                process.exit(1);
            });
        }
    var _this = this;   
    var starter = function recursivepred(nodesVisited, current: NodeInfo)
    {
        if(nodesVisited === Math.pow(2,(fingertableSize-1)) || current.port === _this.info.port)
        {
            console.log("Successfully joined the Chord ring");
            return;
        }
        else
        {
            //update your fingers, callback when done {
            getpredecessor(current.port, function(predecessor: NodeInfo)
            {
                recursivepred(nodesVisited+1, predecessor);
            });
            //}
        }
    }
    var successors = function recursivesuc(nodesVisited, current: NodeInfo)
    {
        if(nodesVisited === Math.pow(2,(fingertableSize-1)) || current.port === _this.info.port)
        {
            console.log("Successfully joined the Chord ring");
            return;
        }
        else
        {
            //update your fingers, callback when done {
            getpredecessor(current.port, function(predecessor: NodeInfo)
            {
                recursivesuc(nodesVisited+1, predecessor);
            });
            //}
        }
    }
        super.chord_join(join_port, function(){
            //initialize fingers for n
            //build_fingertable();
            //loop through predecessors
            starter(0, _this.info);


        });
        //this.build_fingertable();
      //  for (var i = 0; i < fingertable.length; i+1) {
           // var successor: NodeInfo = handler()
            //fingertable[i] = 
       // };
    }
}
