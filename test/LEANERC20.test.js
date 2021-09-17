// test/LEANERC20.sol
// Load dependencies
const { expect } = require('chai')
const BN = require('bn.js');
const LEAN = artifacts.require('LEANERC20')

const hextab = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const mkAddr = (x) => "0xf0000000000000000000000000000000000000" + hextab[x/10 | 0] + hextab[x%10]
const totalSupply = new BN("3000000000000000000000000") // 10 mln 

contract('LEAN', accounts => {
  beforeEach(async function () {
    this.token = await LEAN.new()
    this.doTransfers = async function(n) {
        let tg = 0
        const v = totalSupply.div(new BN(n))
        for (let i = 0; i < n; i++) {
            const {receipt: {cumulativeGasUsed: g}} = await this.token.transfer(mkAddr(i), v)
            tg += g
        }
        console.log("Normal transfer to " + n + " accounts used " + tg + " gas")
        expect((await this.token.balanceOf(accounts[0])).toString()).to.equal('0')
        for (let i = 0; i < n; i++)
            expect((await this.token.balanceOf(mkAddr(i))).toString()).to.equal(v.toString())
    }
    this.doBatchTransfers = async function(n) {
        const v = totalSupply.div(new BN(n))
        const a = [];
        const vals = [];
        for (let i = 0; i < n; i++) {
            a.push(mkAddr(i));
            vals.push(v);
        }
        const {receipt: receipt} = await this.token.batchTransfer(a, vals)
        console.log("Batch transfer to " + n + " accounts used " + receipt.cumulativeGasUsed + " gas")
        expect((await this.token.balanceOf(accounts[0])).toString()).to.equal('0')
        for (let i = 0; i < n; i++)
            expect((await this.token.balanceOf(mkAddr(i))).toString()).to.equal(v.toString())
    }
  });

  it('Settings', async function () {
    expect((await this.token.decimals()).toString()).to.equal('18')
    expect((await this.token.totalSupply()).toString()).to.equal(totalSupply.toString())
    expect(await this.token.name()).to.equal('Lean Management Token')
    expect(await this.token.symbol()).to.equal('LEAN')
    // All LEAN ends up in the account of the creator
    expect((await this.token.balanceOf(accounts[0])).toString()).to.equal(totalSupply.toString())
  });

  it('Can do a normal transfer to 2 accounts', async function () {
    await this.doTransfers(2)
  });

  it('Can do a normal transfer to 10 accounts', async function () {
    await this.doTransfers(10)
  });

  it('Can do a normal transfer to 100 accounts', async function () {
    await this.doTransfers(100)
  });

  it('Can batch transfer to 2 accounts', async function () {
    await this.doBatchTransfers(2)
  });

  it('Can batch transfer to 10 accounts', async function () {
    await this.doBatchTransfers(10)
  });

  it('Can batch transfer to 100 accounts', async function () {
    await this.doBatchTransfers(100)
  });

});
