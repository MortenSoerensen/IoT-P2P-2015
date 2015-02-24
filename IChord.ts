// Information on how to contact a Chord node
class NodeInfo
{
    id : string;
    ip : string;
    port : number;
}

// Struct for transfering node information back and forth
interface TransferNodePair
{
    predecessor : NodeInfo;
    successor : NodeInfo;
}

// Interface of a Chord Node
interface IChord
{
    run(host_port : number, handler_override ?: any) : void;
    find_successor(id : string, port : number, callback : (NodeInfo) => void);
    find_neighbours(id : string, port : number, callback : (TransferNodePair) => void);
    // TODO: Do better than any in these
    handler(url_parts : string, path_name : string, query : any, res : any);
}
