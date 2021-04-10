'use strict';
/**
 * @description 判断是否为对象
 * @param {any} o 目标变量
 * @returns {Boolean}
 */
function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

/**
 * @description li-spinne，命令行loading
 * @param {string} msg loading文案
 * @param {string} spinnerString 动画过渡
 * @returns {Spinner}
 */
function spinnerStart(msg = 'loading', spinnerString = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner
  const spinner = new Spinner(msg + ' %s')
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner
}

/**
 * @description sleep
 * @param {number} timeout 延迟时长
 */
function sleep(timeout = 1000) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

/**
 * @description 子进程执行命令兼容封装
 * @param {string} command 要运行的命令
 * @param {string[]} args 字符串参数的列表。
 * @param {Object} options options
 * @returns {ChildProcess}
 */
function exec(command, args, options) {
  const win32 = process.platform === 'win32'
  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args
  return require('child_process').spawn(cmd, cmdArgs, options || {})
}

/**
 * 
 * @param {string} command 要运行的命令
 * @param {string[]} args 字符串参数的列表。
 * @param {Object} options options
 * @returns {Promise}
 */
function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options)
    p.on('error', e => {
      reject(e)
    })
    p.on('exit', c => {
      resolve(c)
    })
  })
}

module.exports = {
  isObject,
  spinnerStart,
  sleep,
  exec,
  execAsync
};