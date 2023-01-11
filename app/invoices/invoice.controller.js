const express = require('express')
const { INTERNAL_ERR, CREATED, SUCCESS } = require('../../helpers/HTTP.CODES')
const { isAdmin } = require('../admin/admin.service')
const { isUser } = require('../users/user.service')
const router = express.Router()
const invoiceService = require('./invoice.service')

// client/freelancer routes
router.get('/me', isUser, async (req, res) => {
  try {
    const data = await invoiceService.getAll(req.query, req.user)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

/// Admin Routes///
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const data = await invoiceService.getById(req.params.id)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/', isAdmin, async (req, res) => {
  try {
    const data = await invoiceService.getAll(req.query)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/', isAdmin, async (req, res) => {
  try {
    await invoiceService.create(req.body)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/send/:id', isAdmin, async (req, res) => {
  try {
    await invoiceService.sendInvoice(req.params.id)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/:id', isAdmin, async (req, res) => {
  try {
    await invoiceService.update(req, req.params.id)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/pdf/:id', isAdmin, async (req, res) => {
  try {
    const resp = await invoiceService.getPDFInvoice(req.params.id)
    return res.status(SUCCESS).send({ result: JSON.stringify(resp).toString('base64') })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    await invoiceService.delete(req.params.id)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
module.exports = router
