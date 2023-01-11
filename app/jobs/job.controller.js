const express = require('express')
const { INTERNAL_ERR, CREATED, SUCCESS } = require('../../helpers/HTTP.CODES')
const router = express.Router()
const jobService = require('./job.service')
const multer = require('multer')
const { checkAdminPermission, isAdmin } = require('../admin/admin.service')
const { PERMISSIONS } = require('../../helpers/hard-coded-perms')
const { isUser } = require('../users/user.service')
const { FREELANCER } = require('../../helpers/constants')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.' + file.originalname) // mime type gives ext of file
  }
})

const uploadFile = multer({ dest: 'uploads/', storage: storage })

/*
 *
 *   * USER ROUTES *
 *
 */
router.get('/me', isUser, async (req, res) => {
  try {
    const tJobs = await jobService.getAll(req.query, req.user)
    return res.status(SUCCESS).send(tJobs)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/me/:id', isUser, async (req, res) => {
  try {
    if (req.user.userType === FREELANCER) {
      await jobService.submissionInitmation(req.params.id, req.user)
    } else {
      await jobService.approvalInitmation(req.params.id, req.user)
    }
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/me/invites', isUser, async (req, res) => {
  try {
    const data = await jobService.getInvites(req.query, req.user)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/me/invites/:id', isUser, async (req, res) => {
  try {
    const data = await jobService.getInviteById(req.params.id, req.user)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/me/invites/:id', isUser, async (req, res) => {
  try {
    const data = await jobService.acceptInvite(req.params.id, req.user)
    return res.status(SUCCESS).send({ ...data })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/me/:id', isUser, async (req, res) => {
  try {
    const data = await jobService.getById(req.params.id, req.user)
    return res.status(SUCCESS).send({ ...data })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

/*
 *
 *   * ADMIN ROUTES *
 *
 */
router.get('/', isAdmin, checkAdminPermission(PERMISSIONS.VIEW_JOB), async (req, res) => {
  try {
    const tJobs = await jobService.getAll(req.query)
    return res.status(SUCCESS).send(tJobs)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/:id', isAdmin, checkAdminPermission(PERMISSIONS.VIEW_JOB), async (req, res) => {
  try {
    const data = await jobService.getById(req.params.id)
    return res.status(SUCCESS).send({ ...data })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/', isAdmin, checkAdminPermission(PERMISSIONS.CREATE_JOB), uploadFile.array('attachments'), async (req, res) => {
  try {
    await jobService.createJob(req)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/:id', isAdmin, checkAdminPermission(PERMISSIONS.UPDATE_JOB), uploadFile.array('attachments'), async (req, res) => {
  try {
    req.body.attachments = req.files.map(item => { return `${process.env.SERVER_URL}${item.path}` })
    await jobService.updateJob(req, req.params.id)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.delete('/', isAdmin, checkAdminPermission(PERMISSIONS.DELETE_JOB), async (req, res) => {
  try {
    await jobService.delete(req.params.id)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/attachment/:id', isAdmin, checkAdminPermission(PERMISSIONS.UPDATE_JOB), async (req, res) => {
  try {
    await jobService.deleteFile(req.params.id, req.body)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

module.exports = router
