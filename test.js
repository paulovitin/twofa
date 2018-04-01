const Conf = require('conf');
const tempy = require('tempy');

const TwoFA = require('./TwoFA.js');

const QRCODE = {
  account: 'blablabla',
  secret: 'zalaveavhwdtp4p4lzge5vl5mezvtk73',
  uri: 'otpauth://hotp/blablabla?secret=zalaveavhwdtp4p4lzge5vl5mezvtk73&algorithm=SHA256&digits=6&period=Infinity&counter=0',
  qrcodeImage: './qrcode.png',
  qrcodeImageError: './qrcode_error.png',
  qrcodeImageInvalid: './qrcode_invalid.png',
  code: '127211',
};

const SERVICE = 'tester';

describe('TwoFA', () => {
  let twofa;

  beforeEach(() => {
    twofa = new TwoFA();
    twofa.store = new Conf({ cwd: tempy.directory() });
  });

  test('Throw an error to service with same name', done => {
    twofa.store.set(SERVICE, true);
    twofa.add(SERVICE)
      .catch(e => {
        expect(e).toEqual(`A service with name '${SERVICE}' not exists.`);
        done();
      });
  });

  test('Can I save a valid otpauth uri?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImage,
    })
    .then(() => done());
  });

  test('Return error with invalid otpauth uri?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImageError,
    }).catch(e => {
      expect(e.message).toEqual("Invalid 'algorithm' parameter");
      done();
    });
  });

  test('Return error with invalid qrcode?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImageInvalid,
    }).catch(() => done());
  });

  test('Can I add a service and generate a valid code?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImage,
    })
    .then(() => twofa.gen(SERVICE))
    .then(code => {
      expect(code).toMatchObject({
        service: SERVICE,
        code: QRCODE.code,
        label: QRCODE.account,
      });
      done();
    });
  });

  test('Can I get all my services codes?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImage,
    })
    .then(() => twofa.gen())
    .then(codes => {
      expect(codes).toMatchObject([{
        service: SERVICE,
        code: QRCODE.code,
        label: QRCODE.account,
      }]);
      done();
    });
  });

  test('Can I get an exception to try delete a not found service?', () => {
    twofa.del(SERVICE)
      .catch(() => done());
  });

  test('Can I delete a service?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImage,
    })
    .then(() => {
      expect(() => twofa.del(SERVICE)).not.toThrow();
      done();
    });
  });

  test('Can I get an exception to ask a qrcode for a not found service?', done => {
    twofa.qrcode(SERVICE)
      .catch(() => done());
  });
})

