const express = require('express')
const router = express.Router()
const activityService = require('./activity.service')

router.get('/', (req, res) => {
  activityService.getAll(req.query)
})

module.exports = router
