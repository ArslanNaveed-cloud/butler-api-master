const express = require('express')
const { PERMISSIONS } = require('../../helpers/hard-coded-perms')
const { INTERNAL_ERR, CREATED, SUCCESS } = require('../../helpers/HTTP.CODES')
const { checkAdminPermission } = require('../admin/admin.service')
const router = express.Router()
const permissionService = require('./permission.service')

router.get('/', checkAdminPermission(PERMISSIONS.VIEW_PERMISSIONS), async (req, res) => {
  try {
    const permissions = await permissionService.getAll()
    return res.status(SUCCESS).send(permissions)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/', checkAdminPermission(PERMISSIONS.CREATE_PERMISSIONS), async (req, res) => {
  try {
    await permissionService.create(req.body.permission)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.delete('/:permission', checkAdminPermission(PERMISSIONS.DELETE_PERMISSIONS), async (req, res) => {
  try {
    await permissionService.delete(req.params.permission)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

module.exports = router
