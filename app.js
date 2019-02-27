const ElGamal = require('elgamal').default;
var BigInteger = require('jsbn').BigInteger;
var express = require('express')
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var forge = require('node-forge');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
var eg;
var ega_instance;

class EncryptedValue {
  /**
   * @type BigInt
   * @memberof EncryptedValue
  //  */
  // a;

  // /**
  //  * @type BigInt
  //  * @memberof EncryptedValue
  //  */
  // b;

  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  /**
   * Performs homomorphic multiplication of the current and the given value.
   * @param {EncryptedValue} encryptedValue Value to multiply the current value
   * with.
   * @returns {EncryptedValue}
   */
  multiply(encryptedValue) {
    return new EncryptedValue(
      this.a.multiply(encryptedValue.a),
      this.b.multiply(encryptedValue.b)
    );
  }
}

app.use(express.static(__dirname));


app.get('/favicon.ico', (req, res) => res.sendStatus(204));

app.post('/decrypt', async function (req, res) {
  var voteHash = req.body.voteHash;
  var parsed = JSON.parse(voteHash);
  console.log("Parsed", parsed);
  var encryptedValHash = createEncryptedValue(parsed);
  console.log("Votehas", encryptedValHash);
  const decrypted = await eg.decryptAsync(encryptedValHash);
  console.log("Decrypt", decrypted);
  res.send(decrypted.toString());
});

function createEncryptedValue(parsed) {
  var emptyA = new BigInteger(null);
  var emptyB = new BigInteger(null);
  for (var key in parsed.a) {
    emptyA[key] = parsed.a[key];
  }
  for (var key in parsed.b) {
    emptyB[key] = parsed.b[key];
  }
  parsed.a = emptyA;
  parsed.b = emptyB;
  return new EncryptedValue(parsed.a, parsed.b);
}

function parseBigInt(parsed) {
  var empty = new BigInteger(null);
  for (var key in parsed) {
    empty[key] = parsed[key];
  }
  return empty;
}

app.post('/encrypt', async function (req, res) {
  var vote = req.body.vote;
  const encrypted = await eg.encryptAsync(vote);
  res.send(encrypted);
  //res.send(JSON.stringify(encrypted));
})

// Needs verification on reencryption using .toString()
app.post('/encryptKey', async function (req, res) {
  var vote = req.body.vote;
  var b = req.body.b;
  var encryptedValue = createEncryptedValue(vote);
  const encrypted = await eg.encryptAsync(encryptedValue.toString(), b);
  res.send(encrypted);
})

app.get('/forgeKeyPair', function (req, res) {
  var keyPair = forge.pki.rsa.generateKeyPair(4096);
  var resobj = {};
  resobj.p = keyPair.privateKey.p;
  resobj.q = keyPair.privateKey.q;
  res.send(resobj);
})

class ega {
  constructor(_inputs, _outputs, _pi, _betas) {
    this.inputs = _inputs;
    this.outputs = _outputs;
    this.pi = _pi;
    this.betas = _betas;
    this.k = this.inputs.length;
    this.p = 827;
    this.q = 823;
    // Perhaps use crypto.generateRandom();
    // var keyPair = forge.pki.rsa.generateKeyPair(4096);
    // this.p = keyPair.privateKey.p;
    // this.q = keyPair.privateKey.q;
    // var keyPair2 = forge.pki.rsa.generateKeyPair(4096);
    // this.g = keyPair.privateKey.p;
    // this.h = keyPair.privateKey.q;
    this.g = 809;
    this.h = 808;
    this.gamma = getRandomInt(this.q);
    this.X = [this.k];
    this.Xbar = [this.k];
    this.Y = [this.k];
    this.Ybar = [this.k];
    for (var i = 0; i < this.k; i++) {
      this.X[i] = this.inputs[i].a;
      this.Y[i] = this.inputs[i].b;
      this.Xbar[i] = this.outputs[i].a;
      this.Ybar[i] = this.outputs[i].b;
    }
  }

