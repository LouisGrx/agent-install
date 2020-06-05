const {encodeCallScript} = require('@aragon/test-helpers/evmScript');
const {encodeActCall, execAppMethod} = require('@aragon/toolkit');
const ethers = require('ethers');
const utils = require('ethers/utils');
const {keccak256} = require('web3-utils');
const {RLP} = utils;

const { dao, acl, voting, network } = require('../config.json')
const provider = ethers.getDefaultProvider(network);
const env = network;


// new apps
const agentAppId = '0x9ac98dc5f995bf0211ed589ef022719d1487e5cb2bab505676f0d084c07cf89a';
const agentBase = '0xd3bbC93Dbc98128fAC514Be911e285102B931b5e';
let agent;

// signatures
const newAppInstanceSignature = 'newAppInstance(bytes32,address,bytes,bool)';
const createPermissionSignature = 'createPermission(address,address,bytes32,address)';
const agentInitSignature = 'initialize()';


// functions for counterfactual addresses
async function buildNonceForAddress(_address, _index, _provider) {
    const txCount = await _provider.getTransactionCount(_address);
    return `0x${(txCount + _index).toString(16)}`;
}

async function calculateNewProxyAddress(_daoAddress, _nonce) {
    const rlpEncoded = RLP.encode([_daoAddress, _nonce]);
    const contractAddressLong = keccak256(rlpEncoded);
    const contractAddress = `0x${contractAddressLong.substr(-40)}`;

    return contractAddress;
}

async function firstTx() {
    // counterfactual addresses
    const nonce1 = await buildNonceForAddress(dao, 0, provider);
    const newAddress1 = await calculateNewProxyAddress(dao, nonce1);
    agent = newAddress1;

    // app initialisation payloads
    const agentInitPayload = await encodeActCall(agentInitSignature, []);

    // package first transaction
    const calldatum = await Promise.all([
        encodeActCall(newAppInstanceSignature, [
            agentAppId,
            agentBase,
            agentInitPayload,
            true,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            agent,
            keccak256('TRANSFER_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            agent,
            keccak256('EXECUTE_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            agent,
            keccak256('SAFE_EXECUTE_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            agent,
            keccak256('ADD_PROTECTED_TOKEN_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            agent,
            keccak256('REMOVE_PROTECTED_TOKEN_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            agent,
            keccak256('ADD_PRESIGNED_HASH_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            agent,
            keccak256('DESIGNATE_SIGNER_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            agent,
            keccak256('RUN_SCRIPT_ROLE'),
            voting,
        ]),
    ]);

    const actions = [
        {
            to: dao,
            calldata: calldatum[0],
        },
        {
            to: acl,
            calldata: calldatum[1],
        },
        {
            to: acl,
            calldata: calldatum[2],
        },
        {
            to: acl,
            calldata: calldatum[3],
        },
        {
            to: acl,
            calldata: calldatum[4],
        },
        {
            to: acl,
            calldata: calldatum[5],
        },
        {
            to: acl,
            calldata: calldatum[6],
        },
        {
            to: acl,
            calldata: calldatum[7],
        },
        {
            to: acl,
            calldata: calldatum[8],
        }
    ];
    const script = encodeCallScript(actions);

    const tx = await execAppMethod(
        dao,
        voting,
        'newVote',
        [
            script,
            `
            1. install Agent 
            2. grant Voting SAFE_EXECUTE_ROLE on Agent setting Voting as manager
            3. grant Voting ADD_PROTECTED_TOKEN_ROLE on Agent setting Voting as manager
            4. grant Voting REMOVE_PROTECTED_TOKEN_ROLE on Agent setting Voting as manager
            5. grant Voting ADD_PRESIGNED_HASH_ROLE on Agent setting Voting as manager
            6. grant Voting DESIGNATE_SIGNER_ROLE on Agent setting Voting as manager
            7. grant Voting RUN_SCRIPT_ROLE on Agent setting Voting as manager
            `,
        ],
        env,
    )
    console.log('\n================================================================================')
    console.log(`from:     ${tx.transactionPath.from}`)
    console.log(`to:       ${tx.transactionPath.to}`)
    console.log(`Tx Hash:  ${tx.receipt.transactionHash}`)
    console.log('================================================================================\n')
    console.log(`${tx.transactionPath.description}\n`)
}

const main = async () => {
    console.log('Sending Transaction');
    await firstTx();
};

main()
    .then(() => {
        console.log(`https://${env}.aragon.org/#/${dao}/${voting}`);
        process.exit();
    })
    .catch((e) => {
        console.error(e);
        process.exit();
    });
