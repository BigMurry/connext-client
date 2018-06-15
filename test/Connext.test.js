const assert = require('assert')
const Connext = require('../src/Connext')
const moxios = require('moxios')
const { createFakeWeb3 } = require('./Helpers')
const sinon = require('sinon')
const MerkleTree = require('../helpers/MerkleTree')
const Utils = require('../helpers/utils')
const Web3 = require('web3')
const artifacts = require('../artifacts/Ledger.json')
const { initWeb3, getWeb3 } = require('../web3')

let web3 = { currentProvider: 'mock' }
let partyA
let partyB
let ingridAddress
let contractAddress
let watcherUrl
let ingridUrl

describe('Connext', async () => {
  describe('client init', () => {
    it('should create a connext client with a fake version of web3', async () => {
      const client = new Connext({ web3 }, createFakeWeb3())
      assert.ok(typeof client === 'object')
    })
    it('should create a connect client with real web3', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      assert.ok(typeof client === 'object')
    })
  })

  describe('recoverSignerFromVCStateUpdate', () => {
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('validators', () => {
      it('does throw an error when param is null', async () => {
        try {
          Connext.recoverSignerFromVCStateUpdate({
            sig: '0xc1912',
            vcId: '0xc1912',
            nonce: 100,
            partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
            partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
            partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
            subchanAI: '0xc1912',
            subchanBI: '0xc1912',
            balanceA: Web3.utils.toBN('100'),
            balanceB: null
          })
        } catch (e) {
          assert.equal(
            e.message,
            `[recoverSignerFromVCStateUpdate][balanceB] : can\'t be blank,null is not BN.`
          )
        }
      })
    })
    describe('recoverSignerFromVCStateUpdate', () => {
      describe('throws an error when validator fails', () => {
        describe('Null or undefined', () => {
          it('does throw an error when param is undefined', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: '0xc1912',
                balanceA: Web3.utils.toBN('0'),
                balanceB: undefined
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][balanceB] : can\'t be blank,undefined is not BN.`
              )
            }
          })
          it('does throw an error when param is null', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: '0xc1912',
                balanceA: Web3.utils.toBN('100'),
                balanceB: null
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][balanceB] : can\'t be blank,null is not BN.`
              )
            }
          })
        })

        describe('vcId', () => {
          it('throws an error when vcId is not a hex String', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: 'bad VC ID'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][vcId] : bad VC ID is not hex string prefixed with 0x.`
              )
            }
          })
          it('does not throw a vcId error when vcId is a valid hex', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912'
              })
            } catch (e) {
              assert.notEqual(
                e.message,
                `[recoverSignerFromVCStateUpdate][vcId] : bad VC ID is not hex string prefixed with 0x.'`
              )
            }
          })
        })
        describe('nonce', () => {
          it('does throw an error when nonce is not postive int', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: '100aa'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][nonce] : 100aa is not a positive integer.`
              )
            }
          })
        })
        describe('partyA', () => {
          it('does throw an error when partyA is not an address', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: 'its a party'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][partyA] : its a party is not address.`
              )
            }
          })
        })
        describe('partyB', () => {
          it('does throw an error when partyB is not an address', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: 'cardi B party B'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][partyB] : cardi B party B is not address.`
              )
            }
          })
        })
        describe('partyI', () => {
          it('does throw an error when partyI is not an address', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: 'cardi I party i'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][partyI] : cardi I party i is not address.`
              )
            }
          })
        })
        describe('subchanAI', () => {
          it('does throw an error when subchanAI is not a strict hex', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: 'I am ai'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][subchanAI] : I am ai is not hex string prefixed with 0x.`
              )
            }
          })
        })
        describe('subchanBI', () => {
          it('does throw an error when subchanBI is not a strict hex', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: 'invalid'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][subchanBI] : invalid is not hex string prefixed with 0x.`
              )
            }
          })
        })
        describe('balanceA', () => {
          it('does throw an error when subchanBI is not a strict hex', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: '0xc1912',
                balanceA: 'cow'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][balanceA] : cow is not BN.`
              )
            }
          })
        })
        describe('balanceB', () => {
          it('does throw an error when subchanBI is not a strict hex', async () => {
            try {
              Connext.recoverSignerFromVCStateUpdate({
                sig: '0xc1912',
                vcId: '0xc1912',
                nonce: 100,
                partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                subchanAI: '0xc1912',
                subchanBI: '0xc1912',
                balanceA: Web3.utils.toBN('100'),
                balanceB: '7 cats'
              })
            } catch (e) {
              assert.equal(
                e.message,
                `[recoverSignerFromVCStateUpdate][balanceB] : 7 cats is not BN.`
              )
            }
          })
        })
      })
    })
  })

  describe('createVCStateUpdateFingerprint', () => {
    describe('throws an error when validator fails', () => {
      describe('Null or undefined', () => {
        it('does throw an error when param is undefined', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: '0xc1912',
              subchanBI: '0xc1912',
              balanceA: Web3.utils.toBN('0'),
              balanceB: undefined
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][balanceB] : can\'t be blank,undefined is not BN.`
            )
          }
        })
        it('does throw an error when param is null', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: '0xc1912',
              subchanBI: '0xc1912',
              balanceA: Web3.utils.toBN('100'),
              balanceB: null
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][balanceB] : can\'t be blank,null is not BN.`
            )
          }
        })
      })

      describe('vcId', () => {
        it('throws an error when vcId is not a hex String', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({ vcId: 'bad VC ID' })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][vcId] : bad VC ID is not hex string prefixed with 0x.`
            )
          }
        })
        it('does not throw a vcId error when vcId is a valid hex', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({ vcId: '0xc1912' })
          } catch (e) {
            assert.notEqual(
              e.message,
              `[createVCStateUpdateFingerprint][vcId] : bad VC ID is not hex string prefixed with 0x.'`
            )
          }
        })
      })
      describe('nonce', () => {
        it('does throw an error when nonce is not postive int', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: '100aa'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][nonce] : 100aa is not a positive integer.`
            )
          }
        })
      })
      describe('partyA', () => {
        it('does throw an error when partyA is not an address', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: 'its a party'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][partyA] : its a party is not address.`
            )
          }
        })
      })
      describe('partyB', () => {
        it('does throw an error when partyB is not an address', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: 'cardi B party B'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][partyB] : cardi B party B is not address.`
            )
          }
        })
      })
      describe('partyI', () => {
        it('does throw an error when partyI is not an address', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: 'cardi I party i'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][partyI] : cardi I party i is not address.`
            )
          }
        })
      })
      describe('subchanAI', () => {
        it('does throw an error when subchanAI is not a strict hex', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: 'I am ai'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][subchanAI] : I am ai is not hex string prefixed with 0x.`
            )
          }
        })
      })
      describe('subchanBI', () => {
        it('does throw an error when subchanBI is not a strict hex', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: '0xc1912',
              subchanBI: 'invalid'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][subchanBI] : invalid is not hex string prefixed with 0x.`
            )
          }
        })
      })
      describe('balanceA', () => {
        it('does throw an error when subchanBI is not a strict hex', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: '0xc1912',
              subchanBI: '0xc1912',
              balanceA: 'cow'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][balanceA] : cow is not BN.`
            )
          }
        })
      })
      describe('balanceB', () => {
        it('does throw an error when subchanBI is not a strict hex', async () => {
          try {
            Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 100,
              partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
              subchanAI: '0xc1912',
              subchanBI: '0xc1912',
              balanceA: Web3.utils.toBN('100'),
              balanceB: '7 cats'
            })
          } catch (e) {
            assert.equal(
              e.message,
              `[createVCStateUpdateFingerprint][balanceB] : 7 cats is not BN.`
            )
          }
        })
      })
    })
  })

  describe('validatorsResponseToError', () => {
    it('return the method name var name and validator error', async () => {
      try {
        Connext.validatorsResponseToError(
          ['value is not hex'],
          'methodName',
          'testVar'
        )
      } catch (e) {
        assert.equal(e.message, '[methodName][testVar] : value is not hex')
      }
    })
  })
})
describe('ingridClientRequests', () => {
  let validLedgerState = {
    sigB: 'sigB',
    sigA: 'sigA',
    nonce: 0,
    openVCs: 'openVCs',
    vcRootHash: 'hash',
    partyA: 'partyA',
    partyI: 'partyI',
    balanceA: 100,
    balanceI: 32
  }
  beforeEach(() => {
    // import and pass your custom axios instance to this method
    moxios.install()
  })

  afterEach(() => {
    // import and pass your custom axios instance to this method
    moxios.uninstall()
  })

  it('getLatestLedgerStateUpdate', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const ledgerChannelId = 'address'
    const url = `${client.ingridUrl}/ledgerchannel/${ledgerChannelId}/lateststate`
    moxios.stubRequest(url, {
      status: 200,
      responseText: validLedgerState
    })
    const res = await client.getLatestLedgerStateUpdate('address')
    assert.ok(typeof res === 'object')
  })

  it('getLedgerChannelChallengeTimer', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const ledgerChannelId = 'address'
    const url = `${client.ingridUrl}/ledgerchannel/timer`
    moxios.stubRequest(url, {
      status: 200,
      responseText: 31239
    })
    const res = await client.getLedgerChannelChallengeTimer('address')
    assert.equal(res, 31239)
  })

  it('fastCloseVcHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    const params = { vcId: 'vcId', sigA: 'sigA' }
    client.ingridUrl = 'ingridUrl'
    const url = `${client.ingridUrl}/virtualChannel/${params.vcId}/fastclose`

    moxios.stubRequest(url, {
      status: 200,
      response: {
        data: {}
      }
    })
    const result = await client.fastCloseVcHandler(params)
    assert.deepEqual(result, { data: {} })
  })

  it('getLatestVirtualDoubleSignedStateUpdate', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const params = { channelId: 'channelId' }
    const url = `${client.ingridUrl}/virtualchannel/${params.channelId}/lateststate/doublesigned`
    moxios.stubRequest(url, {
      status: 200,
      response: {
        data: {}
      }
    })
    const result = await client.getLatestVirtualDoubleSignedStateUpdate(params)
    assert.deepEqual(result, { data: {} })
  })

  it('cosignVcStateUpdateHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const params = { channelId: 'channelId', sig: 'sig', balance: 12 }
    const url = `${client.ingridUrl}/virtualchannel/${params.channelId}/cosign`
    moxios.stubRequest(url, {
      status: 200,
      response: {
        data: {}
      }
    })
    const result = await client.cosignVcStateUpdateHandler(params)
    assert.deepEqual(result, { data: {} })
  })

  it('vcStateUpdateHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const params = { channelId: 'channelId', sig: 'sig', balance: 12 }
    const url = `${client.ingridUrl}/virtualchannel/${params.channelId}/update`
    moxios.stubRequest(url, {
      status: 200,
      response: {
        data: {}
      }
    })
    const result = await client.vcStateUpdateHandler(params)
    assert.deepEqual(result, { data: {} })
  })

  it('joinVcHandler', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    client.ingridUrl = 'ingridUrl'
    const params = { channelId: 'channelId', sig: 'sig', vcRootHash: 1212033 }
    const url = `${client.ingridUrl}/virtualchannel/${params.channelId}/join`
    moxios.stubRequest(url, {
      status: 200,
      response: {
        data: {}
      }
    })
    const result = await client.joinVcHandler(params)
    assert.deepEqual(result, { data: {} })
  })
  it('openVc', async () => {
    const client = new Connext({ web3 }, createFakeWeb3())
    const fakeAccounts = ['address']
    client.web3.eth.getAccounts = () => {
      return new Promise((resolve, reject) => {
        return resolve(fakeAccounts)
      })
    }
    client.ingridUrl = 'ingridUrl'
    const params = {
      sig: 'sig',
      balanceA: 100,
      to: 230,
      vcRootHash: 'hashKey'
    }
    const url = `${client.ingridUrl}/virtualchannel/open?a=${fakeAccounts[0]}`
    moxios.stubRequest(url, {
      status: 200,
      response: {
        data: {}
      }
    })
    const result = await client.openVc(params)
    assert.deepEqual(result, { data: {} })
  })
})
