const request = require('@diao-cli/request')

module.exports = function() {
  return request({
    url: '/project/template',
  })
}