const express = require('express')
const { INTERNAL_ERR, SUCCESS } = require('../../helpers/HTTP.CODES')
const { isAdmin } = require('../admin/admin.service')
const { isUser, isAdminOrUser } = require('../users/user.service')
const router = express.Router()
const chatroomService = require('./chatroom.service')

/// user routes //

router.get('/me', isUser, async (req, res) => {
  try {
    const data = await chatroomService.getChatRoomsForUsers(req.query, req.user)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/me/:id', isUser, async (req, res) => {
  try {
    const data = await chatroomService.getChatById(req.params.id)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/me', isUser, async (req, res) => {
  try {
    const data = await chatroomService.createOpenChat(req.user, req.query)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

/// Admin Routes///
router.get('/messages', isAdminOrUser, async (req, res) => {
  try {
    const data = await chatroomService.getChatMessages(req.query, req.user)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

router.get('/:id', isAdmin, async (req, res) => {
  try {
    const data = await chatroomService.getChatById(req.params.id)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/', isAdmin, async (req, res) => {
  try {
    const data = await chatroomService.getAdminChatRooms(req.query, req.user)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
module.exports = router
