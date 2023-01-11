/* eslint-disable no-useless-catch */
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const { BAD_REQUEST, NOT_FOUND } = require('../../helpers/HTTP.CODES')
const Role = require('./role.model')
const { validRoleSchema } = require('../../helpers/validation.schema')
const { permissions } = require('../../seeders/permissions')
const { SA_ROLE_TITLE } = require('../../helpers/constants')

exports.getAll = async (queryParams) => {
  try {
    const { sortBy } = queryParams
    const pageNo = queryParams.pageNo ? Number(queryParams.pageNo) : 1
    const pageSize = queryParams.pageSize ? Number(queryParams.pageSize) : 10
    const q = queryParams.q ? queryParams.q : ''
    const order = queryParams.order && queryParams.order === 'desc' ? -1 : 1
    const skip = pageNo === 1 ? 0 : ((pageNo - 1) * pageSize)
    const query = {
      $or: [{ title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }],
      title: { $ne: SA_ROLE_TITLE }
    }
    const count = await Role.countDocuments(query)
    const roles = await Role.find(query, {}, { skip: skip, limit: pageSize }).sort({ [sortBy]: order || 1 })
    // roles = roles.filter(item => item?.permissions.length !== permissions.length)
    return { totalCount: count, data: roles }
  } catch (error) {
    throw error
  }
}
exports.getById = async (id) => {
  try {
    const role = await Role.findById(id)
    if (!role) {
      throw ErrorHandler('role not found', NOT_FOUND)
    }
    return role
  } catch (error) {
    throw error
  }
}
exports.create = async (data) => {
  try {
    const { error } = validRoleSchema(data)
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    const role = new Role(data)
    await role.save()
  } catch (error) {
    throw error
  }
}
exports.update = async (id, data) => {
  try {
    const { error } = validRoleSchema(data)
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    const role = await Role.findById(id)
    if (!role) {
      throw ErrorHandler('no role found', NOT_FOUND)
    }
    role.title = data.title
    role.description = data.description
    role.permissions = data.permissions
    await role.save()
  } catch (error) {
    throw error
  }
}
exports.delete = async (id) => {
  try {
    if (!id) {
      throw ErrorHandler('id is required', BAD_REQUEST)
    }
    const result = await Role.findByIdAndDelete(id)
    if (!result) {
      throw ErrorHandler('role not found', NOT_FOUND)
    }
    return result
  } catch (error) {
    throw error
  }
}