  ega1() {
    var _uvec = [];
    var _wvec = [];
    var _avec = [];
    this.taunaught = getRandomInt(this.q);
    var piinverse = this.pi.slice().reverse();
    for (var i = 1; i <= this.k; i++) {
      _uvec.push(getRandomInt(this.q));
      _wvec.push(getRandomInt(this.q));
      _avec.push(getRandomInt(this.q));
    }
    this.uvec = _uvec;
    this.wvec = _wvec;
    this.avec = _avec;
    var _Avec = [];
    var _Cvec = [];
    var _Uvec = [];
    var _Wvec = [];
    var _lambda1 = BigInteger.ONE;
    var _lambda2 = BigInteger.ONE;
    var wbeta = 0.;
    // Update exponentials
    for (i = 0; i < this.k; i++) {
      var a = new BigInteger(this.g.toString());
      bigIntPowInt(a, this.avec[i]);
      _Avec.push(a);
      var c = new BigInteger(this.g.toString());
      bigIntPowInt(c, this.gamma * this.avec[this.pi[i]]);
      _Cvec.push(c);
      var u = new BigInteger(this.g.toString());
      bigIntPowInt(u, this.uvec[i]);
      u.multiply(u);
      _Uvec.push(u);
      var w = new BigInteger(this.g.toString());
      bigIntPowInt(w, this.gamma * this.wvec[i]);
      _Wvec.push(w);
      this.X[i] = parseBigInt(this.X[i]);
      bigIntPowIntNeg(this.X[i], Math.abs(this.wvec[piinverse[i]] - this.uvec[i]));
      this.X[i].multiply(_lambda1);
      _lambda1 = this.X[i];
      this.Y[i] = parseBigInt(this.Y[i]);
      bigIntPowIntNeg(this.Y[i], Math.abs(this.wvec[piinverse[i]] - this.uvec[i]));
      this.Y[i].multiply(_lambda2);
      _lambda2 = this.Y[i];
      wbeta += this.wvec[i] * this.betas[this.pi[i]];
    }
    this.Uvec = _Uvec;
    this.Wvec = _Wvec;
    _lambda1.multiply(new BigInteger(Math.pow(this.g, this.taunaught + wbeta).toString()));
    _lambda2.multiply(new BigInteger(Math.pow(this.h, this.taunaught + wbeta).toString()));
    this.lambda1 = _lambda1;
    this.lambda2 = _lambda2;
  }

  // How to generate array of randoms on blockchain?
  ega2() {
    // var seed = contractInstance.ega2.call().toNumber();
    var _pvec = [];
    var Betas = [];
    for (var i = 0; i < this.k; i++) {
      var pi = getRandomInt(this.p);
      _pvec.push(pi);
      var num = new BigInteger(Math.pow(this.g, pi).toString());
      Betas.push(num.divide(this.Uvec[i]));
      // Betas.push(Math.pow(this.g, pi) / this.Uvec[i]);
    }
    this.pvec = _pvec;
    // Send Betas to contract
  }

  ega3() {
    var bvec = [];
    var dvec = [];
    var _Dvec = [];
    for (var i = 0; i < this.k; i++) {
      bvec.push(this.pvec[i] - this.uvec[i]);
    }
    // Update exponentials
    for (i = 0; i < this.k; i++) {
      dvec.push(this.gamma * bvec[this.pi[i]]);
      var D = new BigInteger(this.g.toString());
      bigIntPowInt(D, dvec[i]);
      _Dvec.push(D);
      // _Dvec.push(Math.pow(this.g, dvec[i]));
    }
    this.bvec = bvec;
    this.dvec = dvec;
    this.Dvec = _Dvec;
  }

  ega4() {
    this.lambda = getRandomInt(this.q);
    // this.lambda = contractInstance.ega4.call().toNumber() % this.q;
  }

  ega5() {
    var rvec = [];
    var svec = [];
    var sigmas = [];
    // console.log("ega5");
    // console.log(this.wvec);
    // console.log(this.bvec);
    // console.log(this.bvec[this.pi[0]], this.bvec[this.pi[1]]);
    // console.log(this.wvec[0] + this.bvec)
    for (var i = 0; i < this.avec.length; i++) {
      rvec.push(this.avec[i] + this.lambda * this.bvec[i]);
    }
    var bBeta = 0.;
    for (i = 0; i < this.avec.length; i++) {
      svec.push(this.gamma * rvec[this.pi[i]]);
      sigmas.push(this.wvec[i] + this.bvec[this.pi[i]]);
      bBeta += this.bvec[i] * this.betas[i];
    }
    this.sigmas = sigmas;
    this.tau = -1 * this.taunaught + bBeta;
  }

  ega6() {
    // Execute SSA
  }

