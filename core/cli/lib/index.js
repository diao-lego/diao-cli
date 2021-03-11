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

async function core() {
  try {
    checkPkgVersion()
    checkNodeVersition()
    checkRoot()
    checkUserHome()
    checkInputArgs()
    // log.verbose('debug', 'test debug log')
    checkEnv()
    checkGlobalUpdate()
  } catch (error) {
    log.error(error.message)
  }
}

/**
 * @description 检查版本更新
 */
async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version
  const npmName = pkg.name
  // 2. 调用npm API，获取所有版本号
  // 3. 提取所有版本号，比对哪些版本号是大于当前版本号
  // 4. 获取最新版本号，提示用户更新到该版本
  const { getNpmSemverVersion } = require('@diao-cli/get-npm-info')
  const laseVersion = await getNpmSemverVersion(currentVersion, npmName)
  // 如果laseVersion大于currentVersion
  if(laseVersion && semver.gt(laseVersion, currentVersion)) {
    log.warn('更新提示', colors.yellow(`请手动更新 ${npmName}, 当前版面${currentVersion}, 最新版本: ${laseVersion}
更新命令: npm install -g ${npmName}`))
  }

}

/**
 * @description 检查环境变量
 */
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

/**
 * @description 检查入参
 */
function checkInputArgs() {
  // minimist参数解析库
  const minimist = require('minimist')
  args = minimist(process.argv.slice(2))
  checkArgs()
}

/**
 * @description 检查参数
 */
function checkArgs() {
  if(args.debug) {
    process.env.LOG_LEVEL = 'verbost'
  } else {
    process.env.LOG_LEVEL = 'info'
  }
  log.level = process.env.LOG_LEVEL
}

/**
 * @description 检查用户主目录
 */
function checkUserHome() {
  if(!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不能存在'))
  }
}

/**
 * @description 检查root启动
 */
function checkRoot() {
  const rootCheck = require('root-check')
  rootCheck()
}

/**
 * @description 最低Node版本号检查功能开发
 */
function checkNodeVersition() {
  // 第一步，获取当前node版本号
  const currentVersion = process.version
  // 第二步，比对最低版本号
  const lowestVersion = constant.LOWEST_NODE_VERSION
  if(!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`diao-cli 需要安装 ${lowestVersion} 以上版本的 Node.js`))
  }
}

/**
 * @description 检查版本号
 */
function checkPkgVersion() {
  log.notice('cli', pkg.version)
}