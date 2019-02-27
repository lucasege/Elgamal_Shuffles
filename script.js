
// sets up web3.js
if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

var curve = sjcl.ecc.curves['c256'];
var sec = sjcl.bn.random(curve.r, 0);
var pub = curve.G.mult(sec);
// web3.eth.defaultAccount = web3.eth.accounts[0];
console.log("Generate 10 random curve points and 10 random beta (k values).");
var inputs = [];
var indices = [];
var init_betas = [];
var betas = [];
for (var i = 0; i < 2; i++) {
  var rand = sjcl.bn.random(curve.r, 0);
  inputs.push(curve.G.mult(rand));
  indices.push(i);
  init_betas.push(sjcl.bn.random(curve.r, 0));
  betas.push(sjcl.bn.random(curve.r, 0));
}
console.log("Begin initial encrypting.");
// Encrypt inputs using ECC ElGamal
var encryptions = [];
for (i = 0; i < inputs.length; i++) {
  var k = init_betas[i];
  var second = curve.G.mult(sec).mult(k).toJac().add(inputs[i]).toAffine();
  encryptions.push([curve.G.mult(k), second]);
}
console.log("Shuffling indices.");
var pi = shuffle(indices);
var reencryptions = [];
for (i = 0; i < inputs.length; i++) {
  var [X, Y] = encryptions[pi[i]];
  var first = curve.G.mult(betas[pi[i]]).toJac().add(X).toAffine();
  var second = curve.G.mult(sec).mult(betas[pi[i]]).toJac().add(Y).toAffine();
  reencryptions.push([first, second]);
}
console.log("Finished encrypting.");

console.log("Begin decrypting.");
for (var i = 0; i < inputs.length; i++) {
  var curr = decrypt(reencryptions[i], sec);
  // console.log(pointEquality(curr, inputs[pi[i]]));
}

function decrypt(pair, sec) {
  var [first, second] = pair;
  var rhs = first.mult(sec);
  return second.toJac().add(rhs.negate()).toAffine();
}

function pointEquality(first, second) {
  if (first.curve != second.curve) return false;
  var i;
  for (i = 0; i < first.x.limbs.length; i++) {
    if (first.x.limbs[i] != second.x.limbs[i]) return false;
  }
  for (i = 0; i < first.y.limbs.length; i++) {
    if (first.y.limbs[i] != second.y.limbs[i]) return false;
  }
  return true;
}

class ega {
  constructor(_inputs, _outputs, _pi, _g, _h, _betas) {
    this.inputs = _inputs;
    this.outputs = _outputs;
    this.pi = _pi;
    this.g = _g;
    this.h = _h;
    this.betas = _betas;
  }

  ega1() {
    this.uvec = [];
    this.wvec = [];
    this.avec = [];
    for (var i = 0; i < this.inputs.length; i++) {
      this.uvec.push(sjcl.bn.random(curve.r, 0));
      this.wvec.push(sjcl.bn.random(curve.r, 0));
      this.avec.push(sjcl.bn.random(curve.r, 0));
    }
    this.tau_naught = sjcl.bn.random(curve.r, 0);
    this.gamma = sjcl.bn.random(curve.r, 0);
    this.Gamma = this.g.mult(this.gamma);
    this.Avec = [];
    this.Cvec = [];
    this.Uvec = [];
    this.Wvec = [];
    for (i = 0; i < this.inputs.length; i++) {
      this.Avec.push(this.g.mult(this.avec[i]));
      this.Cvec.push(this.g.mult(this.gamma).mult(this.avec[this.pi[i]]));
      this.Uvec.push(this.g.mult(this.uvec[i]));
      this.Wvec.push(this.g.mult(this.gamma).mult(this.wvec[i]));
    }

    var w_beta;
    for (i = 0; i < this.inputs.length; i++) {
      if (i == 0) {
        w_beta = this.betas[this.pi[i]].mul(this.wvec[i]);
      } else {
        w_beta = w_beta.add(this.betas[this.pi[i]].mul(this.wvec[i])).normalize();
      }
    }
    var pi_inverse = this.pi.slice().reverse();
    var X_sum;
    var Y_sum;
    for (i = 0; i < this.inputs.length; i++) {
      if (i == 0) {
        X_sum = this.inputs[i][0].mult(this.wvec[pi_inverse[i]].sub(this.uvec[i])).toJac();
        Y_sum = this.inputs[i][1].mult(this.wvec[pi_inverse[i]].sub(this.uvec[i])).toJac();
      } else {
        X_sum = X_sum.add(this.inputs[i][0].mult(this.wvec[pi_inverse[i]].sub(this.uvec[i]).normalize()));
        Y_sum = Y_sum.add(this.inputs[i][1].mult(this.wvec[pi_inverse[i]].sub(this.uvec[i]).normalize()));
      }
    }
    this.Lambda1 = this.g.mult(this.tau_naught.add(w_beta)).toJac().add(X_sum.toAffine());
    this.Lambda2 = this.h.mult(this.tau_naught.add(w_beta)).toJac().add(Y_sum.toAffine());
  }

