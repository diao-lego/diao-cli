'use strict';
const fs = require('fs')
const path = require('path')
// 命令行交互
const inquirer = require('inquirer')
// npm的语义版本控制程序
const semver = require('semver')
// 获取用户主目录
const userHome = require('user-home')
// 操作文件系统方法
const fse = require('fs-extra')
const glob = require('glob')
const ejs = require('ejs')
const Command = require('@diao-cli/command')
const Package = require('@diao-cli/package')
const log = require('@diao-cli/log')
const { spinnerStart, sleep, execAsync } = require('@diao-cli/utils')

// 获取项目模板信息接口
const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

const TEMPLATE_TYPE_NORMAL = 'normal'
const TEMPLATE_TYPE_CUSTOM = 'custom'

// 命令白名单
const WHITE_COMMAND = ['npm', 'cnpm']

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
        await this.installTemplate()
      
      }

    } catch (e) {
      log.error(e.message)
      if(process.env.LOG_LEVEL === 'verbose') {
        console.log(e)
      }
    }
  }

  async installTemplate() {
    if(this.templateInfo) {
      if(!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL
      }
      if(this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate()
      } else if(this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate()
      } else {
        throw new Error('无法识别项目模板类型！')
      }
    } else {
      throw new Error('项目模板不存在！')
    }
  }

  checkCommand(cmd) {
    if(WHITE_COMMAND.includes(cmd)) {
      return cmd
    }
    return null
  }

  async execCommand(command, errMsg) {
    let ret
    if(command) {
      const cmdArray = command.split(' ')
      const cmd = this.checkCommand(cmdArray[0])
      if(!cmd) {
        throw new Error('命令不存在！命令：' + command)
      }
      const args = cmdArray.slice(1)
      ret = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      })
    }
    if(ret !== 0) {
      throw new Error(errMsg)
    }
    return ret
  }

  ejsRender(options) {
    const dir = process.cwd()
    return new Promise((resolve, reject) => {
      glob('**', {
        cwd: dir,
        ignore: options.ignore || '',
        nodir: true
      }, (err, files) => {
        if(err) {
          reject(err)
        }
        // console.log(files)
        Promise.all(files.map(file => {
          const filePath = path.join(dir, file)
          const projectInfo = this.projectInfo
          return new Promise((resolve1, reject1) => {
            ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
              if(err) {
                reject1(err)
              } else {
                fse.writeFileSync(filePath, result)
                resolve1(result)
              }
            })
          })
        })).then(() => {
          resolve()
        }).catch(err => {
          reject(err)
        })
      })
    })
  }

  async installNormalTemplate() {
    // 拷贝模板代码至当前目录
    let spinner = spinnerStart('正在安装模板...')
    await sleep(1000)
    try {
      const templatePath = path.resolve(this.templateNpm.cachFilePath, 'template')
      const targetPath = process.cwd()
      fse.ensureDirSync(templatePath)
      fse.ensureDirSync(targetPath)
      fse.copySync(templatePath, targetPath)
    } catch (error) {
      throw error
    } finally {
      spinner.stop(true)
      log.success('模板安装成功')
    }
    const templateIgnore = this.templateInfo.ignore || []
    const ignore = ['**/node_modules/**', ...templateIgnore]
    await this.ejsRender({
      ignore
    })
    // 依赖安装
    const { installCommand, startCommand } = this.templateInfo
    await this.execCommand(installCommand, '依赖安装过程失败！')
    // 启动命令执行
    await this.execCommand(startCommand, '启动项目失败！')

  }

  async installCustomTemplate() {
    // 查询自定义模板的入口文件
    if(await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath()
      if(fse.existsSync(rootFile)) {
        log.notice('开始执行自定义模板')
        const templatePath = path.resolve(this.templateNpm.cachFilePath, 'template')
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd(),
        }
        const code = `require('${rootFile}')(${JSON.stringify(options)})`
        log.verbose('code', code)
        await execAsync('node', ['-e', code], {
          stdio: 'inherit',
          cwd: process.cwd()
        })
        log.success('自定义模板安装成功!')
      } else {
        throw new Error('自定义模板入口文件不存在!')
      }
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
    console.log(npmName, version)
    this.templateInfo = templateInfo
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    })
    if(!await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模板...')
      await sleep(1000)
      try {
        await templateNpm.install()
      } catch (error) {
        throw error
      } finally {
        spinner.stop(true)
        if(await templateNpm.exists()) {
          log.success('下载模板成功')
          this.templateNpm = templateNpm
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模板...')
      await sleep(1000)
      try {
        await templateNpm.update()
      } catch (error) {
        throw error
      } finally {
        spinner.stop(true)
        if(await templateNpm.exists()) {
          log.success('更新模板成功')
          this.templateNpm = templateNpm
        }
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
    function isValidName(v) {
      // 1.首字符必须为英文字符
      // 2.尾字符必须为英文或数字，不能为字符
      // 3.字符仅允许"-_"
      // 合法：a, a-b, a_b, a-b-c, a_b_C, a-b1-c1, a_b1_c1, a1_b1_c1
      // 不合法：1, a_, a-, a_1, a-1
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
    }
    let projectInfo = {}
    let isProjectNameValid = false
    if(isValidName(this.projectName)) {
      isProjectNameValid = true
      projectInfo.projectName = this.projectName
    }
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
    this.template = this.template.filter(template => template.tag.includes(type))
    const title = type === TYPE_PROJECT ? '项目' : '组件'
    const projectNamePrompt = {
      type: 'input',
      name: 'projectName',
      message: `请输入${title}名称`,
      default: '',
      validate: function(v) {
        const done = this.async();
        // Do async stuff
        setTimeout(function() {
          if (!isValidName(v)) {
            done(`请输入合法的${title}名称`);
            return;
          }
          done(null, true);
        }, 0);
      },
      filter: function(v) {
        return v
      }
    }
    const projectPrompt = []
    if(!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt)
    }
    projectPrompt.push({
      type: 'input',
      name: 'projectVersion',
      message: `请输入${title}版本号`,
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
      message: `请选择${title}模板`,
      choices: this.createTemplateChoices()
    })
    if(type === TYPE_PROJECT) {
      // 2.获取项目的基本信息
      const project = await inquirer.prompt(projectPrompt)
      projectInfo = {
        ...projectInfo,
        type,
        ...project
      }

    } else if(type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: 'input',
        name: 'componentDescription',
        message: '请输入组件描述信息',
        default: '',
        validate: function(v) {
          const done = this.async();
          setTimeout(function() {
            if (!v) {
              done('请输入组件描述信息');
              return;
            }
            done(null, true);
          }, 0);
        }
      }
      projectPrompt.push(descriptionPrompt)
      // 获取组件基本信息
      const component = await inquirer.prompt(projectPrompt)
      projectInfo = {
        ...projectInfo,
        type,
        ...component
      }
    }
    // 生成className
    if(projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName
      projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '')
    }
    if(projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }
    if(projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription
    }
    log.verbose(projectInfo)
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
