const express = require('express')
const { PERMISSIONS } = require('../../helpers/hard-coded-perms')
const { INTERNAL_ERR, SUCCESS, CREATED } = require('../../helpers/HTTP.CODES')
const adminService = require('./admin.service')
const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const accessToken = await adminService.login(email, password)
    return res.status(SUCCESS).send({ accessToken })
  } catch (error) {
    return res.status(error.status || INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/', adminService.isAdmin, adminService.checkAdminPermission(PERMISSIONS.CREATE_ADMIN), async (req, res) => {
  try {
    await adminService.create(req.body)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/', adminService.isAdmin, adminService.checkAdminPermission(PERMISSIONS.VIEW_ADMIN), async (req, res) => {
  try {
    const data = await adminService.getAll(req.query)
    return res.status(SUCCESS).send({ ...data })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/:id', adminService.isAdmin, adminService.checkAdminPermission(PERMISSIONS.VIEW_ADMIN), async (req, res) => {
  try {
    const data = await adminService.getById(req.params.id)
    return res.status(SUCCESS).send({ ...data })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/:id', adminService.isAdmin, adminService.checkAdminPermission(PERMISSIONS.UPDATE_ADMIN), async (req, res) => {
  try {
    const updatedUser = await adminService.update(req.body, req.params.id)
    return res.status(SUCCESS).send({ updatedUser })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.delete('/:id', adminService.isAdmin, adminService.checkAdminPermission(PERMISSIONS.DELETE_ADMIN), async (req, res) => {
  try {
    await adminService.delete(req.params.id)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

router.post('/forget-password', async (req, res) => {
  try {
    await adminService.forgetPassword(req.body)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/change-password', async (req, res) => {
  try {
    const accessToken = await adminService.changePassword(req.body)
    return res.status(SUCCESS).send({ accessToken })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
module.exports = router
