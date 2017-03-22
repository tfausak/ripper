const mocha = require('mocha');
const ripper = require('../index.js');

const test = (uuid, description) => {
  mocha.it(`${uuid.substr(0, 4)} ${description}`, (callback) => {
    const event = {
      data: {
        name: `test/replays/${uuid}.replay`,
        resourceState: 'exists'
      }
    };

    ripper.main(event, callback);
  });
};

mocha.describe('ripper', () => {
  test('29F582C34A65EB34D358A784CBE3C189', 'frames');
  test('6688EEE34BFEB3EC3A9E3283098CC712', 'a malformed byte property');
  test('F811C1D24888015E23B598AD8628C742', 'no frames');
});
