const mongoose = require('mongoose')

const Role = mongoose.Schema({
  title: {
    type: String,
    required: true,
    mn: [3, 'Must be at least 3, got {VALUE}'],
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  permissions: [{
    type: String,
    required: true
  }]
}, {
  timestamps: true
})

module.exports = mongoose.model('roles', Role)
