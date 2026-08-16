import Conf from 'conf';

/**
 * Deep module hiding all persistence behind a small interface.
 *
 * The third-party `conf` library (file location, atomic writes) is its
 * implementation; the rest of the app only ever calls `find`, `all`, `put`
 * and `remove`. Test faster than a real one by injecting an in-memory fake
 * at the `TwoFA` constructor.
 */
class ServiceStore {
  constructor(config) {
    this._conf = new Conf(config || { projectName: 'twofa' });
  }

  find(service) {
    return this._conf.get(service);
  }

  all() {
    return this._conf.get() || {};
  }

  put(service, uri) {
    this._conf.set(service, uri);
  }

  remove(service) {
    this._conf.delete(service);
  }
}

export default ServiceStore;