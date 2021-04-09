'use strict';
const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const semver = require('semver')
const userHome = require('user-home')
const fse = require('fs-extra')
const Command = require('@diao-cli/command')
const Package = require('@diao-cli/package')
const log = require('@diao-cli/log')
const { spinnerStart, sleep } = require('@diao-cli/utils')

const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = !!this._argv[1].force
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  async exec() {
    try {
      // 1.准备阶段
      const projectInfo = await this.prepare()
      if(projectInfo) {
        // 2.下载模板
        log.verbose('projectInfo', projectInfo)
        this.projectInfo = projectInfo
        await this.downloadTemplate()
      // 3.安装模板
      }

    } catch (e) {
      log.error(e.message)
    }
  }

  async downloadTemplate() {
    // 1.通过项目模板API获取项目模板信息
    // 1.1通过egg.js搭建一套后端系统
    // 1.2通过npm存储项目模板 (vue-cli/vue-element-admin)
    // 1.3将项目模板信息存储到mongodb数据库中
    // 1.4通过egg.js获取mongodb中的数据并且通过API返回
    // console.log(this.template, this.projectInfo)
    const { projectTemplate } = this.projectInfo
    const templateInfo = this.template.find(item => item.npmName === projectTemplate)
    const targetPath = path.resolve(userHome, '.diao-cli', 'template')
    const storeDir = path.resolve(userHome, '.diao-cli', 'template', 'node_modules')
    const { npmName, version } = templateInfo
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    })
    if(!await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模板...')
      await sleep(2000)
      try {
        await templateNpm.install()
        log.success('下载模板成功')
      } catch (error) {
        throw error
      } finally {
        spinner.stop(true)
      }
    } else {
      const spinner = spinnerStart('正在更新模板...')
      await sleep(2000)
      try {
        await templateNpm.update()
        log.success('更新模板成功')
      } catch (error) {
        throw error
      } finally {
        spinner.stop(true)
      }
    }
  }

  async prepare() {
    // 0判断项目模板是否存在
    const template = await getProjectTemplate()
    if(!template || template.length === 0) {
      throw new Error('当前模板不能存在')
    }
    this.template = template
    const localPath = process.cwd()
    let ifContinue = false
    // 1.判断当前目录是否为空
    if(!this.isDirEmpty(localPath)) {
      if(!this.force) {
        // 询问是否继续创建
        ifContinue = (await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinue',
          default: false,
          message: '当前文件不为空，是否继续创建项目？'
        })).ifContinue
        if(!ifContinue) {
          return
        }
      }
      // 2.是否启动强制更新
      if(ifContinue || this.force) {
        // 给用户做二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '是否确认清空当前目录下的文件？'
        })
        if(confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath)
        }
      }
    }
    return this.getProjectInfo()
  }
  // 获取用户输入的项目信息
  async getProjectInfo() {
    let projectInfo = {}
    // 1.选择创建项目或者组件
    const { type } = await inquirer.prompt({
      name: 'type',
      type: 'list',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [{
        name: '项目',
        value: TYPE_PROJECT
      },{
        name: '组件',
        value: TYPE_COMPONENT
      }]
    })
    // 2.获取项目的基本信息
    if(type === TYPE_PROJECT) {
      const project = await inquirer.prompt([{
        type: 'input',
        name: 'projectName',
        message: '请输入项目名称',
        default: '',
        validate: function(v) {
          const done = this.async();
          // Do async stuff
          setTimeout(function() {
            // 1.首字符必须为英文字符
            // 2.尾字符必须为英文或数字，不能为字符
            // 3.字符仅允许"-_"
            // 合法：a, a-b, a_b, a-b-c, a_b_C, a-b1-c1, a_b1_c1, a1_b1_c1
            // 不合法：1, a_, a-, a_1, a-1
            if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
              done('请输入合法的项目名称');
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: function(v) {
          return v
        }
      }, {
        type: 'input',
        name: 'projectVersion',
        message: '请输入版本号',
        default: '1.0.0',
        validate: function(v) {
          const done = this.async();
          setTimeout(function() {
            if (!(!!semver.valid(v))) {
              done('请输入合法的版本号');
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: function(v) {
          if(semver.valid(v)) {
            return semver.valid(v)
          } else {
            return v
          }
        }
      }, {
        type: 'list',
        name: 'projectTemplate',
        message: '请选择项目模板',
        choices: this.createTemplateChoices()
      }])
      projectInfo = {
        type,
        ...project
      }

    } else if(type === TYPE_COMPONENT) {

    }
    return projectInfo
  }

  createTemplateChoices() {
    return this.template.map(item => ({
      value: item.npmName,
      name: item.name
    }))
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath)
    // 文件过滤逻辑
    fileList = fileList.filter(file => !file.startsWith('.') && ['node_modules'].indexOf(file) < 0)
    return !fileList || fileList.length <= 0
  }

}

function init(argv) {
  // console.log('init', projectName, options.force, process.env.CLI_TARGET_PATH)
  new InitCommand(argv)
}


module.exports = init;
module.exports.InitCommand = InitCommand
