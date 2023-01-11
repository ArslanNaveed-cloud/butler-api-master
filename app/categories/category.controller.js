const express = require('express')
const { PERMISSIONS } = require('../../helpers/hard-coded-perms')
const { INTERNAL_ERR, CREATED, SUCCESS } = require('../../helpers/HTTP.CODES')
const { checkAdminPermission, isAdmin } = require('../admin/admin.service')
const router = express.Router()
const categoryService = require('./category.service')

router.get('/', async (req, res) => {
  try {
    const categories = await categoryService.getAll(req.query)
    return res.status(SUCCESS).send(categories)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/', isAdmin, checkAdminPermission(PERMISSIONS.CREATE_CATEGORY), async (req, res) => {
  try {
    await categoryService.create(req.body)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/:id', isAdmin, checkAdminPermission(PERMISSIONS.UPDATE_CATEGORY), async (req, res) => {
  try {
    await categoryService.update(req.body, req.params.id)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.delete('/:id', isAdmin, checkAdminPermission(PERMISSIONS.DELETE_CATEGORY), async (req, res) => {
  try {
    await categoryService.delete(req.params.id)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

module.exports = router
