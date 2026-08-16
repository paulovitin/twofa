import clipboardy from 'clipboardy';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';

import TwoFA from './TwoFA.js';
import TwoFAError from './TwoFAError.js';
import QRCodeSource from './QRCodeSource.js';
import ServiceStore from './ServiceStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QRCODE = {
  account: 'blablabla',
  secret: 'zalaveavhwdtp4p4lzge5vl5mezvtk73',
  uri: 'otpauth://hotp/blablabla?secret=zalaveavhwdtp4p4lzge5vl5mezvtk73&algorithm=SHA256&digits=6&period=Infinity&counter=0',
  qrcodeImage: path.join(__dirname, 'assets', 'qrcode.png'),
  qrcodeImageError: path.join(__dirname, 'assets', 'qrcode_error.png'),
  qrcodeImageInvalid: path.join(__dirname, 'assets', 'qrcode_invalid.png'),
  code: '127211',
};

const cli = path.join(__dirname, 'cli.js');

const SERVICE = 'tester';

const mockCaptureSuccess = () => Promise.resolve(QRCODE.qrcodeImage);
const mockCaptureError = () => Promise.reject({});

class InMemoryServiceStore {
  constructor() {
    this.data = {};
  }

  find(service) {
    return this.data[service];
  }

  all() {
    return this.data;
  }

  put(service, uri) {
    this.data[service] = uri;
  }

  remove(service) {
    delete this.data[service];
  }
}

function makeTwoFA(store, screencap) {
  return new TwoFA({
    store: store || new InMemoryServiceStore(),
    qrSource: new QRCodeSource({ screencap }),
  });
}

const runCommand = args => {
  const exec = spawnSync(cli, args);
  return exec.stdout.toString();
};

describe('TwoFA', () => {
  let twofa;

  beforeEach(() => {
    twofa = makeTwoFA(new InMemoryServiceStore(), mockCaptureSuccess);
  });

  test('Throw an error to service with same name', done => {
    twofa.store.put(SERVICE, QRCODE.uri);
    twofa.add(SERVICE).catch(e => {
      expect(e).toBeInstanceOf(TwoFAError);
      expect(e.code).toBe('SERVICE_EXISTS');
      expect(e.message).toEqual(`A service with name '${SERVICE}' already exists.`);
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
    }).catch(e => {
      expect(e).toBeInstanceOf(TwoFAError);
      expect(e.code).toBe('INVALID_QRCODE');
      done();
    });
  });

  test('Can I try add a service and cancel the capture?', done => {
    const failing = makeTwoFA(new InMemoryServiceStore(), mockCaptureError);
    failing.add(SERVICE).catch(e => {
      expect(e).toBeInstanceOf(TwoFAError);
      expect(e.code).toBe('CAPTURE_FAILED');
      done();
    });
  });

  test('Can I add a service and generate a valid code?', done => {
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
    twofa.del(SERVICE).catch(e => {
      expect(e).toBeInstanceOf(TwoFAError);
      expect(e.code).toBe('SERVICE_NOT_FOUND');
      done();
    });
  });

  test('Can I delete a service?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImage,
    })
    .then(() => twofa.del(SERVICE))
    .then(() => expect(twofa.store.find(SERVICE)).toBeUndefined())
    .then(done);
  });

  test('Can I get an exception to ask a qrcode for a not found service?', done => {
    twofa.qrcode(SERVICE).catch(e => {
      expect(e).toBeInstanceOf(TwoFAError);
      expect(e.code).toBe('SERVICE_NOT_FOUND');
      done();
    });
  });

  test('Can I get a qrcode for a service?', done => {
    twofa.add(SERVICE, {
      imagePath: QRCODE.qrcodeImage,
    })
    .then(() => twofa.qrcode(SERVICE))
    .then(qrcode => {
      expect(qrcode).toBeTruthy();
      done();
    });
  });
});

describe('ServiceStore', () => {
  let dir;
  let store;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'twofa-svc-'));
    store = new ServiceStore({ cwd: dir });
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('find returns undefined until put', () => {
    expect(store.find('github')).toBeUndefined();
  });

  test('put, find, all and remove round trip', () => {
    store.put('a', 'uri-1');
    store.put('b', 'uri-2');

    expect(store.find('a')).toBe('uri-1');
    expect(store.all()).toEqual({ a: 'uri-1', b: 'uri-2' });

    store.remove('a');
    expect(store.find('a')).toBeUndefined();
    expect(store.find('b')).toBe('uri-2');
  });
});

describe('QRCodeSource native capture', () => {
  // Drill the real `captureScreen`/`captureCommand` path (the default screencap
  // adapter) by pointing CAPTURE_COMMAND at a fake `node -e` binary. This
  // exercises the native child_process capture without needing a display.
  afterEach(() => {
    delete process.env.CAPTURE_COMMAND;
  });

  test('captures a screenshot and decodes it to a provisioning URI', async () => {
    process.env.CAPTURE_COMMAND =
      `node -e "require('fs').copyFileSync(process.argv[1],process.argv[2])" ` +
      `${QRCODE.qrcodeImage} %s`;

    const source = new QRCodeSource();
    const uri = await source.captureQRCode();

    expect(uri).toBe(QRCODE.uri);
  });

  test('resolves with a screenshot path that exists on disk', async () => {
    process.env.CAPTURE_COMMAND =
      `node -e "require('fs').writeFileSync(process.argv[1],'')" %s`;

    const source = new QRCodeSource();
    const imagePath = await source.screencap();

    expect(imagePath).toMatch(/\.png$/);
    expect(fs.existsSync(imagePath)).toBe(true);
    fs.unlinkSync(imagePath);
  });

  test('rejects when no screenshot was produced', async () => {
    process.env.CAPTURE_COMMAND = 'node -e "void 0"';

    const source = new QRCodeSource();
    await expect(source.screencap()).rejects.toThrow('Screenshot failed');
  });

  test('rejects when the capture command fails', async () => {
    process.env.CAPTURE_COMMAND = 'node -e "process.exit(1)"';

    const source = new QRCodeSource();
    await expect(source.screencap()).rejects.toBeTruthy();
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
    const stdout = runCommand(['add', SERVICE, '--image', QRCODE.qrcodeImage]);
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
