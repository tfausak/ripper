const mocha = require('mocha');
const ripper = require('../index.js');

mocha.describe('ripper', () => {

  mocha.it('parses a replay without frames', (callback) => {
    const event = {
      data: {
        name: 'test/replays/F811C1D24888015E23B598AD8628C742.replay',
        resourceState: 'exists'
      }
    };

    ripper.main(event, callback);
  });

});
