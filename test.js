const clipboardy = require('clipboardy');
const Conf = require('conf');
const tempy = require('tempy');
const path = require('path');
const spawn = require('cross-spawn');

const TwoFA = require('./TwoFA.js');

const QRCODE = {
  account: 'blablabla',
  secret: 'zalaveavhwdtp4p4lzge5vl5mezvtk73',
  uri: 'otpauth://hotp/blablabla?secret=zalaveavhwdtp4p4lzge5vl5mezvtk73&algorithm=SHA256&digits=6&period=Infinity&counter=0',
  qrcodeImage: path.join(__dirname, '/assets/qrcode.png'),
  qrcodeImageError: path.join(__dirname, '/assets/qrcode_error.png'),
  qrcodeImageInvalid: path.join(__dirname, '/assets/qrcode_invalid.png'),
  code: '127211',
};

const cli = path.join(__dirname, 'cli.js');

const SERVICE = 'tester';

const mockCaptureSuccess = () => Promise.resolve(QRCODE.qrcodeImage);
const mockCaptureError = () => Promise.reject({});
const runCommand = (args) => {
  const exec = spawn.sync(cli, args);
  return exec.stdout.toString();
};

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
        expect(e).toEqual(`A service with name '${SERVICE}' already exists.`);
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

  test('Can I try add a service and cancel the capture?', done => {
    twofa.screencap = mockCaptureError;
    twofa.add(SERVICE).catch(() => done());
  });

  test('Can I add a service and generate a valid code?', done => {
    twofa.screencap = mockCaptureSuccess;
    twofa.add(SERVICE)
      .then(code => {
        expect(code).toMatchObject({
          service: SERVICE,
          code: QRCODE.code,
          label: QRCODE.account,
        });
        done();
      });
  });

  test('Can I add a service and generate a valid code using imagePath?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImage,
    })
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

  test('Can I get an exception to try delete a not found service?', done => {
    twofa.del(SERVICE).catch(() => done());
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
    twofa.qrcode(SERVICE).catch(() => done());
  });

  test('Can I get a qrcode for a service?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImage,
    })
    .then(() => twofa.qrcode(SERVICE))
    .then(qrcode => {
      expect(qrcode).toBeTruthy();
      done();
    })
  });
});

describe('twofa-cli', () => {
  beforeAll(() => {
    runCommand(['del', SERVICE]);
  });

  test('Help?', () => {
    const stdout = runCommand(['--help']);
    expect(stdout).toMatch(/add \[options\] <service>/);
    expect(stdout).toMatch(/del <service>/);
    expect(stdout).toMatch(/gen \[service\]/);
    expect(stdout).toMatch(/qrcode <service>/);
  });

  test('Generate all codes from my services without services', () => {
    const stdout = runCommand(['gen']);
    expect(stdout).toMatch(/Listing all services and your codes/);
  });

  test('Add a service using image', () => {
    const stdout = runCommand(['add', SERVICE, '--image', QRCODE.qrcodeImage]);
    expect(stdout).toMatch(/added with success/);
  });

  test('Try adding an existing service name using image', () => {
    const stdout = runCommand(['add', SERVICE, '--image',  QRCODE.qrcodeImage]);
    expect(stdout).toMatch(new RegExp(`'${SERVICE}' already exists`));
  });

  test('Generate a code using service name', () => {
    const stdout = runCommand(['gen', SERVICE]);
    expect(stdout).toMatch(new RegExp(QRCODE.code));
  });

  test('Generate a code using service name and the code is in my clipboard?', () => {
    const stdout = runCommand(['gen', SERVICE]);
    expect(stdout).toMatch(new RegExp(QRCODE.code));
    expect(stdout).toMatch(clipboardy.readSync());
  });

  test('Try generate a code for a nonexistent service', () => {
    const stdout = runCommand(['gen', 'test']);
    expect(stdout).toMatch(new RegExp("'test' not exists."));
  });

  test('Generate all codes from my services', () => {
    const stdout = runCommand(['gen']);
    expect(stdout).toMatch(new RegExp(QRCODE.code));
    expect(stdout).toMatch(new RegExp(QRCODE.account));
  });

  test('Try generate a qrcode for a nonexistent service', () => {
    const stdout = runCommand(['qrcode', 'test']);
    expect(stdout).toMatch(new RegExp("'test' not exists."));
  });

  test('Generate a qrcode for a service', () => {
    const stdout = runCommand(['qrcode', SERVICE]);
    expect(stdout).toMatch(new RegExp(`Show QRCode for "${SERVICE}"`));
  });

  test('Try delete a nonexistent service', () => {
    const stdout = runCommand(['del', 'test']);
    expect(stdout).toMatch(new RegExp("'test' not exists."));
  });

  test('Try delete a nonexistent service', () => {
    const stdout = runCommand(['del', SERVICE]);
    expect(stdout).toMatch(new RegExp(`The "${SERVICE}" deleted with success!`));
  });
});
