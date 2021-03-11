'use strict';

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion
};

/**
 * @description 获取指定npm包信息
 * @param { String } npmName 报名
 * @param { String } registry 源地址
 * @returns { Object } 包信息
 */
function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null
  }
  const registryUrl = registry || getDefaultRegistry()
  const npmInfoUrl = urlJoin(registryUrl, npmName)
  return axios.get(npmInfoUrl)
  .then(response => {
    if(response.status === 200) {
      return response.data
    }
    return null
  }).catch(err => {
    return Promise.reject(err)
  })
}

/**
 * @description 获取默认源地址
 * @param { Boolean } isOriginal 是否原生地址
 * @returns { String } 源地址
 */
function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'http://registry.npmjs.org' :  'http://registry.npm.taobao.org/'
}

/**
 * @description 获取版本号集合
 * @param { String } npmName 报名
 * @param { String } registry 源地址
 * @returns { Array } 版本号
 */
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if(data) {
    return Object.keys(data.versions)
  } else {
    return []
  }
}

/**
 * @description 获取大于等当前版本的版本号
 * @param {String } baseVersion 基础版本号
 * @param { Array } versions 所有版本号
 * @returns { Array } 符合条件的版本号
 */
function getNpmSemverVersions(baseVersion, versions) {
  // 筛选大于等于baseVersion的version
  return versions.filter(version => semver.satisfies(version, `>=${baseVersion}`))
  // 降序
  .sort((a, b) => semver.gt(b, a))
}

/**
 * @description 获取最新版本号
 * @param {String} baseVersion 基础版本
 * @param {String} npmName 包名
 * @param {Strinf} registry 源地址
 * @returns laseVersion
 */
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry)
  const newVersions = getNpmSemverVersions(baseVersion, versions)
  if(newVersions && newVersions.length > 0) {
    return newVersions[0]
  }
  return null
}