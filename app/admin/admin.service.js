/* eslint-disable no-useless-catch */
const jwt = require('jsonwebtoken')
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const Admin = require('./admin.model')
const { validAdminSchema, validAdminPutSchema } = require('../../helpers/validation.schema')
const bcrypt = require('bcrypt')
const { NOT_FOUND, BAD_REQUEST, UN_AUTHORIZED, INTERNAL_ERR, FORBIDDEN } = require('../../helpers/HTTP.CODES')
const { sendEmail } = require('../emails/mailer')
const { SA_ROLE_TITLE } = require('../../helpers/constants')

exports.login = async (email, password) => {
  try {
    const user = await Admin.findOne({
      email: email
    }).populate('role')
    if (!user) {
      throw ErrorHandler('no associated user found', BAD_REQUEST)
    }
    if (user.isBanned) {
      throw ErrorHandler('account suspended contact Adminstrator', FORBIDDEN)
    }
    const validPass = await bcrypt.compare(password, user.password)
    if (!validPass) {
      throw ErrorHandler('incorrect password', BAD_REQUEST)
    }
    const accessToken = jwt.sign({
      id: user._id,
      isAdmin: true,
      permissions: user.role?.permissions || [],
      fullName: user.fullName,
      email: user.email
    }, process.env.SECRET_JWT)
    return accessToken
  } catch (error) {
    throw ErrorHandler(error.message, error.status || INTERNAL_ERR)
  }
}
exports.create = async (admin) => {
  try {
    const { error } = validAdminSchema(admin)
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    const exists = await Admin.findOne({
      email: admin.email
    })
    if (exists) {
      throw ErrorHandler('email already exists', FORBIDDEN)
    }
    const salt = await bcrypt.genSalt(10)
    admin.password = await bcrypt.hash(admin.password, salt)
    const newAdmin = new Admin(admin)
    await newAdmin.save()
    return
  } catch (error) {
    throw ErrorHandler(error.message, error.status || INTERNAL_ERR)
  }
}
exports.update = async (admin, id) => {
  try {
    const { error } = validAdminPutSchema(admin)
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    if (admin.password) {
      const salt = await bcrypt.genSalt(10)
      admin.password = await bcrypt.hash(admin.password, salt)
    }
    const dbInstance = await Admin.findById(id)
    if (!dbInstance) {
      throw ErrorHandler('no associated admin found', BAD_REQUEST)
    }
    Object.keys(admin).forEach(k => {
      if (admin[k] || typeof admin[k] === 'boolean') {
        dbInstance[k] = admin[k]
      }
    })
    await dbInstance.save()
    return dbInstance
  } catch (error) {
    throw ErrorHandler(error.message, error.status || INTERNAL_ERR)
  }
}
exports.delete = async (id) => {
  try {
    const dbInstance = await Admin.findById(id)
    if (!dbInstance) {
      throw ErrorHandler('no associated admin found', BAD_REQUEST)
    }
    await Admin.findByIdAndDelete(id)
    return
  } catch (error) {
    throw ErrorHandler(error.message, error.status || INTERNAL_ERR)
  }
}
exports.getAll = async (queryParams) => {
  try {
    const { sortBy } = queryParams
    const pageNo = queryParams.pageNo ? Number(queryParams.pageNo) : 1
    const pageSize = queryParams.pageSize ? Number(queryParams.pageSize) : 10
    const q = queryParams.q ? queryParams.q : ''
    const order = queryParams.order && queryParams.order === 'desc' ? -1 : 1
    const skip = pageNo === 1 ? 0 : ((pageNo - 1) * pageSize)
    const query = {
      $or: [{ fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }],
      'role.title': { $ne: SA_ROLE_TITLE }
    }
    const admins = await Admin.aggregate([
      {
        $facet: {
          results: [
            {
              $lookup: {
                from: 'roles',
                localField: 'role',
                foreignField: '_id',
                as: 'role'
              }
            },
            { $match: { ...query } },
            { $skip: skip },
            { $limit: pageSize },
            { $sort: { [sortBy]: order } }
          ],
          count: [
            {
              $lookup: {
                from: 'roles',
                localField: 'role',
                foreignField: '_id',
                as: 'role'
              }
            },
            { $match: { ...query } },
            { $count: 'totalCount' }]
        }
      }
    ])
    return { data: admins[0].results, totalCount: admins[0].count[0]?.totalCount || 0 }
  } catch (error) {
    throw error
  }
}
exports.getById = async (id) => {
  try {
    const user = await Admin.findById(id).lean()
    if (!user) {
      throw ErrorHandler('user not found', NOT_FOUND)
    }
    return user
  } catch (error) {
    throw error
  }
}
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(UN_AUTHORIZED).send({ message: 'no auth token found' })
    } else {
      const token = req.headers.authorization.split(' ')[1]
      const payload = jwt.decode(token)
      if (!payload || !payload.isAdmin) {
        return res.status(UN_AUTHORIZED).send({ message: 'invalid auth token found' })
      }
      req.user = payload
      next()
    }
  } catch (error) {
    return res.status(INTERNAL_ERR).send({ message: error.message })
  }
}
exports.checkAdminPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (req.user && req.user.permissions.findIndex(ele => { return ele === permission }) > -1) {
        next()
      } else {
        return res.status(FORBIDDEN).send({ message: 'access denied' })
      }
    } catch (error) {
      return res.status(INTERNAL_ERR).send({ message: error.message })
    }
  }
}
exports.forgetPassword = async (body) => {
  try {
    if (!body.email) {
      throw ErrorHandler('email is required', BAD_REQUEST)
    }
    const admin = await Admin.findOne({ email: body.email })
    if (!admin) {
      throw ErrorHandler('no associated admin found', BAD_REQUEST)
    }
    const accessToken = jwt.sign({
      fullName: admin.fullName,
      id: admin._id
    }, process.env.SECRET_JWT)

    await sendEmail(admin.email,
      {
        email: admin.email,
        fullName: admin.fullName,
        forgetPasswordLink: `${process.env.SERVER_URL}auth/reset-password/${accessToken}`
      },
      'Forget Password', 'admin-forget-password.hbs')

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
    const admin = await Admin.findById(payload.id)
    if (!admin) {
      throw ErrorHandler('no associated admin found', BAD_REQUEST)
    }
    const salt = await bcrypt.genSalt(10)
    admin.password = await bcrypt.hash(body.password, salt)
    await admin.save()
    const accessToken = jwt.sign({
      id: admin._id,
      isAdmin: true,
      permissions: admin.role.permissions,
      fullName: admin.fullName,
      email: admin.email
    }, process.env.SECRET_JWT)
    return accessToken
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
