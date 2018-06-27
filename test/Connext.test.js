const assert = require('assert')
const Connext = require('../src/Connext')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const { createFakeWeb3, timeout } = require('./Helpers')
const sinon = require('sinon')
const MerkleTree = require('../src/helpers/MerkleTree')
const Utils = require('../src/helpers/utils')
const Web3 = require('web3')
const channelManagerAbi = require('../artifacts/LedgerChannel.json')
const { initWeb3, getWeb3 } = require('../web3')

// named variables
// on init
let web3
let client
let ingridAddress
let watcherUrl = process.env.WATCHER_URL_DEV
let ingridUrl = process.env.INGRID_URL_DEV
let contractAddress = '0x31713144d9ae2501e644a418dd9035ed840b1660'
let hubAuth =
  's%3AE_xMockGuJVqvIFRbP0RCXOYH5SRGHOe.zgEpYQg2KnkoFsdeD1CzAMLsu%2BmHET3FINdfZgw9xhs'

// for accounts
let accounts
let partyA
let partyB

// for initial ledger channel states
let balanceA
let balanceI
let initialDeposit = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
let subchanAI // ids
let subchanBI // ids
let lcA // objects
let lcB // objects

// for virtual channel
let vcId
let balanceB

// hub response placeholder
let response


const emptyRootHash = Connext.generateVcRootHash({ vc0s: [] })

let lc0 = {
  isClose: false,
  lcId: '0x01',
  nonce: 0,
  openVCs: 0,
  vcRootHash: emptyRootHash,
  partyA: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
  partyI: '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
  balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
  balanceI: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
  unlockedAccountPresent: true
}

