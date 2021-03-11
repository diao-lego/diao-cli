#! /usr/bin/env node

const importLocal = require('import-local')

if(importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用 diao-cli 本地版本')
} else {
  require('../lib')(process.argv.slice(2))
}




// const { hideBin } = require('yargs/helpers')
/* const dedent = require("dedent");
const yargs  = require('yargs/yargs')
const pkg = require("../package.json");

const context = {
  diaoVersion: pkg.version,
};

const cli = yargs()
const argv = process.argv.slice(2)
cli
  .usage('Usage: diao-cli [command] <options>')
  .demandCommand(1, "A command is required. Pass --help to see all available commands and options.")
  .strict()
  .recommendCommands()
  .fail((err, msg) => {
    console.error('err:', err)
  })
  .alias('h', 'help')
  .alias('v', 'version')
  .wrap(cli.terminalWidth())
  .epilogue(dedent`
    When a command fails, all logs are written to lerna-debug.log in the current working directory.

    For more information, find our manual at https://github.com/lerna/lerna
  `)
  .options({
    debug: {
      type: 'boolean',
      describe: 'Bootstrap debug mode',
      alias: 'd'
    }
  })
  .option("registry", {
    type: "string",
    describe: 'Define global registry',
    alias: 'r'
  })
  .group(['debug'], 'Dev Options')
  .group(['registry'], 'Extra Options')
  .command('init [name]', 'Do init a project', (yargs) => {
    yargs
      .option('name', {
        type: 'string',
        describe: 'Name of a project',
        alias: 'n'
      })
  }, (argv) => {
    console.log(argv)
  })
  .command({
    command: 'list',
    aliases: ['ls', 'la', 'll'],
    describe: 'List local packages',
    builder: (yargs) => {},
    handler: (argv) => {
      console.log(argv)
    }
  })
  .parse(argv, context) */

