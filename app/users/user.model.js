const mongoose = require('mongoose')
const { SOCIAL, PLATFORM } = require('../../helpers/constants')

const User = mongoose.Schema({
  fullName: {
    type: String,
    max: 30
  },
  firstName: {
    type: String,
    max: 30
  },
  lastName: {
    type: String,
    max: 30
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    validate: {
      validator: function (v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v)
      },
      message: 'Please enter a valid email'
    },
    default: ''
  },
  authType: {
    type: String,
    enum: [SOCIAL, PLATFORM],
    default: PLATFORM
  },
  userType: {
    type: String,
    required: true,
    default: ''
  }, // can be 'client'/'freelancer'
  phone: {
    type: String,
    default: ''
  },
  unverfiedPhone: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''

  },
  address: {
    type: String,
    default: ''
  },
  resume: {
    type: String
  },
  portfolio: [{
    type: String
  }],
  profileImage: {
    type: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isProfileVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  signUpCompleted: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0
  },
  dob: {
    type: Date
  },
  // clientProfession: {
  //   type: String
  // },
  fcmToken: { type: String },
  skills: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'categories'
    }
  ],
  heardFrom: {
    type: String,
    default: ''
  },
  // aboutMe: {
  //   type: String,
  //   default: ''
  // },
  paymentMethod: [{
    securityCode: String,
    expiry: String
  }],
  otp:
  {
    number: String,
    expiry: Date
  }

}, {
  timestamps: true
})

module.exports = mongoose.model('users', User)