  ega2() {
    var hash = sjcl.hash.sha256.hash(this.Avec + this.Cvec + this.Uvec + this.Wvec + this.Gamma
      + this.Lambda1 + this.Lambda2);
    this.pvec = [];
    this.Bvec = [];
    for (var i = 0; i < this.inputs.length; i++) {
      this.pvec.push(new sjcl.bn(hash.toString()));
      hash = this.pvec[i];
      this.Bvec.push(this.g.mult(hash).toJac().add(this.Uvec[i].negate()).toAffine());
    }
  }

  ega3() {
    this.bvec = [];
    var i;
    for (i = 0; i < this.inputs.length; i++) {
      this.bvec.push(this.pvec[i].sub(this.uvec[i]).normalize());
    }

    this.dvec = [];
    this.Dvec = [];
    for (i = 0; i < this.inputs.length; i++) {
      this.dvec.push(this.gamma.mul(this.bvec[this.pi[i]]));
      this.Dvec.push(this.g.mult(this.dvec[i]));
    }
  }

  ega4() {
    var hash = sjcl.hash.sha256.hash(this.Avec + this.Cvec + this.Uvec + this.Wvec + this.Gamma
      + this.Lambda1 + this.Lambda2 + this.pvec + this.Dvec);
    this.lambda = new sjcl.bn(hash.toString());
  }

  ega5() {
    this.rvec = [];
    this.svec = [];
    this.sigma_vec = [];
    var i;
    for (i = 0; i < this.inputs.length; i++) {
      this.rvec.push(this.avec[i].add(this.lambda.mul(this.bvec[i])).normalize());
    }
    var b_beta_sum;
    for (i = 0; i < this.inputs.length; i++) {
      this.svec.push(this.gamma.mul(this.rvec[this.pi[i]]));
      this.sigma_vec.push(this.wvec[i].add(this.bvec[this.pi[i]]).normalize());
      if (i == 0) {
        b_beta_sum = this.bvec[i].mul(this.betas[i]);
      } else {
        b_beta_sum.addM(this.bvec[i].mul(this.betas[i]));
      }
    }
    this.tau = b_beta_sum.sub(this.tau_naught).normalize();
  }

  ega6() {
    var R_vec = [];
    var S_vec = [];
    for (var i = 0; i < this.inputs.length; i++) {
      R_vec.push(this.g.mult(this.rvec[i]));
      S_vec.push(this.g.mult(this.svec[i]));
    }
    // ssa_obj = new ssa(R_vec, S_vec, this.g, this.Gamma);
    // this.ssa_ver = ssa_obj.execute();
    this.ssa_ver = true;
  }

