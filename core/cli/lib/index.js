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
// command
const commander = require('commander')
// 本地包
const pkg = require('../package.json')
const log = require('@diao-cli/log')
const exec = require('@diao-cli/exec')
const constant = require('./const');

// let args

const program = new commander.Command()

async function core() {
  try {
    await prepare()
    registerCommand()
    log.verbose('debug', 'test debug log')
  } catch (error) {
    log.error(error.message)
    if(program.opts().debug) {
      console.log(error)
    }
  }
}
/**
 * @description 注册command命令
 */
function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '125')

  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(exec)

  // 开启debug模式
  program.on('option:debug', function() {
    if(program.opts().debug) {
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'info'
    }
    log.level = process.env.LOG_LEVEL
  })

  // 指定targetPath
  program.on('option:targetPath', function() {
    process.env.CLI_TARGET_PATH = program.opts().targetPath
  })

  // 监听未知命令
  program.on('command:*', function(obj) {
    const availableCommands = program.commands.map(cnd => cnd.name())
    console.log(colors.red('未知的命令：' + obj[0]))
    if(availableCommands.length > 0) {
      console.log(colors.red('可用命令：' + availableCommands.join(',')))
    }
  })
  
  program.parse(process.argv)

  if(program.args && program.args.length < 1) {
    program.outputHelp()
  }
}

/**
 * @description 初始化准备工作
 */
async function prepare() {
  checkPkgVersion()
  checkRoot()
  checkUserHome()
  // checkInputArgs()
  checkEnv()
  await checkGlobalUpdate()
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
  // log.verbose('环境变量', process.env.CLI_HOME_PATH)
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

// /**
//  * @description 检查入参
//  */
// function checkInputArgs() {
//   // minimist参数解析库
//   const minimist = require('minimist')
//   args = minimist(process.argv.slice(2))
//   checkArgs()
// }

// /**
//  * @description 检查参数
//  */
// function checkArgs() {
//   if(args.debug) {
//     process.env.LOG_LEVEL = 'verbost'
//   } else {
//     process.env.LOG_LEVEL = 'info'
//   }
//   log.level = process.env.LOG_LEVEL
// }

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
 * @description 检查版本号
 */
function checkPkgVersion() {
  log.notice('cli', pkg.version)
}