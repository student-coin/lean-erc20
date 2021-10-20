// test/LEANERC20.sol
// Load dependencies
const { expect } = require('chai');
const { BN, ether, expectRevert } = require('@openzeppelin/test-helpers');
const LEAN = artifacts.require('LEANERC20');

const hextab = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const mkAddr = (x) => "0xf0000000000000000000000000000000000000" + hextab[x/10 | 0] + hextab[x%10]
const totalSupply = ether("3000000") // 3 mln 

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
    this.doFirstBurnDeployer = async function(amount) {
      expect((await this.token.totalSupply()).toString()).to.equal(totalSupply.toString());
      expect((await this.token.balanceOf(accounts[0])).toString()).to.equal(totalSupply.toString());
      const {receipt: receipt} = await this.token.burn(amount);
      console.log("Burn used " + receipt.cumulativeGasUsed + " gas");
      expect((await this.token.totalSupply()).toString()).to.equal(totalSupply.sub(amount).toString());
      expect((await this.token.balanceOf(accounts[0])).toString()).to.equal(totalSupply.sub(amount).toString());
    }

    this.doAnyBurn = async function(account, amount) {
      const beforeSupply = await this.token.totalSupply();
      const beforeBalance = await this.token.balanceOf(account);
      const {receipt: receipt} = await this.token.burn(amount, { from: account });
      console.log("Burn used " + receipt.cumulativeGasUsed + " gas");
      expect((await this.token.totalSupply()).toString()).to.equal(beforeSupply.sub(amount).toString());
      expect((await this.token.balanceOf(account)).toString()).to.equal(beforeBalance.sub(amount).toString());
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

  it('Can burn small', async function () {
    await this.doFirstBurnDeployer(ether("1"));
    await this.doAnyBurn(accounts[0], ether("1"));
    await this.doAnyBurn(accounts[0], ether("100"));
  });

  it('Can burn big', async function () {
    await this.doFirstBurnDeployer(ether("1000000"));
    await this.doAnyBurn(accounts[0], ether("30000"));
    await this.doAnyBurn(accounts[0], ether("500000"));
  });

  it('Can burn all', async function () {
    await this.doFirstBurnDeployer(ether("3000000"));
    expect((await this.token.balanceOf(accounts[0])).toString()).to.equal("0");
    expect((await this.token.totalSupply()).toString()).to.equal("0");
  });

  describe('Burn by non deployer', function() {
    beforeEach(async function () {
      await this.token.transfer(accounts[1], ether("100"));
      expect((await this.token.balanceOf(accounts[0])).toString()).to.equal(ether("2999900").toString());
      expect((await this.token.balanceOf(accounts[1])).toString()).to.equal(ether("100").toString());
    });
    it('Transfer & burn', async function () {
      await this.doAnyBurn(accounts[1], ether("20"));
      expect((await this.token.balanceOf(accounts[0])).toString()).to.equal(ether("2999900").toString());
      expect((await this.token.balanceOf(accounts[1])).toString()).to.equal(ether("80").toString());
    });
  
    it('Transfer & fail burn', async function () {
      await expectRevert(this.token.burn(ether("101"), { from: accounts[1] }),
        'ERC20: burn amount exceeds balance'  
      );
      expect((await this.token.balanceOf(accounts[0])).toString()).to.equal(ether("2999900").toString());
      expect((await this.token.balanceOf(accounts[1])).toString()).to.equal(ether("100").toString());
    });
  });
});
