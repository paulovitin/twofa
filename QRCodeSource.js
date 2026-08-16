import { exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'module';
import { Jimp } from 'jimp';
import TwoFAError from './TwoFAError.js';

const require = createRequire(import.meta.url);
const jsQR = require('jsqr');

// Invoke the platform's screen-capture binary (Node's child_process does this
// natively; `screencapture -i` opens an interactive selection on macOS).
function captureCommand(filePath) {
  if (process.env.CAPTURE_COMMAND) {
    return process.env.CAPTURE_COMMAND.replace('%s', filePath);
  }
  switch (os.platform()) {
    case 'freebsd':
      return `scrot -s ${filePath}`;
    case 'darwin':
      return `screencapture -i ${filePath}`;
    case 'linux':
      return `import ${filePath}`;
    default:
      throw new Error('unsupported platform');
  }
}

// Capture a screenshot to a throwaway PNG and resolve with its path.
function captureScreen() {
  const target = path.join(
    os.tmpdir(),
    `twofa-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
  );
  const command = captureCommand(target);

  return new Promise((resolve, reject) => {
    exec(command, err => {
      if (os.platform() !== 'win32' && err) {
        return reject(err);
      }
      if (!fs.existsSync(target)) {
        return reject(new Error('Screenshot failed'));
      }
      resolve(target);
    });
  });
}

/**
 * Turns a QRCode image into a provisioning URI, hiding the source and the
 * image decoding behind a single seam: `captureQRCode(input) -> uri`.
 *
 * The screen-grab path and the image-file path are two adapters satisfying
 * that one interface. Keeping JIMP + jsQR inside here means enrollment never
 * learns how an image becomes a URI.
 */
class QRCodeSource {
  constructor({ screencap = captureScreen } = {}) {
    this.screencap = screencap;
  }

  captureQRCode({ imagePath } = {}) {
    const promise = imagePath
      ? this.readImage(imagePath)
      : this._captureAndReadQRCode();

    return promise.then(null, error => {
      throw this._normalizeError(error);
    });
  }

  readImage(imagePath) {
    const buffer = fs.readFileSync(imagePath);

    return Jimp.read(buffer).then(image => {
      const { data, width, height } = image.bitmap;
      const code = jsQR(data, width, height) || {};

      if (!Object.prototype.hasOwnProperty.call(code, 'data')) {
        throw TwoFAError.invalidQRCode();
      }

      return code.data;
    });
  }

  _captureAndReadQRCode() {
    return this.screencap().then(imagePath => this.readImage(imagePath));
  }

  _normalizeError(error) {
    if (error instanceof TwoFAError) {
      return error;
    }

    if (typeof error === 'string' || error instanceof Error) {
      return error;
    }

    // Screen-capture failures surface as non-string objects (e.g. user cancel).
    return TwoFAError.captureFailed();
  }
}

export default QRCodeSource;