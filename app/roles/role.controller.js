const express = require('express')
const { PERMISSIONS } = require('../../helpers/hard-coded-perms')
const { INTERNAL_ERR, CREATED, SUCCESS } = require('../../helpers/HTTP.CODES')
const { checkAdminPermission } = require('../admin/admin.service')
const router = express.Router()
const roleService = require('./role.service')

router.get('/', checkAdminPermission(PERMISSIONS.VIEW_ROLE), async (req, res) => {
  try {
    const roles = await roleService.getAll(req.query)
    return res.status(SUCCESS).send(roles)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/:id', checkAdminPermission(PERMISSIONS.VIEW_ROLE), async (req, res) => {
  try {
    const role = await roleService.getById(req.params.id)
    return res.status(SUCCESS).send(role)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/', checkAdminPermission(PERMISSIONS.CREATE_ROLE), async (req, res) => {
  try {
    await roleService.create(req.body)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/:id', checkAdminPermission(PERMISSIONS.UPDATE_ROLE), async (req, res) => {
  try {
    const updated = await roleService.update(req.params.id, req.body)
    return res.status(CREATED).send(updated)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.delete('/:id', checkAdminPermission(PERMISSIONS.DELETE_ROLE), async (req, res) => {
  try {
    await roleService.delete(req.params.id)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

module.exports = router
