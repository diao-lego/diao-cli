'use strict';

const path = require('path')
const pkgDir = require('pkg-dir').sync
const npminstall = require('npminstall')
const formatPath = require('@diao-cli/format-path')
const { isObject } = require('@diao-cli/utils')
const { getDefaultRegistry, getNpmLaterVersion } =  require('@diao-cli/get-npm-info')
const pathExists = require('path-exists').sync
const fse = require('fs-extra')

class Package {
  constructor(options) {
    if(!options) {
      throw new Error('Package类的options参数不能为空')
    }
    if(!isObject(options)) {
      throw new Error('Package类的options参数必须为对象')
    }
    // package的目标路径
    this.targetPath = options.targetPath
    // 缓存package的存储路径
    this.storeDir = options.storeDir
    // package的name
    this.packageName = options.packageName
    // package的version
    this.packageVersion = options.packageVersion
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_')
  }

  /**
   * @description 创建缓存目录并获取最新版本号
   */
  async perpare() {
    if(this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir)
    }
    if(this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLaterVersion(this.packageName)
    }
  }

  /**
   * @description 获取缓存路径
   */
  get cachFilePath() {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
  }
  /**
   * @description 获取指定版本缓存路径
   * @param { String } packageVersion 版本号
   */
  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
  }

  // 判断当前Package是否存在
  async exists() {
    if(this.storeDir) {
      await this.perpare()
      return pathExists(this.cachFilePath)
    } else {
      return pathExists(this.targetPath)
    }
  }

  // 安装Package
  async install() {
    await this.perpare()
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{
        name: this.packageName,
        version: this.packageVersion
      }]
    })
  }

  // 更新Package
  async update() {
    await this.perpare()
    // 1. 获取最新npm模块版本号
    const lasePackageVersion = await getNpmLaterVersion(this.packageName)
    // 2. 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(lasePackageVersion)
    // 3. 如果不存在，则直接安装最新版本
    if(!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{
          name: this.packageName,
          version: lasePackageVersion
        }]
      })
      this.packageVersion = lasePackageVersion
    } else {
      this.packageVersion = lasePackageVersion
    }
  }

  // 获取入口文件的路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1. 获取Package.json所在目录 - pkg-dir
      const dir = pkgDir(targetPath)
      if(dir) {
        // 2. 读取Package.json - require() js/json/node
        const pkgFile = require(path.resolve(dir, 'package.json'))
        // 3. main/lib - path
        if(pkgFile && pkgFile.main) {
          // 4. 路径的兼容(macOs/windows)
          return formatPath(path.resolve(dir, pkgFile.main))
        }
      }
      return null
    }
    if(this.storeDir) {
      return _getRootFile(this.cachFilePath)
    } else {
      return _getRootFile(this.targetPath)
    }
  }

}

module.exports = Package;


