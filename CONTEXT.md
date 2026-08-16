# twofa — domain & seam context

## Concepts
- **Service** — a registered two-factor account, keyed by a name in the CLI (`add/del/gen/qrcode <service>`).
- **Provisioning URI** — the `otpauth://` string encoding a Service's secret (and algorithm).
- **Enroll** — register a Service by capturing its QRCode.
- **Code** — the generated one-time verification code for a Service.

## Seams (modules)
- **TwoFA** — the enrollment / generation domain. Accepts a `store` and a `qrSource` adapter at the constructor.
- **ServiceStore** — persistence. Small interface `find / all / put / remove`. Real adapter wraps `conf`; tests inject an in-memory fake at the construction seam.
- **QRCodeSource** — turns a QRCode image into a Provisioning URI. Two internal adapters (screen-grab / image-file) satisfy the single `captureQRCode` interface; image decoding (Jimp + jsQR) stays inside.
- **TwoFAError** — the single error shape. Every rejection carries `{ code, message }`.

## Error codes
- `SERVICE_EXISTS`, `SERVICE_NOT_FOUND`, `INVALID_QRCODE`, `CAPTURE_FAILED`. Library errors (e.g. an invalid `otpauth` URI) bubble through with their own `.message`.