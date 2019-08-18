const Contract = require('../../contracts');
const CommitReveal = require('./CommitReveal');
const gameInit = require('./gameInit');

const MAX_FINISH_BET = 100;

var nextTickTimer;
var stop = false;
var checkRound = {}

async function getBetForSettle() {
  try {
    var i = await Contract.get.indexOfDrawnBet();
    var bet = await Contract.get.bet(i);
    return bet
  } catch (ex) {
    var msg = ex.toString();
    if (msg.indexOf('Invalid JSON RPC') >= 0) {
      console.error('server > bot > index > 19 >', ex.toString());
      // throw new Error('Invalid JSON RPC')
    }
  }

  return null;
}

function betToString(bet) {
  return `${bet.index}: ${bet.player} | ${bet.round} | ${bet.number >= 10 ? bet.number : '0' + bet.number} | ${bet.isOver ? 'Over ' : 'Under'} | ${bet.amount}`;
}

async function nextTick(cb) {
  try {
    if (stop) return setTimeout(() => nextTick(cb), 100);

    var bet = await getBetForSettle();
    if (bet
      && (new Date().getTime() - (checkRound[bet.round] || 0)) > 2500) {
      var settle = await CommitReveal.getSecretForBet(bet);
      if (settle.round == 0) {
        return setTimeout(() => nextTick(cb), 100);
      }
      console.log(betToString(bet));
      var commitment = await CommitReveal.generateCommitment();
      var hash = await Contract.nextTick(settle.round, settle.secret, commitment, MAX_FINISH_BET);
      checkRound[bet.round] = new Date().getTime();

      if (process.env.WAIT_CONFIRM == 'true') {
        await Contract.get.checkTx(hash);
      }
      nextTick(cb)
    }
    else {
      return setTimeout(() => nextTick(cb), 100);
    }
  }
  catch (ex) {
    console.error('server > bot > index > 58 >', ex.toString());
    var msg = ex.toString();
    if (msg.indexOf('Invalid JSON RPC') >= 0) {
      cb && cb(ex);
    }
    else {
      cb && cb(ex);
    }
  }
}

module.exports = {
  start: (callback) => {
    stop = false;
    clearInterval(nextTickTimer);
    Contract.login({
      privateKey: process.env.PRIVATE_KEY
    }, async (err, address) => {
      if (err) return callback && callback(err);

      console.log('Connect wallet:', address);
      try {
        await gameInit();
        nextTick(callback);
      }
      catch (ex) {
        console.error('server > bot > index > 80 >', ex.toString());
        if (msg.indexOf('Invalid JSON RPC') >= 0) {
          cb && cb(ex);
        }
        else {
          cb && cb(ex);
        }
      }
    });
  },
  stop() {
    stop = true;
  }
}