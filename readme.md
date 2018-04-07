# twofa
> Two Factor Authentication Generator for CLI

[![npm version](https://img.shields.io/npm/v/twofa.svg?style=flat-square)](https://www.npmjs.com/package/twofa)
[![Build Status] (https://img.shields.io/travis/paulovitin/twofa/master.svg?style=flat-square)](https://travis-ci.org/paulovitin/twofa)
[![AppVeyor](https://img.shields.io/appveyor/ci/paulovitin/twofa.svg?style=flat-square&logo=appveyor)](https://ci.appveyor.com/project/paulovitin/twofa)
[![Coverage Status](https://img.shields.io/coveralls/paulovitin/twofa/master.svg?style=flat-square)](https://coveralls.io/github/paulovitin/twofa?branch=master)

## Install

```
$ npm install -g twofa
```

## Usage

```
$ twofa --help

Usage: twofa [options] [command]

  Options:

    -h, --help               output usage information

  Commands:

    add [options] <service>  Add a new service to generate authentication code
    del <service>            Delete a service registered
    gen [service]            Generate authentication code
    qrcode <service>         Generate qrcode from a service
```

## Commands


### add service-name [--image=qrcode]

Register a new service using a screencapture or pass optionaly a image path

```shell
$ twofa add github # use the mouse to capture a qrcode area
```
Or
```
$ twofa add github --image githubqrcode.png
```

### del service-name

Delete a registered service

```shell
$ twofa del github
```

### gen [service-name]

Generate the Authentication code from a service

```shell
$ twofa gen github
```

Or generate a list of registered codes ommiting the service-name

```shell
$ twofa gen
```

### qrcode service-name

Generate a qrcode from a service. This can be helpful to register the same qrcode in another application for generate authentication codes

```shell
$ twofa qrcode github
```

Thats it...