const mongoose = require('mongoose')

const Permissions = mongoose.Schema({
  values: [{ type: String }]
}, {
  timestamps: true
})

module.exports = mongoose.model('permissions', Permissions)
