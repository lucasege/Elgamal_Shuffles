pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "github.com/oraclize/ethereum-api/oraclizeAPI.sol";

contract Mix is usingOraclize {

    // Array of H(x)
    string[] public votes;
    uint p;
    uint q;
    uint t;
    bytes[] Betas;

    constructor (uint _p, uint _q) public {
        p = _p;
        q = _q;
    }

    function ssa1 () public returns (uint) {
        t = uint(blockhash(block.number-1))%q + 1;
        return t;
    }

    function ssa3 () public view returns (uint) {
        return uint(blockhash(block.number-1))%q + 1;
    }

    // function ssa5 (X, Y, Thetas, G, gamma)  {

    // }

    function ega2 (bytes[] memory Uvec, bytes memory g) public returns (bytes32[] memory) {
        bytes32[] memory ps = oraclize_query("URL", "json(https://api.random.org/json-rpc/1/invoke).result.random.data", '\n{"jsonrpc":"2.0","method":"generateIntegers","params":{"apiKey":"dea1f876-8667-4ff6-964a-cd0cb1081ffc","n":20,"min":1,"max":1000000,"replacement":true,"base":10},"id":12345}');
        // for (uint i = 1; i <= Uvec.length; i++) {
        //     Betas[i] = (g ** ps[i])/Uvec[i];
        // }
        return ps;
    }

    function ega4 () public view returns (uint) {
        return uint(blockhash(block.number-1))%q + 1;
    }

    // Input is Elgamal encryption of vote
    // Posts to blockchain
    function vote(string memory hash) public {
        votes.push(hash);
    }

    function voteLength() public view returns(uint) {
        return votes.length;
    }

    function get_vote_i(uint i) public view returns(string memory) {
        return votes[i];
    }


}