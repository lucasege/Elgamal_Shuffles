
// sets up web3.js
if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

web3.eth.defaultAccount = web3.eth.accounts[0];
// Constant we use later
var GENESIS = '0x0000000000000000000000000000000000000000000000000000000000000000';

// This is the ABI for your contract (get it from Remix, in the 'Compile' tab)
// ============================================================
var abi = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "i",
        "type": "uint256"
      }
    ],
    "name": "get_vote_i",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "ega2",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "ssa1",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "votes",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "ega4",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "voteLength",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "ssa3",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "hash",
        "type": "string"
      }
    ],
    "name": "vote",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "name": "_p",
        "type": "uint256"
      },
      {
        "name": "_q",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "constructor"
  }
];

// ============================================================
abiDecoder.addABI(abi);
// call abiDecoder.decodeMethod to use this - see 'getAllFunctionCalls' for more

// Reads in the ABI
var MixNetworkContractSpec = web3.eth.contract(abi);

// This is the address of the contract you want to connect to; copy this from Remix
var contractAddress = '0x06e5e8750e8d44015bbe45ba8dd22ab01535d36f';

var MixNetwork = MixNetworkContractSpec.at(contractAddress)
var myContract = web3.eth.contract(abi);
var contractInstance = myContract.at(contractAddress);

var sampleVotes = ["0 vote: 0", "1 vote: 1"];//, "2 vote 0", "3 vote 0", "4 vote 1", "5 vote 1", "6 vote 0", "7 vote 0", "8 vote 1", "9 vote 0"];

class ssa {
  constructor(_X, _Y) {
    this.X = _X;
    this.Y = _Y;
    // Generates two random large primes (4096 bits)
    this.p = 809;
    this.q = 808;
    // $.ajax({
    //   url: '/forgeKeyPair',
    //   type: 'GET',
    //   async: false,
    //   success: function (response) {
    //     this.p = response.p;
    //     this.q = response.q;
    //     console.log(response);
    //   }
    // });
    this.G = getRandomInt(this.p);
    this.Gamma = getRandomInt(this.p);
    this.gamma = Math.log(this.Gamma) / Math.log(this.G);
  }

  ssa1() {
    this.t = contractInstance.ssa1.call().toNumber() % this.q;
  }

  ssa2() {
    var gammaT = this.gamma * this.t;
    $.ajax({
      url: '/ssa2',
      type: 'POST',
      contentType: 'application/json',
      async: false,
      data: JSON.stringify({
        "gammaT": gammaT, "X": this.X, "Y": this.Y, "t": this.t,
        "p": this.p, "G": this.G, "gamma": this.gamma
      }),
      success: function (response) {
        console.log("RESP", response);
      }
    });
  }

  ssa3() {
    this.c = contractInstance.ssa3.call().toNumber() % this.q; // Call smart contract
  }

  ssa4() {
    var alphas = [];
    for (var i = 1; i <= this.X.length; i++) {
      var piSum = 1;
      for (var j = 0; j < i; j++) {
        piSum *= this.X[j] / this.Y[j];
      }
      alphas.push(this.thetas[i - 1] + this.c * piSum);
    }
    for (i = this.X.length + 1; i <= (2 * this.X.length) - 1; i++) {
      alphas.push(this.c * Math.pow(this.gamma, i - (2 * this.X.length)));
    }
    this.alphas = alphas;
  }

  ssa5() {
    var U = this.G ** (-1 * this.t);
    var W = this.G && (-1 * this.gamma * this.t);
    $.ajax({
      url: '/ssa5',
      type: 'POST',
      contentType: 'application/json',
      async: false,
      data: JSON.stringify({ "U": U, "W": W, "X": this.X, "Y": this.Y, "c": this.c, "alphas": [1, 1, 1], "Gamma": this.Gamma, "G": this.G }),//this.alphas }),
      success: function (response) {
        console.log("RESP", response);
        console.log("THeta", this.Thetas);
      }
    });
    // var xhat = [];
    // var yhat = [];
    // for (var i = 0; i < this.X.length; i++) {
    //   this.X[i].a.multiply(U);
    //   this.X[i].b.multiply(U);
    //   xhat.push(this.X[i]);
    //   this.Y[i].a.multiply(W);
    //   this.Y[i].b.multiply(W);
    //   yhat.push(this.Y[i]);
    // }
    // var xyhats = [];
    // console.log("XHat", xhat);


    // Call smart contract verify,
    // Verify (this.G, this.Gamma, this.gamma, this.X, this.Y, this.Thetas, this.alphas);
  }
}


// if (contractInstance.voteLength().toNumber() < sampleVotes.length) {
//   for (var i = 0, len = sampleVotes.length; i < len; i++) {
//     $.ajax({
//       url: '/encrypt',
//       type: 'POST',
//       contentType: 'application/json',
//       data: JSON.stringify({ "vote": sampleVotes[i] }),
//       success: function (response) {
//         contractInstance.vote.sendTransaction(response, { gas: 3000000 });
//       }
//     });
//   }
// }

function mix() {
  var inputs = [];
  var outputs = [];
  var betas = [];
  // Keys for second round encryption
  for (var i = 0; i < sampleVotes.length; i++) {
    betas.push(getRandomInt(827));
  }
  // Setup inputs to proper format (elgamal encrypted)
  for (var i = 0; i < sampleVotes.length; i++) {
    var vote = sampleVotes[i];//contractInstance.get_vote_i(i);
    $.ajax({
      url: '/encrypt',
      type: 'POST',
      contentType: 'application/json',
      async: false,
      data: JSON.stringify({ "vote": vote }),
      success: function (response) {
        inputs.push(response);
      }
    });
  }

  // Second round encryption (EGA proof), specifying beta key
  for (i = 0; i < sampleVotes.length; i++) {
    var vote = inputs[i];
    $.ajax({
      url: '/encryptKey',
      type: 'POST',
      contentType: 'application/json',
      async: false,
      data: JSON.stringify({ "vote": vote, "b": betas[i] }),
      success: function (response) {
        outputs.push(response);
      }
    })
  }

  // Generate a shuffle
  var indices = Array.apply(null, { length: inputs.length }).map(Function.call, Number);
  var pi = shuffle(indices);

  // Shuffle outputs
  var shuffled_outputs = [sampleVotes.length];
  for (i = 0; i < sampleVotes.length; i++) {
    // Set shuffled index to regular index of output
    shuffled_outputs[pi[i]] = outputs[i];
  }

  // var ssa_obj = new ssa(votes, shuffled_votes);
  // ssa_obj.ssa1();
  // ssa_obj.ssa2();
  // ssa_obj.ssa3();
  // ssa_obj.ssa4();
  // console.log("here");
  // ssa_obj.ssa5();

  // var ega_obj = new ega(inputs, shuffled_outputs, pi, betas);
  $.ajax({
    url: '/ega_init',
    type: 'POST',
    contentType: 'application/json',
    async: false,
    data: JSON.stringify({ "inputs": inputs, "outputs": outputs, "pi": pi, "betas": betas }),
    success: function (response) {
      console.log(response);
    }
  });
  // ega_obj.ega1();
  // ega_obj.ega2();
  // ega_obj.ega3();
  // ega_obj.ega4();
  // ega_obj.ega5();
  // ega_obj.ega7();
  // for (var vote in votes) {
  //   contractInstance2.vote.sendTransaction(vote, { gas: 3000000 });
  // }
}
mix();

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}



