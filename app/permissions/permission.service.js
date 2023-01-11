/* eslint-disable no-useless-catch */
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const { BAD_REQUEST, NOT_FOUND, FORBIDDEN } = require('../../helpers/HTTP.CODES')
const Permissions = require('./permission.model')
const Role = require('../roles/role.model')

exports.getAll = async () => {
  try {
    const perms = await Permissions.findOne()
    if (!perms.values) {
      throw ErrorHandler('permissions not found', NOT_FOUND)
    }
    return { totalCount: perms.values.length, data: perms.values }
  } catch (error) {
    throw error
  }
}
exports.create = async (singlePerm) => {
  try {
    const perms = await Permissions.findOne()
    if (typeof singlePerm !== 'string') {
      throw ErrorHandler('permission must be an string', BAD_REQUEST)
    }
    if (!perms) {
      const newPerm = new Permissions({ values: [singlePerm] })
      await newPerm.save()
      return
    } else {
      if (perms.values.findIndex(p => p === singlePerm) > -1) {
        throw ErrorHandler('permission already exists', FORBIDDEN)
      }
      perms.values.push(singlePerm)
      await perms.save()
      return
    }
  } catch (error) {
    throw error
  }
}
exports.delete = async (singlePerm) => {
  try {
    const perms = await Permissions.findOne()
    if (typeof singlePerm !== 'string') {
      throw ErrorHandler('permission must be an string', BAD_REQUEST)
    }
    if (!perms) {
      throw ErrorHandler('permission not found', NOT_FOUND)
    } else {
      // permissions must also be deleted from the roles
      const roles = await Role.find({ permissions: singlePerm })
      if (roles.length) {
        for await (const r of roles) {
          const pExistInRoleAtIndex = r.permissions.findIndex((i) => { return i === singlePerm })
          if (pExistInRoleAtIndex > -1) {
            r.permissions.splice(pExistInRoleAtIndex, 1)
            await r.save()
          }
        }
      }
      const pIndex = perms.values.findIndex((i) => { return i === singlePerm })
      if (pIndex === -1) {
        throw ErrorHandler('permission not found', NOT_FOUND)
      }
      perms.values.splice(pIndex, 1)
      perms.save()
      return
    }
  } catch (error) {
    throw error
  }
}
