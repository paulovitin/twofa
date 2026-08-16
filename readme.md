# twofa

> Two-factor authentication code generator for the CLI.

[![npm version](https://img.shields.io/npm/v/twofa.svg?style=flat-square)](https://www.npmjs.com/package/twofa)

`twofa` registers your two-factor accounts by reading their QR codes and then
generates the one-time login codes for you — right in the terminal, without
reaching for your phone.

## Features

- **Enroll a service** from an interactive screen capture or from an image file.
- **Generate codes on demand** for a single service — copied straight to your clipboard.
- **List all codes** at a glance in a table.
- **Print a QR code** for a service to re-register it in another app.
- **Works offline** — codes are derived from the stored secret, no network needed.
- Keeps only the provisioning URI; no plaintext credentials are ever stored.

## Requirements

- **Node.js >= 22.12** (the CLI is ESM).
- Interactive screen capture is available on **macOS** (`screencapture`),
  **Linux** (`import`, from ImageMagick) and **FreeBSD** (`scrot`). Enrolling
  with `--image` works on any platform.

## Install

```bash
npm install -g twofa
```

Or as a local dependency:

```bash
npm install twofa
```

## Usage

```bash
$ twofa --help

Usage: twofa [options] [command]

Options:
  -h, --help               display help for command

Commands:
  add [options] <service>  Add a new service to generate authentication code
  del <service>            Delete a service registered
  gen [service]            Generate authentication code
  qrcode <service>         Generate qrcode from a service
  help [command]           display help for command
```

## Commands

### `add <service> [--image <path>]`

Register a new service. Without options, `twofa` opens an interactive screen
capture so you can select the QR code area:

```bash
$ twofa add github        # click and drag over the QR code area
```

Or point it at an image file that contains the QR code:

```bash
$ twofa add github --image githubqrcode.png
```

### `del <service>`

Delete a registered service:

```bash
$ twofa del github
```

### `gen [service]`

Generate the code for a single service and copy it to your clipboard:

```bash
$ twofa gen github        # the code is copied to your clipboard
```

Omit the service name to list the codes of all registered services:

```bash
$ twofa gen
```

### `qrcode <service>`

Print the QR code of a service — handy to re-register the same account in
another authenticator app:

```bash
$ twofa qrcode github
```

## How it works

When you `add` a service, `twofa` decodes the QR code into a standard
provisioning URI (`otpauth://...`) and saves that secret locally. Each time you
`gen`, it derives the current one-time code from that secret following the
TOTP/HOTP algorithm — no server round-trip required.

## Configuration

- **Storage.** Services live in a per-user config file managed by
  [`conf`](https://github.com/sindresorhus/conf) under the project name `twofa`
  (e.g. `~/Library/Preferences/twofa-nodejs/config.json` on macOS).
- **Screen capture command.** Override the capture binary with the
  `CAPTURE_COMMAND` environment variable, using `%s` as a placeholder for the
  output image path:

  ```bash
  CAPTURE_COMMAND='/usr/local/bin/screencapture -i %s' twofa add github
  ```

## Development

```bash
npm install
npm test
```

The suite covers the domain (enrollment, code generation, unified errors) and
the full CLI end-to-end, including the native screen-capture path.

## License

[MIT](./license)