  ega7() {
    this.phi1;
    this.phi2;
    var i;
    for (i = 0; i < this.inputs.length; i++) {
      var pi_neg = (new sjcl.bn(0)).subM(this.pvec[i]).normalize();
      if (i == 0) {
        this.phi1 = this.outputs[i][0].mult(this.sigma_vec[i]).toJac().add(this.inputs[i][0].mult(pi_neg));
        this.phi2 = this.outputs[i][1].mult(this.sigma_vec[i]).toJac().add(this.inputs[i][1].mult(pi_neg));
      } else {
        this.phi1 = this.phi1.add(this.outputs[i][0].mult(this.sigma_vec[i]).toJac().add(this.inputs[i][0].mult(pi_neg)));
        this.phi2 = this.phi2.add(this.outputs[i][1].mult(this.sigma_vec[i]).toJac().add(this.inputs[i][1].mult(pi_neg)));
      }
    }
    console.log("Generating verification.");
    for (i = 0; i < this.inputs.length; i++) {
      console.log(pointEquality(this.Gamma.mult(this.sigma_vec[i]), this.Wvec[i].toJac().add(this.Dvec[i]).toAffine()));
    }
    console.log(pointEquality(this.Lambda1.add(this.g.mult(this.tau)).toAffine(), this.phi1.toAffine()));
    console.log(pointEquality(this.Lambda2.add(this.h.mult(this.tau)).toAffine(), this.phi2.toAffine()));
  }
}
var ega_obj = new ega(encryptions, reencryptions, pi, curve.G, pub, betas);
ega_obj.ega1();
ega_obj.ega2();
ega_obj.ega3();
ega_obj.ega4();
ega_obj.ega5();
ega_obj.ega6();
ega_obj.ega7();

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
// abiDecoder.addABI(abi);
// // call abiDecoder.decodeMethod to use this - see 'getAllFunctionCalls' for more

// // Reads in the ABI
// var MixNetworkContractSpec = web3.eth.contract(abi);

// // This is the address of the contract you want to connect to; copy this from Remix
// var contractAddress = '0x06e5e8750e8d44015bbe45ba8dd22ab01535d36f';

// var MixNetwork = MixNetworkContractSpec.at(contractAddress)
// var myContract = web3.eth.contract(abi);
// var contractInstance = myContract.at(contractAddress);


// class ssa {
//   constructor(_X, _Y) {
//     this.X = _X;
//     this.Y = _Y;
//     // Generates two random large primes (4096 bits)
//     this.p = 809;
//     this.q = 808;
//     // $.ajax({
//     //   url: '/forgeKeyPair',
//     //   type: 'GET',
//     //   async: false,
//     //   success: function (response) {
//     //     this.p = response.p;
//     //     this.q = response.q;
//     //     console.log(response);
//     //   }
//     // });
//     this.G = getRandomInt(this.p);
//     this.Gamma = getRandomInt(this.p);
//     this.gamma = Math.log(this.Gamma) / Math.log(this.G);
//   }

//   ssa1() {
//     var ran = sjcl.bn.random(curve.r, 0);
//     this.t = contractInstance.ssa1.call().toNumber() % this.q;
//   }

//   ssa2() {
//     var gammaT = this.gamma * this.t;
//     $.ajax({
//       url: '/ssa2',
//       type: 'POST',
//       contentType: 'application/json',
//       async: false,
//       data: JSON.stringify({
//         "gammaT": gammaT, "X": this.X, "Y": this.Y, "t": this.t,
//         "p": this.p, "G": this.G, "gamma": this.gamma
//       }),
//       success: function (response) {
//         console.log("RESP", response);
//       }
//     });
//   }

//   ssa3() {
//     this.c = contractInstance.ssa3.call().toNumber() % this.q; // Call smart contract
//   }

//   ssa4() {
//     var alphas = [];
//     for (var i = 1; i <= this.X.length; i++) {
//       var piSum = 1;
//       for (var j = 0; j < i; j++) {
//         piSum *= this.X[j] / this.Y[j];
//       }
//       alphas.push(this.thetas[i - 1] + this.c * piSum);
//     }
//     for (i = this.X.length + 1; i <= (2 * this.X.length) - 1; i++) {
//       alphas.push(this.c * Math.pow(this.gamma, i - (2 * this.X.length)));
//     }
//     this.alphas = alphas;
//   }

