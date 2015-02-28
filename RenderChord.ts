/// <reference path='Chord.ts'/>

class RenderChord<T extends IChord> implements IChord
{
    private node : T;

    constructor(t : T)
    {
        this.node = t;
        console.warn("RenderChord");
    }

    public handler(url_parts : string, path_name : string, query : any, res : any)
    {
        if(path_name === "/all")
        {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.write(JSON.stringify(this));
            res.end();
        }
        else
        {
            this.node.handler(url_parts, path_name, query, res);
        }
    }

    public run(host_port : number) : void
    {
        var _this = this;
        _this.node.run(host_port, function(url_parts, path_name, query, res)
        {
            _this.handler(url_parts, path_name, query, res);
        });
    }
}
