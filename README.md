# Elgamal_Shuffles
## [Under Construction]
Implementation of Neff's shuffling scheme for Elgamal Pairs. [1]

## Outline
Given input from hidden sources (votes, UTXOs, etc.), send through multiple rounds of "mixing" where mixing entails re-encryption of the ElGamal ciphertexts, as well as random shuffling of the inputs. Each round of shuffling produces a proof of a valid shuffle, using Neff's shuffling scheme [1], which can then be verified by a 3rd party. Valid shuffling here is described as validly re-encrypting the given ciphertexts and shuffling their order, such that the original inputs have not been changed, simply re-ordered and encrypted. 

In this Ethereum-specific use case, inputs will be generated and intitially encrypted off-chain and then submitted to the mixing contract. For every round of mixing, an off-chain client (.js) will re-encrypt and shuffle this set of ciphertexts, producing a proof of valid re-encryption and shuffling. This off-chain client will then submit this new shuffled set of ciphertexts, as well as the proof to the contract. If the contract successfully verifies the proof, the contract will update its current set of ciphertexts, indicating another successful round of mixing. In the end, a user can decrypt the current round of mixing to see the inputs, without being able to tie a specific input to any given user. 

## Problems to figure out
* Original encryption from input to ciphertext requires a mapping from input form to Eliptic curve element. This will likely require more research into sources like [2], but for now inputs will begin as Eliptic curve points, which will then be encrypted and mixed, and hopefully can verifiably be decrypted later.
* SJCL provides functions to generate ElGamal keys, as well as an `encrypt` function. However, this `encrypt` function is using Key encapsulation where the large asymmetric key system for ElGamal is simply used to derive a symmetric key for AES encryption. My understanding is that for Neff's encryption scheme I will need to perform ElGamal encryption directly on the data. This is simple enough, but will mean I need to define my own `encrypt` function to fit my needs. I'm hoping (and it seems likely) that this can be done without changing SJCL, but if needed I will have to fork SJCL to fit my needs. 
* Another unsolved question (thus far) is how to manage public/private keys so that the ciphertexts can still be decrypted at the end. This seems to be possible using one key pair (with a specific re-encryption algorithm), but requires finer research. 

## Dependencies
* sjcl - Stanford Javascript Crypto Library

## References
[1] http://courses.csail.mit.edu/6.897/spring04/Neff-2004-04-21-ElGamalShuffles.pdf
