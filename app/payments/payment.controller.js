const express = require('express')
const { PERMISSIONS } = require('../../helpers/hard-coded-perms')
const { INTERNAL_ERR, CREATED, SUCCESS } = require('../../helpers/HTTP.CODES')
const { checkAdminPermission } = require('../admin/admin.service')
const router = express.Router()
const paymentService = require('./payment.service')

router.get('/', checkAdminPermission(PERMISSIONS.VIEW_PAYMENT), async (req, res) => {
  try {
    const permissions = await paymentService.getAll(req.query)
    return res.status(SUCCESS).send(permissions)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/', checkAdminPermission(PERMISSIONS.CREATE_PAYMENT), async (req, res) => {
  try {
    await paymentService.createPayment(req.body, req.user)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/:id', checkAdminPermission(PERMISSIONS.UPDATE_PAYMENT), async (req, res) => {
  try {
    const updated = await paymentService.updatePayment(req.body, req.params.id)
    return res.status(SUCCESS).send(updated)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

module.exports = router
