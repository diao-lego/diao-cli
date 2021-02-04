'use strict';

module.exports = core;
const path =  require('path')
// 版本号比对
const semver = require('semver')
// 控制台输出有颜色的log
const colors = require('colors/safe')
// 获取用户主目录
const userHome = require('user-home')
// 判断路径是否存在
const pathExists = require('path-exists').sync

// 本地包
const pkg = require('../package.json')
const log = require('@diao-cli/log')
const constant = require('./const')

let args

function core() {
  try {
    checkPkgVersion()
    checkNodeVersition()
    checkRoot()
    checkUserHome()
    checkInputArgs()
    // log.verbose('debug', 'test debug log')
    checkEnv()
  } catch (error) {
    log.error(error.message)
  }
}

function checkEnv() {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  if(pathExists(dotenvPath)) {
    dotenv.config({
      path: path.resolve(userHome, '.env')
    })
  }
  crerateDefaultConfig()
  log.verbose('环境变量', process.env.CLI_HOME_PATH)
}

function crerateDefaultConfig() {
  const cliConfig = {
    home: userHome
  }
  if(process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome
}

function checkInputArgs() {
  const minimist = require('minimist')
  args = minimist(process.argv.slice(2))
  checkArgs()
}

function checkArgs() {
  if(args.debug) {
    process.env.LOG_LEVEL = 'verbost'
  } else {
    process.env.LOG_LEVEL = 'info'
  }
  log.level = process.env.LOG_LEVEL
}

function checkUserHome() {
  if(!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不能存在'))
  }
}

function checkRoot() {
  const rootCheck = require('root-check')
  rootCheck()
}

function checkNodeVersition() {
  // 第一步，获取当前node版本号
  const currentVersion = process.version
  // 第二步，比对最低版本号
  const lowestVersion = constant.LOWEST_NODE_VERSION
  if(!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`diao-cli 需要安装 ${lowestVersion} 以上版本的 Node.js`))
  }
}

function checkPkgVersion() {
  log.notice('cli', pkg.version)
}