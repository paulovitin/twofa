/**
 * Single error shape for the whole module.
 *
 * Every failure the domain raises rejects with a `TwoFAError`, so callers and
 * tests can always rely on `{ code, message }` instead of a mix of strings,
 * objects and library errors. Library errors (e.g. an invalid otpauth URI)
 * are intentionally left untouched so their own `.message` survives.
 */
export class TwoFAError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TwoFAError';
    this.code = code;
  }

  static alreadyExists(service) {
    return new TwoFAError(
      'SERVICE_EXISTS',
      `A service with name '${service}' already exists.`
    );
  }

  static notFound(service) {
    return new TwoFAError(
      'SERVICE_NOT_FOUND',
      `A service with name '${service}' not exists.`
    );
  }

  static invalidQRCode() {
    return new TwoFAError('INVALID_QRCODE', 'Invalid qrcode image. Try again.');
  }

  static captureFailed() {
    return new TwoFAError(
      'CAPTURE_FAILED',
      'The image capture failed or user canceled.'
    );
  }
}

export default TwoFAError;