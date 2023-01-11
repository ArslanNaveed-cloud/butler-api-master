const mongoose = require('mongoose')

const Admin = mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    mn: [6, 'Must be at least 6, got {VALUE}'],
    max: 30
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    validate: {
      validator: function (v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v)
      },
      message: 'Please enter a valid email'
    },
    required: [true, 'Email required']
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'roles',
    required: true
  },
  isBanned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('admins', Admin)
