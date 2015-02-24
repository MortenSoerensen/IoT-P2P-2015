module utils
{
    // Declare the nodejs require function
    declare function require(name : string);

    var crypto = require('crypto');

    // Function to hash 'str' with the best feasible hashing algorithm
    export function hash_string(str)
    {
        // NOTE: Comment the below line in for clearity
        // return str;

        // Get a list of supported hash functions
        var hash_functions = crypto.getHashes();
        //console.info(hash_functions);

        // Check if we have sha256 and sha1
        var priority_hash_functions = ["sha512", "sha384", "sha256", "sha1"];

        // Pick the best alternative
        var hash_function = null;
        for (var i = 0; i < priority_hash_functions.length; i++)
        {
            var hash = priority_hash_functions[i];
            var has_hash = (hash_functions.indexOf(hash) > -1);
            if(has_hash)
            {
                hash_function = crypto.createHash(hash);
                console.info("Using " + hash + " as hashing function");
                break;
            }
        }
        // No alternative present
        if(hash_function === null)
        {
            console.error("No adequate hash function present, terminating");
            process.exit(1);
        }

        // Do the actual string hashing
        var str_hash = hash_function.update(str).digest('hex');
        return str_hash;
    }

    export function ip_to_string(ip : string) : string
    {
        if(ip === "0.0.0.0")
            return "localhost";
        else
            return ip;
    }

    export function is_between_cyclic(id : string, left_key : string, right_key : string) : boolean
    {
        var key1 = left_key;
        var key2 = right_key;

        if (
            // Keys are in order, check that we're inbetween
            ((key1 < key2) && (key1 < id && id <= key2)) ||
            // Keys are not in order, if we're larger than both, we must be less than max
            ((key1 > key2) && ((id > key1 && id >= key2))) ||
            // Keys are not in order, if we're smaller than both, we must be larger than min
            ((key1 > key2) && ((id < key1 && id < key2))) ||
            // We equal key2, so we're in
            ((id === key2)))
            {
                return true;
            }
            return false;
    }
}
