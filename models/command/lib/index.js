'use strict';

const log = require('@diao-cli/log')
// 版本号比对
const semver = require('semver')
// 控制台输出有颜色的log
const colors = require('colors/safe');
// const { isObject } = require('@diao-cli/utils');

const LOWEST_NODE_VERSION = '12.0.0'


class Command {
  constructor(argv) {
    // log.verbose('Command constructor', argv)
    if(!argv) {
      throw new Error('参数不能为空！')
    }
    if(!Array.isArray(argv)) {
      throw new Error('参数必须为数组！')
    }
    if(argv.length < 1) {
      throw new Error('参数列表为空！')
    }
    this._argv = argv
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => this.checkNodeVersition())
      chain = chain.then(() => this.initArgs())
      chain = chain.then(() => this.init())
      chain = chain.then(() => this.exec())
      chain.catch(err => {
        log.error(err.message)
      })
    })
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1]
    this._argv = this._argv.slice(0, this._argv.length - 1)
  }

  /**
   * @description 最低Node版本号检查功能开发
   */
 checkNodeVersition() {
    // 第一步，获取当前node版本号
    const currentVersion = process.version
    // 第二步，比对最低版本号
    const lowestVersion = LOWEST_NODE_VERSION
    if(!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`diao-cli 需要安装 ${lowestVersion} 以上版本的 Node.js`))
    }
  }

  init() {
    throw new Error('init必须实现！')  
  }
  exec() {
    throw new Error('exec必须实现！')  
  }
}
module.exports = Command