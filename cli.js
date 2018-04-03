#!/usr/bin/env node
const chalk = require('chalk');
const program = require('commander')
const Table = require('cli-table');
const qrcodeGen = require('qrcode-terminal');
const TwoFA = require('./TwoFA');

const twofa = new TwoFA();

const __stdout = message => {
  console.log(message);
};

__stdout.error = message => __stdout(chalk.red.bold(message));
__stdout.success = message => __stdout(chalk.green(message));

program
  .command('add <service>')
  .description('Add a new service to generate authentication code')
  .option('-i, --image [image]', 'Image instead screen capture')
  .action((service, cmd) => {
    twofa.add(service, {
      imagePath: cmd.image,
    })
    .then(() =>
      __stdout.success(`The "${service}" added with success!`)
    )
    .catch(error => __stdout.error(error));
  });

program
  .command('del <service>')
  .description('Delete a service registered')
  .action(service => {
    twofa.del(service)
      .then(() =>
        __stdout.success(`The "${service}" deleted with success!`)
      )
      .catch(error => __stdout.error(error));
  });

program
  .command('gen [service]')
  .description('Generate authentication code')
  .action(service => {
    twofa.gen(service)
      .then(code => {
        const msg = `The code for "${service} - ${code.label}" is: ${code.code}`;
        if (service) {
          return __stdout.success(msg);
        }

        if (!Array.isArray(code)) {
          return __stdout.error('Something is wrong.');
        }

        const table = new Table({
          head: ['SERVICE', 'LABEL', 'CODE'],
        });
        code.map(c => table.push([c.service, c.label, c.code]));

        console.log('Listing all services and your codes.');
        return __stdout.success(
          table.toString()
        );
      })
      .catch(e => __stdout.error(e));
  });

program
  .command('qrcode <service>')
  .description('Generate qrcode from a service')
  .action(service => {
    twofa.qrcode(service)
      .then(qrcode => {
        __stdout.success(`Show QRCode for "${service}".\n`);
        console.log(qrcode);
      })
      .catch(e => __stdout.error(e));
  });

program.parse(process.argv);
