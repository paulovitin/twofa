import { createRequire } from 'module';
import ServiceStore from './ServiceStore.js';
import QRCodeSource from './QRCodeSource.js';
import TwoFAError from './TwoFAError.js';

const require = createRequire(import.meta.url);
const OTPAuth = require('otpauth');
const qrcode = require('qrcode-terminal');

/**
 * The enrollment / generation domain.
 *
 * Persistence and image capture are injected adapters (accept dependencies,
 * don't create them), so tests can build this with an in-memory store and a
 * faked screen capture instead of reaching into internals.
 *
 * Every rejection is a TwoFAError: `{ code, message }`.
 */
class TwoFA {
  constructor({ store = new ServiceStore(), qrSource = new QRCodeSource() } = {}) {
    this.store = store;
    this.qrSource = qrSource;
  }

  add(service, options) {
    options = options || {};

    if (this.store.find(service)) {
      return Promise.reject(TwoFAError.alreadyExists(service));
    }

    return this.qrSource.captureQRCode(options)
      .then(uri => this.enroll(service, uri));
  }

  enroll(service, uri) {
    return Promise.resolve(uri)
      .then(uri => OTPAuth.URI.parse(uri))
      .then(otpauth => {
        this.store.put(service, otpauth.toString());
        return this.gen(service);
      });
  }

  del(service) {
    return this._getURI(service).then(() => this.store.remove(service));
  }

  gen(service) {
    if (!service) {
      return this._genAll();
    }

    return this._getURI(service)
      .then(uri => OTPAuth.URI.parse(uri))
      .then(otpauth => ({
        code: otpauth.generate(),
        label: otpauth.label,
        service,
      }));
  }

  qrcode(service) {
    return this._getURI(service)
      .then(uri => new Promise(resolve =>
        qrcode.generate(uri, { small: true }, result => resolve(result))
      ));
  }

  _genAll() {
    const names = Object.keys(this.store.all() || {});
    return Promise.all(names.map(service => this.gen(service)));
  }

  _getURI(service) {
    const uri = this.store.find(service);

    if (!uri) {
      return Promise.reject(TwoFAError.notFound(service));
    }

    return Promise.resolve(uri);
  }
}

export default TwoFA;