//   ssa5() {
//     var U = this.G ** (-1 * this.t);
//     var W = this.G && (-1 * this.gamma * this.t);
//     $.ajax({
//       url: '/ssa5',
//       type: 'POST',
//       contentType: 'application/json',
//       async: false,
//       data: JSON.stringify({ "U": U, "W": W, "X": this.X, "Y": this.Y, "c": this.c, "alphas": [1, 1, 1], "Gamma": this.Gamma, "G": this.G }),//this.alphas }),
//       success: function (response) {
//         console.log("RESP", response);
//         console.log("THeta", this.Thetas);
//       }
//     });
//     // var xhat = [];
//     // var yhat = [];
//     // for (var i = 0; i < this.X.length; i++) {
//     //   this.X[i].a.multiply(U);
//     //   this.X[i].b.multiply(U);
//     //   xhat.push(this.X[i]);
//     //   this.Y[i].a.multiply(W);
//     //   this.Y[i].b.multiply(W);
//     //   yhat.push(this.Y[i]);
//     // }
//     // var xyhats = [];
//     // console.log("XHat", xhat);


//     // Call smart contract verify,
//     // Verify (this.G, this.Gamma, this.gamma, this.X, this.Y, this.Thetas, this.alphas);
//   }
// }

// function mix() {
//   var inputs = [];
//   var outputs = [];
//   var betas = [];
//   // Keys for second round encryption
//   for (var i = 0; i < sampleVotes.length; i++) {
//     betas.push(getRandomInt(827));
//   }
//   // Setup inputs to proper format (elgamal encrypted)
//   for (var i = 0; i < sampleVotes.length; i++) {
//     var vote = sampleVotes[i];//contractInstance.get_vote_i(i);
//     $.ajax({
//       url: '/encrypt',
//       type: 'POST',
//       contentType: 'application/json',
//       async: false,
//       data: JSON.stringify({ "vote": vote }),
//       success: function (response) {
//         inputs.push(response);
//       }
//     });
//   }

//   // Second round encryption (EGA proof), specifying beta key
//   for (i = 0; i < sampleVotes.length; i++) {
//     var vote = inputs[i];
//     $.ajax({
//       url: '/encryptKey',
//       type: 'POST',
//       contentType: 'application/json',
//       async: false,
//       data: JSON.stringify({ "vote": vote, "b": betas[i] }),
//       success: function (response) {
//         outputs.push(response);
//       }
//     })
//   }

//   // Generate a shuffle
//   var indices = Array.apply(null, { length: inputs.length }).map(Function.call, Number);
//   var pi = shuffle(indices);

//   // Shuffle outputs
//   var shuffled_outputs = [sampleVotes.length];
//   for (i = 0; i < sampleVotes.length; i++) {
//     // Set shuffled index to regular index of output
//     shuffled_outputs[pi[i]] = outputs[i];
//   }

//   // var ssa_obj = new ssa(votes, shuffled_votes);
//   // ssa_obj.ssa1();
//   // ssa_obj.ssa2();
//   // ssa_obj.ssa3();
//   // ssa_obj.ssa4();
//   // console.log("here");
//   // ssa_obj.ssa5();

//   $.ajax({
//     url: '/ega_init',
//     type: 'POST',
//     contentType: 'application/json',
//     async: false,
//     data: JSON.stringify({ "inputs": inputs, "outputs": outputs, "pi": pi, "betas": betas }),
//     success: function (response) {
//       console.log(response);
//     }
//   });
//   // ega_obj.ega1();
//   // ega_obj.ega2();
//   // ega_obj.ega3();
//   // ega_obj.ega4();
//   // ega_obj.ega5();
//   // ega_obj.ega7();
//   // for (var vote in votes) {
//   //   contractInstance2.vote.sendTransaction(vote, { gas: 3000000 });
//   // }
// }
// mix();

// function getRandomInt(max) {
//   return Math.floor(Math.random() * Math.floor(max));
// }