  ega7() {
    var Gamma = new BigInteger(this.g.toString());
    Gamma = bigIntPowInt(Gamma, this.gamma);
    var phi1 = 1;
    var phi2 = 1;
    for (var i = 0; i < this.X.length; i++) {
      this.Xbar[i] = parseBigInt(this.Xbar[i]);
      this.X[i] = parseBigInt(this.X[i]);
      this.Y[i] = parseBigInt(this.Y[i]);
      this.Ybar[i] = parseBigInt(this.Ybar[i]);
      bigIntPowInt(this.Xbar[i], this.sigmas[i]);
      this.X[i] = bigIntPowIntNeg(this.X[i], this.pvec[i]);
      phi1 *= this.Xbar[i].multiply(this.X[i]);
      bigIntPowInt(this.Ybar[i], this.sigmas[i]);
      this.Y[i] = bigIntPowIntNeg(this.Y[i], this.pvec[i]);
      phi2 *= this.Ybar[i].multiply(this.Y[i]);
    }
    // Verify
    var verified = true;
    for (i = 0; i < this.X.length; i++) {
      bigIntPowInt(Gamma, this.sigmas[i]);
      console.log("LHS", Gamma);
      console.log("RHS", this.Wvec[i], this.Dvec[i], this.Wvec[i] * this.Dvec[i]);
      if (Gamma.equals(this.Wvec[i].multiply(this.Dvec[i]))) verified = false;
      // if (Math.pow(Gamma, this.sigmas[i]) != (this.Wvec[i] * this.Dvec[i])) verified = false;
    }
    // Verify on contract
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

app.post('/ega_init', function (req, res) {
  var inputs = req.body.inputs;
  var outputs = req.body.outputs;
  var pi = req.body.pi;
  var betas = req.body.betas;
  ega_instance = new ega(inputs, outputs, pi, betas);
  ega_instance.ega1();
  ega_instance.ega2();
  ega_instance.ega3();
  ega_instance.ega4();
  ega_instance.ega5();
  ega_instance.ega7();
});

app.post('/ega1', function (req, res) {
  ega_instance.ega1();
});

app.post('/ega2', function (req, res) {
  ega_instance.ega2();
});
app.post('/ega3', function (req, res) {
  ega_instance.ega3();
});
app.post('/ega4', function (req, res) {
  ega_instance.ega4();
});
app.post('/ega5', function (req, res) {
  ega_instance.ega5();
});
app.post('/ega6', function (req, res) {
  ega_instance.ega6();
});
app.post('/ega7', function (req, res) {
  ega_instance.ega7();
});

app.post('/ssa2', function (req, res) {
  var X = req.body.X;
  var Y = req.body.Y;
  var G = req.body.G;
  var gamma = req.body.gamma;
  var t = req.body.t;
  var gammaT = req.body.gammaT;
  var p = req.body.p;

  var xhat = [];
  var yhat = [];
  var tbig = new BigInteger(t.toString());
  var gammaTbig = new BigInteger(gammaT.toString());
  for (var i = 0; i < X.length; i++) {
    var xholder = X[i];
    var yholder = Y[i];
    xhat.push(xholder.subtract(tbig));
    yhat.push(yholder.subtract(gammaTbig));
  }
  var thetas = [];
  for (i = 0; i < (2 * X.length) - 1; i++) {
    thetas.push(getRandomInt(p));
  }

  var Thetas = [];
  Thetas.push(Math.pow(G, -(thetas[0] * Y[0])));
  for (i = 0; i < X.length - 1; i++) {
    Thetas.push(Math.pow(G, (thetas[i] * X[i + 1] - thetas[i + 1] * Y[i + 1])));
  }
  for (i = 0; i < X.length - 1; i++) {
    Thetas.push(Math.pow(G, gamma * thetas[i + X.length - 1] - thetas[i + X.length]));
  }
  Thetas.push(Math.pow(G, gamma * thetas[2 * X.length - 1]));
  this.thetas = thetas;
  console.log("ETHAS", Thetas);
  this.Thetas = Thetas;
})

app.post('/ssa5', function (req, res) {
  var U = new BigInteger(req.body.U.toString());
  var W = new BigInteger(req.body.W.toString());
  var X = req.body.X;
  var Y = req.body.Y;
  var c = req.body.c;
  var alphas = req.body.alphas;
  var Gamma = req.body.Gamma;
  var G = req.body.G;
  for (var i = 0; i < X.length; i++) {
    createEncryptedValue(X[i]);
    createEncryptedValue(Y[i]);
    EVMult(X[i], U);
    EVMult(Y[i], W);
  }
  var xybar = [];
  bigIntPow(X[0], c);
  bigIntPow(Y[0], -1 * alphas[0]);
  EVMultEV(X[0], Y[0]);
  xybar.push(X[0]);
  for (i = 1; i < X.length; i++) {
    bigIntPow(X[i], alphas[i - 1]);
    bigIntPow(Y[i], -1 * alphas[i]);
    EVMultEV(X[i], Y[i]);
    xybar.push(X[i]);
  }
  for (i = X.length; i < (2 * X.length) - 2; i++) {
    var v1 = Math.pow(Gamma, alphas[i]);
    var v2 = Math.pow(G, -1 * alphas[i + 1]);
    xybar.push(v1 * v2);
  }
  var lastv1 = Math.pow(Gamma, alphas[(2 * X.length) - 2]);
  var lastv2 = Math.pow(G, -1 * c);
  xybar.push(lastv1 * lastv2);
  res.send(xybar);
})

app.post('/ega7', function (req, res) {
  var X = req.body.X;
  var Xbar = req.body.Xbar;
  var Y = req.body.Y;
  var Ybar = req.body.Ybar;
  var sigmas = req.body.sigmas;
  var pis = req.body.pis;
  var gamma = req.body.gamma;
  var Ws = req.body.Ws;
  var Ds = req.body.Ds;
  var g = req.body.g;
  var h = req.body.h;
  var tau = req.body.tau;
  var lambda1 = req.body.lambda1;
  var lambda2 = req.body.lambda2;

  var Gamma = new BigInteger(g.toString());
  bigIntPowInt(Gamma, gamma);


  var phi1 = 1;
  var phi2 = 1;
  // console.log(X, Xbar, Y, Ybar, sigmas);
  console.log(pis, Gamma, Ws, Ds);
  createEncryptedValue(X[0]);
  // console.log(Xbar[0]);
  for (var i = 0; i < X.length; i++) {
    Xbar[i] = parseBigInt(Xbar[i]);
    X[i] = parseBigInt(X[i]);
    Y[i] = parseBigInt(Y[i]);
    Ybar[i] = parseBigInt(Ybar[i]);
    bigIntPowInt(Xbar[i], sigmas[i]);
    X[i] = bigIntPowIntNeg(X[i], pis[i]);
    phi1 *= Xbar[i].multiply(X[i]);
    bigIntPowInt(Ybar[i], sigmas[i]);
    Y[i] = bigIntPowIntNeg(Y[i], pis[i]);
    phi2 *= Ybar[i].multiply(Y[i]);
  }
  // Verify
  var verified = true;
  for (i = 0; i < X.length; i++) {
    console.log("LHS", Math.pow(Gamma, sigmas[i]));
    console.log("RHS", Ws[i], Ds[i], Ws[i] * Ds[i]);
    if (Math.pow(Gamma, sigmas[i]) != (Ws[i] * Ds[i])) verified = false;
  }
})

function EVMult(bigInt, mult) {
  bigInt.a.multiply(mult);
  bigInt.b.multiply(mult);
}

function EVSub(EV, bigint) {
  bigint1.a.subtract(bigint);
  bigint
}

function EVMultEV(bigint1, bigint2) {
  bigint1.a.multiply(bigint2.a);
  bigint2.a.multiply(bigint2.b);
}

function bigIntPowInt(bigint, powInt) {
  for (var i = 1; i < powInt; i++) {
    bigint.multiply(bigint);
  }
  return bigint;
}

function bigIntPowIntNeg(bigint, powInt) {
  for (var i = 1; i < powInt; i++) {
    bigint.multiply(bigint);
  }
  return BigInteger.ONE.divide(bigint);
}

function bigIntPow(bigint, pow) {
  for (var i = 1; i < pow; i++) {
    EVMultEV(bigint, bigint);
  }
}


app.listen(8080, async function () {
  eg = await ElGamal.generateAsync();
});

console.log('Listening at: localhost:8080');

async function test() {
  // console.log(ElGamal.default)
  const eg = await ElGamal.generateAsync(); // Recommended way of initialization

  const secret = 'The quick brown fox jumps over the lazy dog';
  const encrypted = await eg.encryptAsync(secret);
  const secret2 = "The slow apollo is cute";
  const encrypted2 = await eg.encryptAsync(secret2);
  const decrypted = await eg.decryptAsync(encrypted2);
  console.log(decrypted.toString() === secret); // true
  console.log(decrypted.toString());
}
// test()