describe('Connext', async () => {
  describe('client init', () => {
    it('should create a connext client with a fake version of web3', async () => {
      client = new Connext({ web3 }, createFakeWeb3())
      assert.ok(typeof client === 'object')
    })
    it.only('should create a connext client with real web3 and channel manager', async () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      accounts = await web3.eth.getAccounts()
      partyA = accounts[1]
      partyB = accounts[2]
      ingridAddress = accounts[0]
      client = new Connext({
        web3,
        ingridAddress,
        watcherUrl,
        ingridUrl,
        contractAddress,
        hubAuth
      })
      assert.ok(
        client.ingridAddress === ingridAddress.toLowerCase() &&
          client.ingridUrl === ingridUrl &&
          client.watcherUrl === watcherUrl
      )
    })
  })

  describe.only('happy case functionality' , () => {
    describe('creating subchans', () => {
      // register function hardcodes from accounts[0]
      // to accurately test, must open channels directly with contract
      describe('using register on client and timeouts for subchanAI', () => {
        it(
          'should return an lcID created on the contract with partyA by calling register()',
          async () => {
            subchanAI = await client.register(initialDeposit)
            console.log('subchanAI:', subchanAI)
            assert.ok(Web3.utils.isHexStrict(subchanAI))
          }
        ).timeout(5000)
    
        it('should request hub joins subchanAI', async () => {
          // response = await Promise.all([client.requestJoinLc(subchanAI), timeout(15000)])
          subchanAI =
            '0x03f11cbb8570a47e1b12dd8266c39df1c77f21e18737b31db9b63471807d6227'
          response = await client.requestJoinLc(subchanAI)
          console.log(response)
          //   assert.equal(response.txHash, ':)')
          assert.ok(Web3.utils.isHex(response))
        }).timeout(20000)
      })
    
      describe('calling functions on contract', () => {
        it('should generate a unique id for subchanAI', () => {
          // accounts[0] is hardcoded into the client
          // create subchanAI with contract functions directly
          subchanAI = Connext.getNewChannelId()
          console.log('subchanAI:', subchanAI)
          assert.ok(Web3.utils.isHexStrict(subchanAI))
        })
    
        it('should create subchanAI on channel manager instance', async () => {
          // hardcode contract call, accounts[0] is encoded in client
          response = await client.channelManagerInstance.methods
            .createChannel(subchanAI, ingridAddress)
            .send({ from: partyA, value: initialDeposit, gas: 3000000 })
          assert.ok(Web3.utils.isHex(response.transactionHash))
        }).timeout(7000)
    
        it('should generate a unique id for subchanBI', () => {
          // accounts[0] is hardcoded into the client
          // create subchanBI with contract functions directly
          subchanBI = Connext.getNewChannelId()
          console.log('subchanBI:', subchanBI)
          assert.ok(Web3.utils.isHexStrict(subchanBI))
          // assert.equal(subchanBI, ';)')
        })
    
        it('should create subchanBI on channel manager instance', async () => {
          // hardcode contract call, accounts[0] is encoded in client
          response = await client.channelManagerInstance.methods
            .createChannel(subchanBI, ingridAddress, 3600)
            .send({ from: partyB, value: initialDeposit, gas: 3000000 })
          assert.ok(Web3.utils.isHex(response.transactionHash))
          //   assert.equal(response.transactionHash, ';)')
        }).timeout(7000)

        it('should request hub joins subchanBI', async () => {
          // response = await Promise.all([client.requestJoinLc(subchanBI), timeout(15000)])
          subchanBI =
            '0x44e87f5ecdd91e71b6d469f721757a3f5d9a46b956481f4ac7891ec610083f28'
          response = await client.requestJoinLc(subchanBI)
          console.log(response)
          //   assert.equal(response.txHash, ':)')
          assert.ok(Web3.utils.isHex(response))
        }).timeout(20000)

        it(
          'should force ingrid to join both subchans by calling it on contract',
          async () => {
            let responseAI = await client.channelManagerInstance.methods
              .joinChannel(subchanAI)
              .send({ from: ingridAddress, value: initialDeposit, gas: 3000000 })
    
            let responseBI = await client.channelManagerInstance.methods
              .joinChannel(subchanBI)
              .send({ from: ingridAddress, value: initialDeposit, gas: 3000000 })
            // assert.equal(responseAI.transactionHash, ';)')
            assert.ok(
              Web3.utils.isHex(responseAI.transactionHash) &&
                Web3.utils.isHex(responseBI.transactionHash)
            )
          }
        ).timeout(10000)
      })
    })
    
    describe('creating a virtual channel between partyA and partyB', () => {
      
      it('partyA should create a virtual channel with 5 eth in it', async () => {
        vcId = await client.openChannel({ to: partyB })
        assert.ok(Web3.utils.isHexStrict(vcId))
      })
    
      it('partyB should join the virtual channel with 0 eth', async () => {
        vcId = '0x040f8ce1ffc6a3c4afe1f32ca801b78bfb3931bb1882513bd7e3ff44972cfc95'
        response = await client.joinChannel(vcId)
        assert.equal(response, vcId)
      })
    })

    describe('updating state in and closing a virtual channel between partyA and partyB', () => {
      it('partyA sends a state update in the virtual channel of 1 eth', async () => {
        vcId = '0x040f8ce1ffc6a3c4afe1f32ca801b78bfb3931bb1882513bd7e3ff44972cfc95'
        balanceA = Web3.utils.toBN(Web3.utils.toWei('3', 'ether'))
        balanceB = Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))
        response = await client.updateBalance({
          channelId: vcId,
          balanceA,
          balanceB
        })
        assert.ok(
          Web3.utils.toBN(response.balanceA) === balanceA &&
            Web3.utils.toBN(response.balanceB) === balanceB
        )
      })

      it('should fast close the virtual channel', async () => {
        vcId = '0x040f8ce1ffc6a3c4afe1f32ca801b78bfb3931bb1882513bd7e3ff44972cfc95'
        response = await client.fastCloseChannel(vcId)
        assert.equal(response, vcId)
      })
    })

    describe('withdraw from ledger channel', () => {
      it('should withdraw all funds from the ledger channel for partyA', async () => {
        response = await client.withdraw()
        assert.ok(Web3.utils.isHex(response.transactionHash))
      }).timeout(5000)
    })
  })

  describe('checkpoint', () => {
    // init web3
    const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
    web3 = new Web3(`ws://localhost:${port}`)
    let client = new Connext({ web3 }, Web3)
    describe('Web3 and contract properly initialized, valid paramereters', () => {
      it('should update the mapping in the contract when checkpointed', async () => {
        const accounts = await client.web3.eth.getAccounts()
        const lcId = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
        const balanceA = Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))
        const balanceI = Web3.utils.toBN(Web3.utils.toWei('3', 'ether'))
        partyA = accounts[0]
        ingridAddress = client.ingridAddress = lc0.partyI = accounts[2]
        const params = {
          isClose: false,
          lcId: lcId,
          nonce: 1,
          openVCs: 0,
          vcRootHash: emptyRootHash,
          partyA: partyA,
          partyI: ingridAddress,
          balanceA: balanceA,
          balanceI: balanceI,
          sigA: ' '
        }
        const hash = await Connext.createLCStateUpdateFingerprint(params)
        const sigI = await client.web3.eth.sign(hash, accounts[2])
        params.sigI = sigI
        // mock client requests
        const mock = new MockAdapter(axios)
        // calling getLcId
        mock.onGet(`${client.ingridUrl}/ledgerchannel?a=${partyA}`).reply(() => {
          return [200, lcId]
        })
        // calling getLatestLedgerStateUpdate
        mock.onGet(`${client.ingridUrl}/ledgerchannel/${lcId}/lateststate`).reply(() => {
          return [
            200,
            params
          ]
        })

        // actual request
        const results = await client.checkpoint()
        assert.ok(Web3.utils.isHexStrict(response.transactionHash))
      })
    })
  })

  describe('dispute functions', () => {
    describe('withdrawFinal', () => {
      // init web3
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
      describe('Web3 and contract properly initialized, valid parameters', () => {
        it('should call withdrawFinal on lc that has been settled on chain', async () => {
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          ingridAddress = client.ingridAddress = accounts[2]
          const lcId = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          const balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
          const balanceI = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          const params = {
            isClose: false,
            lcId: lcId,
            nonce: 1,
            openVCs: 0,
            vcRootHash: emptyRootHash,
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: balanceA,
            balanceI: balanceI,
            isSettling: true
          }

          // url requests
          client.ingridUrl = 'ingridUrl'
          const mock = new MockAdapter(axios)
          // when requesting subchanBI id
          let url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
          mock.onGet(url).reply(() => {
            return [200, lcId]
          })
          // calling getLc
          url = `${client.ingridUrl}/ledgerchannel/${lcId}`
          mock.onGet(url).reply(() => {
            return [200, params]
          })
          const response = await client.withdrawFinal()
          // assert.equal(response, ':)')
          assert.ok(Web3.utils.isHexStrict(response.transactionHash))
        })
      })
    })

    describe('byzantineCloseVc', () => {
      // init web3
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
      describe('Web3 and contract properly initialized, valid parameters', () => {
        it('should call byzantineCloseVc which calls initVC and settleVC on contract', async () => {
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          const vcId = '0xc025e912181796cf8c15c86558ad580b6ab4a6779c0965d70ba25dc6509a0e13'
          const subchanAIId = '0x73507f1b3aba85ff6794f4d27fa8e4cbf6daf294c09912c4856428e1e1b2c610'
          const subchanBIId = '0x129ef8385463750d5557c11ee3a2acbb935e1702d342f287aaa0123bfa82a707'
          // initial state
          let state = {
            vcId,
            subchanAI: subchanAIId,
            subchanBI: subchanBIId,
            nonce: 0,
            partyA,
            partyB,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
            balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
          }
          const hash0 = Connext.createVCStateUpdateFingerprint(state)
          const sigA0 = await client.web3.eth.sign(hash0, accounts[0])
          const sigB0 = await client.web3.eth.sign(hash0, accounts[1])
          // state 1
          state.nonce = 1
          state.balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
          state.balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          const hash1 = Connext.createVCStateUpdateFingerprint(state)
          const sigA1 = await client.web3.eth.sign(hash1, accounts[0])
          const sigB1 = await client.web3.eth.sign(hash1, accounts[1])
          // url requests
          const mock = new MockAdapter(axios)
          // when requesting initial state of VC
          let url = `${client.ingridUrl}/virtualchannel/${vcId}/intialstate`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                vcId,
                subchanAI: subchanAIId,
                subchanBI: subchanBIId,
                nonce: 0,
                partyA,
                partyB,
                balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
                balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
                sigA: sigA0,
                sigB: sigB0
              }
            ]
          })
          // when requesting latest double signed state of VC
          url = `${client.ingridUrl}/virtualchannel/${vcId}/lateststate/doublesigned`
          mock.onGet(url).reply(() => {
            return [
              200,
              {
                vcId,
                subchanAI: subchanAIId,
                subchanBI: subchanBIId,
                nonce: 1,
                partyA,
                partyB,
                balanceA: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
                balanceB: Web3.utils.toBN(Web3.utils.toWei('1', 'ether')),
                sigA: sigA1,
                sigB: sigB1
              }
            ]
          })
          // when requesting initial states of the subchanAI
          url = `${client.ingridUrl}/ledgerchannel/${subchanAIId}/virtualchannel/initialstates`
          mock.onGet(url).reply(() => {
            return [
              200,
              [
                // returns list of vc initial states
                {
                  subchanAIId,
                  vcId,
                  nonce: 0,
                  partyA,
                  partyB,
                  balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
                  balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
                  sigA: sigA0
                }
              ]
            ]
          })

          const response = await client.byzantineCloseVc(vcId)
          assert.ok(Web3.utils.isHexStrict(response.transactionHash))
        })
      })
    })

    describe('closeChannel', () => {
      // init web3
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
      describe('Valid parameters and correct web3', () => {
      it('should call closeChannel on given channelId, decomposing into state updates', async () => {
          // parameters
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          const vcId = '0xc025e912181796cf8c15c86558ad580b6ab4a6779c0965d70ba25dc6509a0e13'
          const subchanAIId = '0x73507f1b3aba85ff6794f4d27fa8e4cbf6daf294c09912c4856428e1e1b2c610'
          const subchanBIId = '0x129ef8385463750d5557c11ee3a2acbb935e1702d342f287aaa0123bfa82a707'

          // url requests
          const mock = new MockAdapter(axios)
          // when requesting subchanBI id
          let url = `${client.ingridUrl}/ledgerchannel?a=${partyA}`
          mock.onGet(url).reply(() => {
            return [200, subchanAIId]
          })
          // when requesting decomposed ledger state updates
          url = `${client.ingridUrl}/virtualchannel/${vcId}/decompose`
          const data = {}
          data[subchanAIId] = {
            lcId: subchanAIId,
            nonce: 1,
            openVCs: 1,
            vcRootHash: '0x421b9af3b91f2475a26671ea9217e632a6e7f5573b82343f1d5260b2a6f145a4',
            partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN('0'),
            balanceI: Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          }
          data[subchanBIId] = {}
          mock.onGet(url).reply(() => {
            return [
              200,
              data
            ]
          })
          // on posting sig to client
          mock.onPost().reply(() => {
            return [
              200,
              ':)'
            ]
          })

          const response = await client.closeChannel(vcId)
          assert.equal(response, ':)')
      })
    })
    })

    describe('closeChannels', () => {
        // init web3
        const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
        web3 = new Web3(`ws://localhost:${port}`)
        let client = new Connext({ web3, ingridAddress, ingridUrl }, Web3)
        describe('Valid parameters and correct web3', () => {
          it('should call closeChannels, which calls closeChannel on an array of channelIds', () => {

          })
        })
    })
  })

  describe('client contract handlers', () => {
    describe('createLedgerChannelContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', () => {
        it('should call createChannel on the channel manager instance (subchanAI)', async () => {
          balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          subchanAI = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          response = await client.createLedgerChannelContractHandler({
            ingridAddress,
            lcId: subchanAI,
            initialDeposit: balanceA,
            challenge: 5,
            sender: partyA
          })
          assert.ok(Web3.utils.isHexStrict(response.transactionHash))
        }).timeout(5000)

        it('should call createChannel on the channel manager instance (subchanBI)', async () => {
          balanceB = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          subchanBI = Connext.getNewChannelId()
          console.log('subchanBI:', subchanBI)
          response = await client.createLedgerChannelContractHandler({
            ingridAddress,
            lcId: subchanBI,
            initialDeposit: balanceB,
            challenge: 5,
            sender: partyB
          })
          assert.ok(Web3.utils.isHexStrict(response.transactionHash))
        }).timeout(5000)
      })
    })

    describe('LCOpenTimeoutContractHandler', () => {
      // init web3
      describe('Web3 and contract properly initialized, valid parameters', () => {
        it('should call createChannel on the channel manager instance to create channel to delete', async () => {
          const accounts = await client.web3.eth.getAccounts()
          ingridAddress = accounts[2]
          const balanceA = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          const lcId = '0xa6585504ea64ee76da1238482f08f6918e7a5e1c77418f6072af19530940cc04' // add lcid to obj
          const response = await client.createLedgerChannelContractHandler({
            ingridAddress,
            lcId: lcId,
            initialDeposit: balanceA
          })
          assert.ok(Web3.utils.isHexStrict(response.transactionHash))
        }).timeout(5000)
        it('should call LCOpenTimeout on the channel manager instance to delete created channel', async () => {
          const lcId = '0xa6585504ea64ee76da1238482f08f6918e7a5e1c77418f6072af19530940cc04'
          const results = await client.LCOpenTimeoutContractHandler(lcId)
          assert.ok(Web3.utils.isHexStrict(results.transactionHash))
        }).timeout(5000)
      })
    })

    describe('joinLedgerChannelContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', async () => {
        it('should call joinChannel on the channel manager instance (subchanAI)', async () => {
          balanceI = Web3.utils.toBN(Web3.utils.toWei('5', 'ether'))
          const params = {
            lcId: subchanAI, // subchan AI ID,
            deposit: balanceI,
            sender: ingridAddress
          }
          const response = await client.joinLedgerChannelContractHandler(params)
          assert.ok(
            response.transactionHash !== null &&
              response.transactionHash !== undefined
          )
        }).timeout(5000)
        it('should call joinChannel on the channel manager instance (subchanBI)', async () => {
          const params = {
            lcId: subchanBI, // subchan AI ID,
            deposit: balanceI,
            sender: ingridAddress
          }
          const response = await client.joinLedgerChannelContractHandler(params)
          assert.ok(
            response.transactionHash !== null &&
              response.transactionHash !== undefined
          )
        }).timeout(5000)
      })
    })

    describe('depositContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', async () => {
        it('should call deposit on the channel manager instance', async () => {
          subchanAI = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          response = await client.depositContractHandler({
            depositInWei: Web3.utils.toBN(Web3.utils.toWei('1', 'ether')),
            recipient: partyA, 
            sender: partyA 
          })
          assert.ok(
            response.transactionHash !== null &&
              response.transactionHash !== undefined
          )
        })
      })
    })

    describe('updateLcStateContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', async () => {
        it('should call updateLcState on the channel manager instance with no open VCs', async () => {
          subchanAI = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          const params = {
            isClose: false,
            lcId: subchanAI,
            nonce: 1,
            openVCs: 0,
            vcRootHash: emptyRootHash,
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
            balanceI: Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          }
          const hashI = await Connext.createLCStateUpdateFingerprint(params)
          params.unlockedAccountPresent = true
          params.sigA = await client.createLCStateUpdate(params)
          params.sigI = await client.web3.eth.sign(hashI, accounts[2])
          console.log('PARAMS:', params)
          console.log('hashI:', hashI)
          // console.log('sigI:', paramssigI)
          // console.log('sigA:', sigA)

          const response = await client.updateLcStateContractHandler(params)
          assert.ok(
            response.transactionHash !== null &&
              response.transactionHash !== undefined
          )
        })
        it('should call updateLcState on the channel manager instance open VCs', async () => {
          subchanAI = '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          vcId = '0xc12'
          const vc0 = {
            isClose: false,
            vcId: vcId,
            nonce: 0,
            partyA: partyA,
            partyB: partyB,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('1', 'ether')),
            balanceB: Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
          }
          let vc0s = []
          vc0s.push(vc0)
          const vcRootHash1 = Connext.generateVcRootHash({ vc0s })
          let lc1 = {
            isClose: false,
            lcId: subchanAI,
            nonce: 1,
            openVcs: 1,
            vcRootHash: vcRootHash1,
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
            balanceI: Web3.utils.toBN(Web3.utils.toWei('4', 'ether')),
            signer: partyA
          }
          const sigA = await client.createLCStateUpdate(lc1)
          lc1.signer = ingridAddress
          const sigI = await client.createLCStateUpdate(lc1)
          lc1.sigA = sigA
          lc1.sigI = sigI
          lc1.sender = partyA
          const response = await client.updateLcStateContractHandler(lc1)
          assert.ok(
            response.transactionHash !== null &&
              response.transactionHash !== undefined
          )
        }).timeout(5000)
      })
    })

    describe('consensusCloseChannelContractHandler', () => {
      describe('Web3 and contract properly initialized, valid parameters', async () => {
        it(
          'should call consensusCloseChannel on the channel manager instance',
          async () => {
            subchanBI = '0x942e8cf213d0bd51c0ba316869d6b3b1eee9060b8d5973e75060c94013fee4bd'
            let params = {
              isClose: true,
              lcId: subchanBI,
              nonce: 1,
              openVcs: 0,
              vcRootHash: emptyRootHash,
              partyA: partyB,
              partyI: ingridAddress,
              balanceA: Web3.utils.toBN(Web3.utils.toWei('0', 'ether')),
              balanceI: Web3.utils.toBN(Web3.utils.toWei('5', 'ether')),
              signer: partyB
            }
            const sigB = await client.createLCStateUpdate(params)
            params.signer = ingridAddress
            const sigI = await client.createLCStateUpdate(params)
            console.log('params:', params)
            console.log('sigI:', sigI)
            console.log('sigB:', sigB)

            const result = await client.consensusCloseChannelContractHandler({
              lcId: params.lcId,
              nonce: params.nonce,
              balanceA: params.balanceA,
              balanceI: params.balanceI,
              sigA: sigB,
              sigI: sigI
            })
            assert.ok(
              result.transactionHash !== null &&
                result.transactionHash !== undefined
            )
          }
        ).timeout(5000)
      })
    })

    describe('initVcStateContractHandler', () => {
      describe('real Web3 and valid parameters', () => {
        it('should init a virtual channel state on chain', async () => {
          // get accounts
          subchanAI =
            '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          vcId = '0xc12'
          const nonce = 0
          const balanceA = Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))
          const balanceB = Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))

          // generate sigA
          const sigA = await client.createVCStateUpdate({
            vcId,
            nonce,
            partyA,
            partyB,
            balanceA,
            balanceB,
            signer: partyA
          })
          console.log('sigA:', sigA)
          // mock urls
          const mock = new MockAdapter(axios)
          mock.onGet().reply(() => {
            return [
              200,
              [
                // returns list of vc initial states
                {
                  subchanId: subchanAI,
                  vcId,
                  nonce,
                  partyA,
                  partyB,
                  balanceA,
                  balanceB,
                  sigA
                }
              ]
            ]
          })
          // client call
          const results = await client.initVcStateContractHandler({
            subchanId: subchanAI,
            vcId,
            nonce,
            partyA,
            partyB,
            balanceA,
            balanceB,
            sigA
          })
          assert.ok(
            results.transactionHash !== null &&
            results.transactionHash !== undefined
          )
        })
      })
    })

    describe('settleVcContractHandler', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('real Web3 and valid parameters', () => {
        it('should settle a vc state on chain', async () => {
          // get accounts
          const accounts = await client.web3.eth.getAccounts()
          const subchanId =
            '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = client.ingridAddress = accounts[2]
          const vcId = "0x6c08ce0d3bcacaf067e75801c2e8aa5a29dd19a20ba773a2918d73765e255941"
          console.log(vcId)
          const nonce = 2
          const balanceA = Web3.utils.toBN(Web3.utils.toWei('0', 'ether'))
          const balanceB = Web3.utils.toBN(Web3.utils.toWei('2', 'ether'))

          // generate sigA
          const hash = Connext.createVCStateUpdateFingerprint({
            vcId,
            nonce,
            partyA,
            partyB,
            balanceA,
            balanceB
          })
          const sigA = await client.web3.eth.sign(hash, accounts[0])
          console.log('hash:', hash)
          console.log('sigA:', sigA)

          // client call
          const results = await client.settleVcContractHandler({
            subchan: subchanId,
            vcId,
            nonce,
            partyA,
            partyB,
            balanceA,
            balanceB,
            sigA,
          })
          assert.ok(
            results.transactionHash !== null &&
            results.transactionHash !== undefined
          )
        })
      })
    })

    describe('closeVirtualChannelContractHandler', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('real Web3 and valid parameters', () => {
        it('should settle a vc state on chain', async () => {
          // get accounts
          const subchanId =
            '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          const vcId = "0x6c08ce0d3bcacaf067e75801c2e8aa5a29dd19a20ba773a2918d73765e255941"
          // client call
          const results = await client.closeVirtualChannelContractHandler({
            lcId: subchanId,
            vcId
          })
          // assert.equal(results, ':)')
          assert.ok(
            results.transactionHash !== null &&
            results.transactionHash !== undefined
          )
        })
      })
    })

    describe('byzantineCloseChannelContractHandler', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('real Web3 and valid parameters', () => {
        it('should settle a vc state on chain', async () => {
          // get accounts
          const lcId =
            '0x4b7c97c3ae6abca2ff2ba4e31ee594ac5e1b1f12d8fd2097211569f80dbb7d08'
          // client call
          const results = await client.byzantineCloseChannelContractHandler(lcId)
          assert.ok(
            results.transactionHash !== null &&
            results.transactionHash !== undefined
          )
        })
      })
    })
  })

  describe('client signature and recover functions', () => {
    describe('createLCStateUpdate', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('createLCStateUpdate with real web3.utils and valid params', () => {
        it('should create a valid signature.', async () => {
          const accounts = await web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = accounts[2]
          client.ingridAddress = ingridAddress
          const sigParams = {
            isClose: false,
            lcId: '0xc1912',
            nonce: 0,
            openVCs: 0,
            vcRootHash: '0xc1912',
            partyA: partyA,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN('0'),
            balanceI: Web3.utils.toBN('0'),
            unlockedAccountPresent: true
          }
          const sig = await client.createLCStateUpdate(sigParams)
          const hash = Connext.createLCStateUpdateFingerprint(sigParams)
          const realSig = await client.web3.eth.sign(hash, accounts[0])
          // console.log(sig)
          assert.equal(
            sig,
            realSig
          )
        })
      })
    })

    describe('recoverSignerFromLCStateUpdate', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('recoverSignerFromLCStateUpdate with real web3.utils and valid params', async () => {
        const accounts = await web3.eth.getAccounts()
        partyA = accounts[1]
        partyB = accounts[2]
        ingridAddress = accounts[0]
        describe('should recover the address of person who signed', () => {
          it('should return signer == accounts[1]', async () => {
            let sigParams = {
              isClose: false,
              lcId: '0xc1912',
              nonce: 0,
              openVcs: 0,
              vcRootHash: '0xc1912',
              partyA: partyA,
              partyI: ingridAddress,
              balanceA: Web3.utils.toBN('0'),
              balanceI: Web3.utils.toBN('0'),
              unlockedAccountPresent: true,
              signer: partyA
            }
            const sig = await client.createLCStateUpdate(sigParams)
            sigParams.sig = sig
            const signer = Connext.recoverSignerFromLCStateUpdate(sigParams)
            assert.equal(signer, partyA.toLowerCase())
          })
        })
      })
    })

    describe('createVCStateUpdate', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('createVCStateUpdate with real web3.utils and valid params', () => {
        it('should return a valid signature.', async () => {
          const accounts = await web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = accounts[2]
          const mock = new MockAdapter(axios)
          mock.onGet().reply(() => {
            return [
              200,
              {
                data: {
                  ledgerChannel: { id: '0xc1912' }
                }
              }
            ]
          })
          const sigParams = {
            vcId: '0xc1912',
            nonce: 0,
            partyA: partyA,
            partyB: partyB,
            balanceA: Web3.utils.toBN('0'),
            balanceB: Web3.utils.toBN('0'),
            unlockedAccountPresent: true
          }
          const sig = await client.createVCStateUpdate(sigParams)
          const hash = Connext.createVCStateUpdateFingerprint(sigParams)
          const realSig = await client.web3.eth.sign(hash, accounts[0])
          assert.equal(
            sig,
            realSig
          )
        })
      })
    })

    describe('recoverSignerFromVCStateUpdate', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('recoverSignerFromVCStateUpdate with real web3.utils and valid params', async () => {
        const accounts = await client.web3.eth.getAccounts()
        partyA = accounts[1]
        partyB = accounts[2]
        ingridAddress = accounts[0]
        describe('should recover the address of person who signed', () => {
          it('should return signer == accounts[1]', async () => {
            let sigParams = {
              vcId: '0xc1912',
              nonce: 0,
              partyA: partyA,
              partyB: partyB,
              balanceA: Web3.utils.toBN('0'),
              balanceB: Web3.utils.toBN('0'),
              signer: partyA
            }
            const sig = await client.createVCStateUpdate(sigParams)
            sigParams.sig = sig
            const signer = Connext.recoverSignerFromVCStateUpdate(sigParams)
            assert.equal(signer, partyA.toLowerCase())
          })
        })
      })

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
              `TypeError: Cannot read property 'toString' of null Given value: "null"`
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
                  `Error: [number-to-bn] while converting number undefined to BN.js instance, error: invalid number value. Value must be an integer, hex string, BN or BigNumber instance. Note, decimals are not supported. Given value: "undefined"`
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
                  `TypeError: Cannot read property 'toString' of null Given value: "null"`
                )
              }
            })
          })

          describe('vcId', () => {
            it('throws an error when vcId is not a hex String', async () => {
              try {
                Connext.recoverSignerFromVCStateUpdate({
                  sig: '0xc1912',
                  vcId: 'bad VC ID',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: Web3.utils.toBN('0'),
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
                  nonce: '100aa',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: Web3.utils.toBN('0'),
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
                  partyA: 'its a party',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: Web3.utils.toBN('0'),
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
                  partyB: 'cardi B party B',
                  balanceA: Web3.utils.toBN('0'),
                  balanceB: Web3.utils.toBN('0'),
                })
              } catch (e) {
                assert.equal(
                  e.message,
                  `[recoverSignerFromVCStateUpdate][partyB] : cardi B party B is not address.`
                )
              }
            })
          })
          // describe('subchanAI', () => {
          //   it('does throw an error when subchanAI is not a strict hex', async () => {
          //     try {
          //       Connext.recoverSignerFromVCStateUpdate({
          //         sig: '0xc1912',
          //         vcId: '0xc1912',
          //         nonce: 100,
          //         partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         subchanAI: 'I am ai'
          //       })
          //     } catch (e) {
          //       assert.equal(
          //         e.message,
          //         `[recoverSignerFromVCStateUpdate][subchanAI] : I am ai is not hex string prefixed with 0x.`
          //       )
          //     }
          //   })
          // })
          // describe('subchanBI', () => {
          //   it('does throw an error when subchanBI is not a strict hex', async () => {
          //     try {
          //       Connext.recoverSignerFromVCStateUpdate({
          //         sig: '0xc1912',
          //         vcId: '0xc1912',
          //         nonce: 100,
          //         partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
          //         subchanAI: '0xc1912',
          //         subchanBI: 'invalid'
          //       })
          //     } catch (e) {
          //       assert.equal(
          //         e.message,
          //         `[recoverSignerFromVCStateUpdate][subchanBI] : invalid is not hex string prefixed with 0x.`
          //       )
          //     }
          //   })
          // })
          describe('balanceA', () => {
            it('does throw an error when balanceA is not BN', async () => {
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
                  `Error: [number-to-bn] while converting number "cow" to BN.js instance, error: invalid number value. Value must be an integer, hex string, BN or BigNumber instance. Note, decimals are not supported. Given value: "cow"`
                )
              }
            })
          })
          describe('balanceB', () => {
            it('does throw an error when balanceB is not BN', async () => {
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
                  `Error: [number-to-bn] while converting number "7 cats" to BN.js instance, error: invalid number value. Value must be an integer, hex string, BN or BigNumber instance. Note, decimals are not supported. Given value: "7 cats"`
                )
              }
            })
          })
        })
      })
    })

    describe('createVCStateUpdateFingerprint', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('recoverSignerFromVCStateUpdate with real web3.utils and valid params', async () => {
        const accounts = await web3.eth.getAccounts()
        partyA = accounts[0]
        partyB = accounts[1]
        ingridAddress = accounts[2]
        describe('Should create a valid hash.', async () => {
          it('returns a hashed value', () => {
            const hash = Connext.createVCStateUpdateFingerprint({
              vcId: '0xc1912',
              nonce: 0,
              partyA: partyA,
              partyB: partyB,
              partyI: ingridAddress,
              subchanAI: '0xc1912',
              subchanBI: '0xc1912',
              balanceA: Web3.utils.toBN('0'),
              balanceB: Web3.utils.toBN('0')
            })
            assert.equal(true, web3.utils.isHexStrict(hash))
          })
        })
      })
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
        // describe('subchanAI', () => {
        //   it('does throw an error when subchanAI is not a strict hex', async () => {
        //     try {
        //       Connext.createVCStateUpdateFingerprint({
        //         vcId: '0xc1912',
        //         nonce: 100,
        //         partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         subchanAI: 'I am ai'
        //       })
        //     } catch (e) {
        //       assert.equal(
        //         e.message,
        //         `[createVCStateUpdateFingerprint][subchanAI] : I am ai is not hex string prefixed with 0x.`
        //       )
        //     }
        //   })
        // })
        // describe('subchanBI', () => {
        //   it('does throw an error when subchanBI is not a strict hex', async () => {
        //     try {
        //       Connext.createVCStateUpdateFingerprint({
        //         vcId: '0xc1912',
        //         nonce: 100,
        //         partyA: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         partyB: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         partyI: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        //         subchanAI: '0xc1912',
        //         subchanBI: 'invalid'
        //       })
        //     } catch (e) {
        //       assert.equal(
        //         e.message,
        //         `[createVCStateUpdateFingerprint][subchanBI] : invalid is not hex string prefixed with 0x.`
        //       )
        //     }
        //   })
        // })
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

    describe('generateVcRootHash', () => {
      const port = process.env.ETH_PORT ? process.env.ETH_PORT : '9545'
      web3 = new Web3(`ws://localhost:${port}`)
      let client = new Connext({ web3 }, Web3)
      describe('generateVCRootHash with real web3.utils and valid params', () => {
        it('should create an empty 32 byte buffer vcRootHash when no VCs are provided', () => {
          const vc0s = []
          const vcRootHash = Connext.generateVcRootHash({ vc0s })
          assert.equal('0x0', vcRootHash)
        })
  
        it('should create a vcRootHash containing vcs', async () => {
          const accounts = await client.web3.eth.getAccounts()
          partyA = accounts[0]
          partyB = accounts[1]
          ingridAddress = accounts[2]
          const vc0 = {
            vcId: '0x1',
            nonce: 0,
            partyA: partyA,
            partyB: partyB,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN(1000),
            balanceB: Web3.utils.toBN(0)
          }
          const vc1 = {
            vcId: '0x2',
            nonce: 0,
            partyA: partyA,
            partyB: partyB,
            partyI: ingridAddress,
            balanceA: Web3.utils.toBN(1000),
            balanceB: Web3.utils.toBN(0)
          }
          const vc0s = []
          vc0s.push(vc0)
          vc0s.push(vc1)
          const vcRootHash = Connext.generateVcRootHash({ vc0s })
          assert.equal(
            '0xbc8a7623f3fd4779a4510b266265248fc8dfbc1a28988c9d8284a87419b2643c',
            vcRootHash
          )
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

describe('ingridClientRequests: expecting correct responses', () => {

    describe('populate the database with an lc and a vc', () => {
      describe('generating LCs in database using contract calls', () => {
        it('should generate a unique id for subchanAI', () => {
          // accounts[0] is hardcoded into the client
          // create subchanAI with contract functions directly
          subchanAI = Connext.getNewChannelId()
          console.log('subchanAI:', subchanAI)
          assert.ok(Web3.utils.isHexStrict(subchanAI))
        })
    
        it('should create subchanAI on channel manager instance', async () => {
          // hardcode contract call, accounts[0] is encoded in client
          response = await client.channelManagerInstance.methods
            .createChannel(subchanAI, ingridAddress)
            .send({ from: partyA, value: initialDeposit, gas: 3000000 })
          assert.ok(Web3.utils.isHex(response.transactionHash))
        }).timeout(7000)
    
        it('should generate a unique id for subchanBI', () => {
          // accounts[0] is hardcoded into the client
          // create subchanBI with contract functions directly
          subchanBI = Connext.getNewChannelId()
          console.log('subchanBI:', subchanBI)
          assert.ok(Web3.utils.isHexStrict(subchanBI))
          // assert.equal(subchanBI, ';)')
        })
    
        it('should create subchanBI on channel manager instance', async () => {
          // hardcode contract call, accounts[0] is encoded in client
          response = await client.channelManagerInstance.methods
            .createChannel(subchanBI, ingridAddress)
            .send({ from: partyB, value: initialDeposit, gas: 3000000 })
          assert.ok(Web3.utils.isHex(response.transactionHash))
          //   assert.equal(response.transactionHash, ';)')
        }).timeout(7000)
    
        it(
          'should force ingrid to join subchanBI by calling it on contract',
          async () => {
            let responseBI = await client.channelManagerInstance.methods
              .joinChannel(subchanBI)
              .send({ from: ingridAddress, value: initialDeposit, gas: 3000000 })
            // assert.equal(responseAI.transactionHash, ';)')
            assert.ok(
                Web3.utils.isHex(responseBI.transactionHash)
            )
          }
        ).timeout(10000)
      })

      describe('requestJoinLc', () => {
        it('should return tx hash of ingrid joining channel', async () => {
          subchanAI = '0x00cdd51e75ebd5afed428d9d3c4d0d2d6928f4714ae6b1927bc8fa9f659096d9'
          response = await setTimeoutPromise(10000, client.requestJoinLc(subchanAI))
          assert.ok(Web3.utils.isHex(response))
        }).timeout(17000)
      })

      describe('creating virtual channel in database', () => {
        it('partyA should create a virtual channel with 5 eth in it', async () => {
          vcId = await client.openChannel({ to: partyB })
          assert.ok(Web3.utils.isHexStrict(vcId))
        })
      
        it('partyB should join the virtual channel with 0 eth', async () => {
          vcId = '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
          response = await client.joinChannel(vcId)
          assert.equal(response, vcId)
        })

        it('partyA sends a state update in the virtual channel of 1 eth', async () => {
          vcId = '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
          balanceA = Web3.utils.toBN(Web3.utils.toWei('4', 'ether'))
          balanceB = Web3.utils.toBN(Web3.utils.toWei('1', 'ether'))
          response = await client.updateBalance({
            channelId: vcId,
            balanceA,
            balanceB
          })
          assert.ok(
            Web3.utils.toBN(response.balanceA) === balanceA &&
              Web3.utils.toBN(response.balanceB) === balanceB
          )
        })
      })
    })

    describe('testing ingrid getter functions', () => {
      subchanAI = '0x00cdd51e75ebd5afed428d9d3c4d0d2d6928f4714ae6b1927bc8fa9f659096d9'
      vcId = '0x9d6f7f8230a387fa584dd9e4c45c53d22967e306b433c27acff9a11aaea76cc1'
      describe('getLedgerChannelChallengeTimer', () => {
        it('should return the default time of 3600 seconds to local host', async () => {
          response = await client.getLedgerChannelChallengeTimer()
          assert.equal(response, 3600)
        })
      })

      describe('getLcById', () => {
        it('should return subchanAI', async () => {
          response = await client.getLcById(subchanAI)
          assert.equal(response.channelId, subchanAI)
        })
      })

      describe('getLcByPartyA', () => {
        it('should return ledger channel between ingrid and accounts[1] when no partyA', async() => {
          response = await client.getLcByPartyA()
          assert.equal(response.partyA, accounts[1].toLowerCase())
        })
        it('should return ledger channel between ingrid and partyA = accounts[2]', async() => {
          response = await client.getLcByPartyA(partyB)
          assert.equal(response.partyA, partyB.toLowerCase())
        })
      })

      // describe('getLatestLedgerStateUpdate', () => {
      //   it('should return latest state for subchanAI', async () => {
      //     response = await client.getLatestLedgerStateUpdate(subchanAI)
      //     assert.equal(response, ';)')
      //   })
      // })

      describe('getVcInitialStates', () => {
        it('should return the initial state of the vcs for subchanAI', async () => {
          response = await client.getVcInitialStates(subchanAI)
          assert.equal(response[0].channelId, vcId)
        })
      })

      // describe('getVcInitialState', () => {
      //   it('should return the initial state of the vcs for subchanAI', async () => {
      //     response = await client.getVcInitialStates(vcId)
      //     assert.equal(response.balanceA, balanceA)
      //   })
      // })

      describe('getChannelById', () => {
        it('should return the initial state of the vcs for subchanAI', async () => {
          response = await client.getChannelById(vcId)
          assert.equal(response.channelId, vcId)
        })
      })

      // describe('getChannelByParties', () => {
      //   it('should return the initial state of the vcs for subchanAI', async () => {
      //     response = await client.getChannelByParties({partyA, partyB})
      //     assert.equal(response.partyA, partyA.toLowerCase())
      //   })
      // })

      describe('getLatestVCStateUpdate', () => {
        it('should return the latest vc state', async () => {
          response = await client.getLatestVCStateUpdate(vcId)
          assert.equal(response.balanceA, Web3.utils.toWei('4', 'ether').toString())
        })
      })

    })
  })


describe('ingrid mocked responses', () => {
  let url
  
  beforeEach(() => {
    mock = new MockAdapter(axios)
    client.ingridUrl = 'ingridUrl'
  })

  describe('getLatestLedgerStateUpdate', () => {
    it('mocked ingrid request', async () => {
      const ledgerChannelId = '0xc12'
      url = `${client.ingridUrl}/ledgerchannel/${ledgerChannelId}/lateststate`
      mock.onGet(url).reply(() => {
        return [
          200,
          {
            data: {}
          }
        ]
      })
      const res = await client.getLatestLedgerStateUpdate('0xc12')
      assert.ok(typeof res === 'object')
    })
  })

  describe('getLcById', async () => {
    it('mocked ingrid request', async() => {
      ledgerChannel = {
        "state": 0, // status of ledger channel
        "balanceA": "10000",
        "balanceI": "0",
        "channelId": "0x1000000000000000000000000000000000000000000000000000000000000000",
        "partyA": partyA,
        "partyI": ingridAddress,
        "nonce": 0,
        "openVcs": 0,
        "vcRootHash": emptyRootHash
      }
      url = `${client.ingridUrl}/ledgerchannel/${ledgerChannel.channelId}`
      mock.onGet(url).reply(() => {
        return [
          200,
          ledgerChannel
        ]
      })
      const res = await client.getLcById(ledgerChannel.channelId)
      assert.deepEqual(res, ledgerChannel)
    })

  })

  describe('getLcByPartyA', async () => {
    it('mocked ingrid request, agentA supplied', async() => {
      ledgerChannel = {
        "state": 0, // status of ledger channel
        "balanceA": "10000",
        "balanceI": "0",
        "channelId": "0x1000000000000000000000000000000000000000000000000000000000000000",
        "partyA": partyA,
        "partyI": ingridAddress,
        "nonce": 0,
        "openVcs": 0,
        "vcRootHash": emptyRootHash
      }
      url = `${client.ingridUrl}/ledgerchannel/a/${partyA}`
      mock.onGet(url).reply(() => {
        return [
          200,
          ledgerChannel
        ]
      })
      const res = await client.getLcByPartyA()
      assert.equal(res.partyA, partyA)
    })
    it('mocked ingrid request, agentA supplied', async () => {
      ledgerChannel.partyA = partyB.toLowerCase()
      url = `${client.ingridUrl}/ledgerchannel/a/${partyB}`
      mock.onGet(url).reply(() => {
        return [
          200,
          ledgerChannel
        ]
      })
      const res = await client.getLcByPartyA(partyB)
      assert.equal(res.partyA, partyB)
    })
  })

  describe('getLatestVCStateUpdate', async () => {
    it('mocked ingrid request', async () => {
      url = `${client.ingridUrl}/virtualchannel/${vcId}/lateststate/doublesigned`
      mock.onGet(url).reply(() => {
        return [
          200,
          {
            data: {}
          }
        ]
      })
      const result = await client.getLatestVCStateUpdate(
        vcId
      )
      assert.deepEqual(result, { data: {} })
    })
  })

  describe('vcStateUpdateHandler', async () => {
    it('mocked ingrid request', async () => {
      const params = {
        channelId: '0xc12',
        sig: '0xc12',
        balanceA: Web3.utils.toBN(10),
        balanceB: Web3.utils.toBN(10)
      }
      url = `${client.ingridUrl}/virtualchannel/${params.channelId}/update`
      mock = new MockAdapter(axios)
      mock.onPost().reply(() => {
        return [
          200,
          {
            data: {}
          }
        ]
      })
      const result = await client.vcStateUpdateHandler(params)
      assert.deepEqual(result, { data: {} })
    })
  })

  describe('joinVcHandler', async () => {
    it('mocked ingrid request', async () => {
      const params = { channelId: '0xc12', sig: '0xc12', vcRootHash: '0xc12' }
      url = `${client.ingridUrl}/virtualchannel/${params.channelId}/join`
      mock = new MockAdapter(axios)
      mock.onPost().reply(() => {
        return [
          200,
          true // if ingrid agrees to be the hub for vc for agentB
        ]
      })
      const result = await client.joinVcHandler(params)
      assert.deepEqual(result, true)
    })
  })

  describe('openVc', async () => {
    it('mocked ingrid request', async () => {
      const params = {
        sig: '0xc12',
        balanceA: Web3.utils.toBN(10),
        to: partyB,
        vcRootHash: '0xc12'
      }
      mock = new MockAdapter(axios)
      mock.onPost().reply(() => {
        return [
          200,
          true // if ingrid agrees to open vc for agentA
        ]
      })
      const result = await client.openVc(params)
      assert.deepEqual(result, true)
    })
  })
})
