/* eslint-disable no-useless-catch */
const jwt = require('jsonwebtoken')
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const bcrypt = require('bcrypt')
const { BAD_REQUEST, INTERNAL_ERR, NOT_FOUND, UN_AUTHORIZED, FORBIDDEN } = require('../../helpers/HTTP.CODES')
const { validUserSchemaPost } = require('../../helpers/validation.schema')
const User = require('./user.model')
const { sendEmail } = require('../emails/mailer')
const fs = require('fs')
const { promisify } = require('util')
const Job = require('../jobs/job.model')
const { CLIENT, FREELANCER, SOCIAL, ACCEPTED } = require('../../helpers/constants')
const unlinkAsync = promisify(fs.unlink)
const moment = require('moment')
const { sendSMS } = require('../../helpers/messaging')
exports.userLogin = async (body) => {
  try {
    if ((!body.email || body.email.trim().length === 0) && (!body.phone || body.phone.trim().length === 0)) {
      throw ErrorHandler('phone or email is required', BAD_REQUEST)
    }
    if (!body.password) {
      throw ErrorHandler('password is required', BAD_REQUEST)
    }
    const q = body.email ? { email: body.email } : { phone: body.phone }
    const user = await User.findOne(q).lean()
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    if (user.isBanned) {
      throw ErrorHandler('account suspended contact Adminstrator', FORBIDDEN)
    }
    let validPass
    if (user.authType === SOCIAL) {
      validPass = body.password === user.password
    } else {
      validPass = await bcrypt.compare(body.password, user.password)
    }
    if (!validPass) {
      throw ErrorHandler('incorrect password', BAD_REQUEST)
    }
    const accessToken = jwt.sign({
      id: user._id,
      fullName: user.fullName,
      userType: user.userType,
      email: user.email
    }, process.env.SECRET_JWT)
    delete user.password
    delete user.otp
    return { accessToken: accessToken, user: user }
  } catch (error) {
    throw error
  }
}
exports.userSignUp = async (body, files) => {
  try {
    body.portfolio = files?.portfolio && files.portfolio.length ? files.portfolio.map(item => { return `${process.env.SERVER_URL}${item.path}` }) : undefined
    body.resume = files?.resume && files.resume.length ? files.resume.map(item => { return `${process.env.SERVER_URL}${item.path}` })[0] : undefined
    body.profileImage = files?.profileImage && files.profileImage.length ? files.profileImage.map(item => { return `${process.env.SERVER_URL}${item.path}` })[0] : undefined
    const { error } = validUserSchemaPost(body)
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    if ((!body.email || body.email.trim().length === 0)) {
      throw ErrorHandler('email is required', BAD_REQUEST)
    }
    const q = { $or: [{ email: body.email }] }
    if (body.phone) {
      q.$or[1] = { phone: body.phone }
    }
    const user = await User.findOne(q)
    if (user) {
      throw ErrorHandler('email or phone already exist', BAD_REQUEST)
    }
    body.fullName = body.firstName || '' + ' '
    if (body.lastName) {
      body.fullName = body.fullName + body.fullName
    }
    const newUser = new User(body)
    const salt = await bcrypt.genSalt(10)
    if (body.authType !== SOCIAL) {
      // save parword's hash if not social sign up else save password as it is
      newUser.password = await bcrypt.hash(newUser.password, salt)
    }
    let saved = await newUser.save()
    const accessToken = jwt.sign({
      id: saved._id,
      fullName: saved.fullName,
      userType: saved.userType,
      email: saved.email
    }, process.env.SECRET_JWT)
    const templateHbs = newUser.userType === FREELANCER ? 'registration-freelancer.hbs' : 'registration-client.hbs'
    if (newUser.email && newUser.email.length) {
      sendEmail(newUser.email,
        {
          name: newUser.fullName,
          userType: newUser.userType,
          verificationLink: `${process.env.SERVER_URL}user/verify-email/${saved._id}`
        },
        `Welcome on board ${newUser.fullName}`, templateHbs)
    }
    saved = JSON.parse(JSON.stringify(saved))
    delete saved.password
    return { accessToken: accessToken, user: saved }
  } catch (error) {
    deleteUnprocessedFiles(body)
    throw error
  }
}
exports.genrateOTP = async (currentUser, phone) => {
  try {
    const user = await User.findById(currentUser.id)
    if (!user) {
      throw ErrorHandler('user not found', BAD_REQUEST)
    }
    if (user.phone === phone && user.isPhoneVerified) {
      throw ErrorHandler('phone already verified', BAD_REQUEST)
    }
    if (!phone) {
      throw ErrorHandler('phone number not found', BAD_REQUEST)
    }
    user.unverfiedPhone = phone
    // generating random OTP //
    // n is length of OTP
    const n = 4
    const OTP = [...Array(n)].map(_ => Math.random() * 10 | 0).join``
    user.otp = {
      number: OTP,
      expiry: moment().add(process.env.OTP_EXPIRY_MIN, 'minutes')
    }
    sendSMS(`<#>${OTP} is your One Time Password (OTP) for Butler App.Do not Share this password with anyone.`, user.unverfiedPhone)
    await user.save()
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.verifyOTP = async (currentUser, otp) => {
  try {
    const user = await User.findById(currentUser.id)
    if (!user) {
      throw ErrorHandler('user not found', BAD_REQUEST)
    }
    if (user.otp?.number !== otp) {
      throw ErrorHandler('OTP doesnot match', BAD_REQUEST)
    }
    if (moment() < moment(user.otp.expiry)) {
      user.phone = user.unverfiedPhone
      user.unverfiedPhone = null
      user.isPhoneVerified = true
    } else {
      throw ErrorHandler('OTP expired', BAD_REQUEST)
    }
    await user.save()
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.updateUser = async (req, id) => {
  try {
    let user = await User.findById(id)
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    // adding userType to body for conditional validation
    req.body.userType = user.userType
    const { files } = req
    if (files && files.portfolio) {
      req.body.portfolio = files && files.portfolio && files.portfolio.length ? files.portfolio.map(item => { return `${process.env.SERVER_URL}${item.path}` }) : undefined
    }
    if (files && files.resume) {
      req.body.resume = files && files.resume && files.resume.length ? files.resume.map(item => { return `${process.env.SERVER_URL}${item.path}` })[0] : undefined
    }
    if (files && files.profileImage) {
      req.body.profileImage = files && files.profileImage && files.profileImage.length ? files.profileImage.map(item => { return `${process.env.SERVER_URL}${item.path}` })[0] : undefined
    }

    // removing userType to since it cannot be updated
    delete req.body.userType

    if (req.body.password) {
      if (user.authType === SOCIAL) {
        user.password = req.body.password
      } else {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(req.body.password, salt)
      }
    }
    user.firstName = req.body.firstName ? req.body.firstName : user.firstName
    user.lastName = req.body.lastName ? req.body.lastName : user.lastName
    if (user.fullName) {
      if (req.body.firstName) {
        const tempArr = user.fullName.split(' ')
        tempArr[0] = req.body.firstName
        user.fullName = tempArr.join(' ')
      }
      if (req.body.lastName) {
        const tempArr = user.fullName.split(' ')
        tempArr[1] = req.body.lastName
        user.fullName = tempArr.join(' ')
      }
    } else {
      user.fullName = user.firstName || '' + ' ' + user.lastName || ''
    }

    // user.phone = req.body.phone ? req.body.phone : user.phone
    user.country = req.body.country ? req.body.country : user.country
    user.address = req.body.address ? req.body.address : user.address
    user.resume = req.body.resume ? req.body.resume : user.resume
    user.portfolio = req.body.portfolio ? [...user.portfolio, ...req.body.portfolio] : user.portfolio
    user.profileImage = req.body.profileImage ? req.body.profileImage : user.profileImage
    user.skills = req.body.skills ? req.body.skills : user.skills
    user.heardFrom = req.body.heardFrom ? req.body.heardFrom : user.heardFrom
    // user.aboutMe = req.body.aboutMe ? req.body.aboutMe : user.aboutMe
    user.dob = req.body.dob ? req.body.dob : user.dob
    // user.clientProfession = req.body.clientProfession ? req.body.clientProfession : user.clientProfession
    user.signUpCompleted = (req.body.signUpCompleted && typeof (JSON.parse(req.body.signUpCompleted)) === 'boolean') ? JSON.parse(req.body.signUpCompleted) : user.signUpCompleted
    await user.save()
    user = JSON.parse(JSON.stringify(user))
    // delete user.password

    return user
  } catch (error) {
    deleteUnprocessedFiles(req.body)
    throw error
  }
}
exports.getMyProfile = async (id) => {
  try {
    const user = await User.findById(id).populate('skills').lean()
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    return user
  } catch (error) {
    throw error
  }
}
exports.adminUpdatesUser = async (req, id) => {
  try {
    const user = await User.findById(id)
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    const { isProfileVerified, isBanned, skills } = req.body
    if (skills && skills.length) {
      user.skills = skills
    }

    if (isProfileVerified !== undefined && typeof (JSON.parse(isProfileVerified)) === 'boolean') {
      user.isProfileVerified = JSON.parse(isProfileVerified)
    }
    if (isBanned !== undefined && typeof (JSON.parse(isBanned)) === 'boolean') {
      user.isBanned = JSON.parse(isBanned)
    }
    await user.save()
    return user
  } catch (error) {
    throw error
  }
}
exports.getAll = async (queryParams) => {
  try {
    const sortBy = queryParams.sortBy ? queryParams.sortBy : 'createdAt'
    const pageNo = queryParams.pageNo ? Number(queryParams.pageNo) : 1
    const userType = queryParams.userType ? queryParams.userType : null
    const pageSize = queryParams.pageSize ? Number(queryParams.pageSize) : 10
    let skills = queryParams.skills ? queryParams.skills : undefined
    if (typeof skills === 'string') {
      skills = [skills]
    }
    const q = queryParams.q ? queryParams.q : ''
    const order = queryParams.order && queryParams.order === 'desc' ? -1 : 1
    const skip = pageNo === 1 ? 0 : ((pageNo - 1) * pageSize)
    const query = [{ fullName: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { country: { $regex: q, $options: 'i' } },
      { address: { $regex: q, $options: 'i' } }
      // { aboutMe: { $regex: q, $options: 'i' } }
    ]
    const pipline = [
      {
        $match: {
          $or: query
        }
      },
      { $skip: skip },
      { $limit: pageSize },
      { $sort: { [sortBy]: order } }
    ]
    const matchIndex = pipline.findIndex(aq => aq.$match)
    if (queryParams.isBanned) {
      pipline[matchIndex] = {
        $match: {
          ...pipline[matchIndex].$match,
          isBanned: JSON.parse(queryParams.isBanned)
        }
      }
    }
    if (queryParams.isProfileVerified) {
      pipline[matchIndex] = {
        $match: {
          ...pipline[matchIndex].$match,
          isProfileVerified: JSON.parse(queryParams.isProfileVerified)
        }
      }
    }
    if (skills) {
      pipline[matchIndex] = {
        $match: {
          ...pipline[matchIndex].$match,
          $or: [{ 'skills.name': { $in: skills } },
            { 'skills.path': { $in: skills.map(s => { return new RegExp(`,${s},`) }) } }]
        }
      }
    }
    if (userType) {
      pipline[matchIndex] = {
        $match: {
          ...pipline[matchIndex].$match,
          userType: userType

        }
      }
    }

    let users = await User.aggregate([
      {
        $facet: {
          results: [
            {
              $lookup: {
                from: 'categories',
                localField: 'skills',
                foreignField: '_id',
                as: 'skills'
              }
            },
            ...pipline
          ],
          count: [
            {
              $lookup: {
                from: 'categories',
                localField: 'skills',
                foreignField: '_id',
                as: 'skills'
              }
            },
            { $match: { ...pipline[matchIndex].$match } },
            { $count: 'totalCount' }]
        }
      }
    ])
    users = JSON.parse(JSON.stringify(users))
    if (userType === FREELANCER && queryParams.jobCount) {
      for await (const user of users[0].results) {
        user.assignedJobs = await Job.countDocuments({ 'assignedTo.id': user._id, status: ACCEPTED })
      }
    }
    return { data: users[0].results, totalCount: users[0].count[0]?.totalCount || 0 }
  } catch (error) {
    throw error
  }
}
exports.getTopClients = async (queryParams) => {
  try {
    const clients = await User.aggregate([
      { $match: { userType: CLIENT } },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: 'client.id',
          as: 'jobs'
        }
      },
      {
        $project: {
          fullName: 1,
          createdAt: 1,
          rating: 1,
          phone: 1,
          jobs: { $size: '$jobs' }
        }
      },
      {
        $sort: {
          jobs: -1
        }
      }, {
        $limit: 5
      }
    ])
    console.log(clients)
    return clients
  } catch (error) {
    throw error
  }
}
exports.getById = async (id) => {
  try {
    const user = await User.findById(id).populate('skills').lean()
    if (!user) {
      throw ErrorHandler('user not found', NOT_FOUND)
    }
    return user
  } catch (error) {
    throw error
  }
}
exports.deleteUser = async (id) => {
  try {
    const user = await User.findById(id).lean()
    if (!user) {
      throw ErrorHandler('user not found', NOT_FOUND)
    }
    await User.findByIdAndDelete(id)
    return
  } catch (error) {
    throw error
  }
}
exports.deleteFile = async (userId, { attachmentType, address }) => {
  try {
    const dbUserInstance = await User.findById(userId)
    if (!dbUserInstance) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    if (!attachmentType || !address) {
      throw ErrorHandler('attachmentType and address are required', BAD_REQUEST)
    }
    if (attachmentType !== 'portfolio' && attachmentType !== 'resume' && attachmentType !== 'profileImage') {
      throw ErrorHandler('imvalid attachmentType allowed types are portfolio,resume,profileImage', BAD_REQUEST)
    }
    if (attachmentType === 'portfolio') {
      dbUserInstance.portfolio = dbUserInstance.portfolio.filter(att => att !== address)
      await deleteUnprocessedFiles({ portfolio: [address] })
    }
    if (attachmentType === 'resume') {
      dbUserInstance.resume = ''
      await deleteUnprocessedFiles({ resume: address })
    }
    if (attachmentType === 'profileImage') {
      dbUserInstance.profileImage = ''
      await deleteUnprocessedFiles({ profileImage: address })
    }
    await dbUserInstance.save()
    return
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.verifyEmail = async (id) => {
  try {
    if (!id) {
      throw ErrorHandler('id required in params', BAD_REQUEST)
    }
    const user = await User.findById(id)
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    user.isEmailVerified = true
    user.save()
    return
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
// exports.addPaymentMethod = async (userId, paymentMethod) => {
//   try {
//     const user = await User.findById(userId)
//     if (!user) {
//       throw ErrorHandler('no associated user found', BAD_REQUEST)
//     }
//     const { error } = validPaymentMehthodSchema(paymentMethod)

//     if (error) {
//       throw ErrorHandler(error.message, BAD_REQUEST)
//     }
//     if (user.paymentMethods && user.paymentMethods.length) {
//       const duplicatePM = user.paymentMethods.findIndex((pm) => decryptText(pm.cardNumber) === paymentMethod.cardNumber) > -1
//       if (duplicatePM) {
//         throw ErrorHandler('duplicate cardNumber', BAD_REQUEST)
//       }
//       paymentMethod.isDefault = paymentMethod.isDefault !== undefined ? JSON.parse(paymentMethod.isDefault) : false
//       if (typeof (paymentMethod.isDefault) === 'boolean' && paymentMethod.isDefault === true) {
//         user.paymentMethods.forEach(pm => {
//           pm.isDefault = false
//         })
//       }
//       Object.keys(paymentMethod).forEach((k) => {
//         if (typeof paymentMethod[k] === 'string') {
//           paymentMethod[k] = encryptText(paymentMethod[k])
//         }
//       })
//       user.paymentMethods.push(paymentMethod)
//     } else {
//       Object.keys(paymentMethod).forEach((k) => {
//         if (typeof paymentMethod[k] === 'string') {
//           paymentMethod[k] = encryptText(paymentMethod[k])
//         }
//       })
//       user.paymentMethods = [paymentMethod]
//     }
//     await user.save()
//     return
//   } catch (error) {
//     throw ErrorHandler(error.message, INTERNAL_ERR)
//   }
// }
// exports.getMyPaymentMethods = async (userId) => {
//   try {
//     const user = await User.findById(userId).lean()
//     if (!user) {
//       throw ErrorHandler('no associated user found', BAD_REQUEST)
//     }
//     if (user.paymentMethods && user.paymentMethods.length) {
//       const resp = []
//       user.paymentMethods.forEach(pm => {
//         Object.keys(pm).forEach((k) => {
//           pm[k] = k === '_id' || k === 'isDefault' ? pm[k] : decryptText(pm[k])
//         })
//         resp.push(pm)
//       })
//       return resp
//     } else {
//       return []
//     }
//   } catch (error) {

//   }
// }
// exports.updatePaymentMethod = async (userId, paymentMethod, paymentMethodId) => {
//   try {
//     const user = await User.findById(userId)
//     if (!user) {
//       throw ErrorHandler('no associated user found', BAD_REQUEST)
//     }
//     const { error } = validPaymentMehthodSchema(paymentMethod)
//     if (error) {
//       throw ErrorHandler(error.message, BAD_REQUEST)
//     }
//     const existingIndex = user.paymentMethods.findIndex((pm) => pm._id.toString() === paymentMethodId)
//     if (existingIndex < 0) {
//       throw ErrorHandler('paymentMethod not found', BAD_REQUEST)
//     }
//     let existingCardNumbers = 0
//     user.paymentMethods.forEach(pm => {
//       if (decryptText(pm.cardNumber) === paymentMethod.cardNumber) {
//         existingCardNumbers++
//       }
//     })
//     if (existingCardNumbers > 1) {
//       throw ErrorHandler('duplicate cardNumber', BAD_REQUEST)
//     }
//     paymentMethod.isDefault = paymentMethod.isDefault !== undefined ? JSON.parse(paymentMethod.isDefault) : false
//     if (typeof (paymentMethod.isDefault) === 'boolean' && paymentMethod.isDefault === true) {
//       user.paymentMethods.forEach(pm => {
//         pm.isDefault = false
//       })
//     }
//     Object.keys(paymentMethod).forEach((k) => {
//       if (typeof paymentMethod[k] === 'string') {
//         paymentMethod[k] = encryptText(paymentMethod[k])
//       }
//     })
//     // injecting old _id again
//     paymentMethod._id = user.paymentMethods[existingIndex]._id
//     user.paymentMethods[existingIndex] = paymentMethod
//     await user.save()
//     return
//   } catch (error) {
//     throw ErrorHandler(error.message, INTERNAL_ERR)
//   }
// }
// exports.deletePaymentMethod = async (userId, pId) => {
//   try {
//     const user = await User.findById(userId)
//     if (!user) {
//       throw ErrorHandler('no associated user found', BAD_REQUEST)
//     }
//     if (user.paymentMethods && user.paymentMethods.length) {
//       const existingPM = user.paymentMethods.findIndex((pm) => pm._id.toString() === pId)
//       if (existingPM < 0) {
//         throw ErrorHandler('no payment method found', BAD_REQUEST)
//       }
//       user.paymentMethods.splice(existingPM, 1)
//       user.save()
//       return
//     } else {
//       throw ErrorHandler('no payment method found', BAD_REQUEST)
//     }
//   } catch (error) {
//     throw ErrorHandler(error.message, INTERNAL_ERR)
//   }
// }
exports.reSendVerificationEmail = async (email) => {
  try {
    if (!email) {
      throw ErrorHandler('email is required', BAD_REQUEST)
    }
    const user = await User.findOne({ email: email })
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    sendEmail(user.email,
      {
        name: user.fullName,
        userType: user.userType,
        verificationLink: `${process.env.SERVER_URL}user/verify-email/${user._id}`
      },
      'Email Verification', 'verification-email.hbs')

    return
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.forgetPassword = async (body) => {
  try {
    if (!body.email) {
      throw ErrorHandler('email is required', BAD_REQUEST)
    }
    const user = await User.findOne({ email: body.email })
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    const accessToken = jwt.sign({
      fullName: user.fullName,
      id: user._id,
      userType: user.userType
    }, process.env.SECRET_JWT)
    sendEmail(user.email,
      {
        name: user.fullName,
        userType: user.userType,
        forgetPasswordLink: `${process.env.SERVER_URL}user/reset-password/${accessToken}`
      },
      'Forget Password', 'forget-password.hbs')

    return
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.changePassword = async (body) => {
  try {
    if (!body.token || !body.password) {
      throw ErrorHandler('token and password are required', BAD_REQUEST)
    }
    const payload = jwt.decode(body.token)
    if (!payload.id) {
      throw ErrorHandler('id not found', BAD_REQUEST)
    }
    const user = await User.findById(payload.id)
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    const salt = await bcrypt.genSalt(10)
    if (user.authType !== SOCIAL) {
      user.password = await bcrypt.hash(body.password, salt)
    } else {
      user.password = body.password
    }
    await user.save()
    const accessToken = jwt.sign({
      id: user._id,
      fullName: user.fullName,
      userType: user.userType,
      email: user.email
    }, process.env.SECRET_JWT)
    return accessToken
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.isUser = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(UN_AUTHORIZED).send({ message: 'no auth token found' })
    } else {
      const token = req.headers.authorization.split(' ')[1]
      const payload = jwt.decode(token)
      if (!payload) {
        return res.status(UN_AUTHORIZED).send({ message: 'invalid auth token found' })
      }
      if (payload.userType === CLIENT ||
        payload.userType === FREELANCER
      ) {
        req.user = payload
        next()
      } else {
        return res.status(UN_AUTHORIZED).send({ message: 'invalid auth token found' })
      }
    }
  } catch (error) {
    return res.status(INTERNAL_ERR).send({ message: error.message })
  }
}
// some routes can be used by both user and admins i.e GET: /category
exports.isAdminOrUser = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(UN_AUTHORIZED).send({ message: 'no auth token found' })
    } else {
      const token = req.headers.authorization.split(' ')[1]
      const payload = jwt.decode(token)
      if (!payload) {
        return res.status(UN_AUTHORIZED).send({ message: 'invalid auth token found' })
      }
      req.user = payload
      next()
    }
  } catch (error) {
    return res.status(INTERNAL_ERR).send({ message: error.message })
  }
}

const deleteUnprocessedFiles = async (body) => {
  if (body.resume && body.resume.length) {
    await unlinkAsync(body.resume.split(process.env.SERVER_URL)[1])
  }
  if (body.profileImage && body.profileImage.length) {
    await unlinkAsync(body.profileImage.split(process.env.SERVER_URL)[1])
  }
  if (body.portfolio && body.portfolio.length) {
    for await (const g of body.portfolio) {
      unlinkAsync(g.split(process.env.SERVER_URL)[1])
    }
  }
}
