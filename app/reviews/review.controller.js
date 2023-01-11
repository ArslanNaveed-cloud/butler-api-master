const express = require('express')
const { INTERNAL_ERR, CREATED, SUCCESS } = require('../../helpers/HTTP.CODES')
const router = express.Router()
const reviewService = require('./review.service')

router.get('/job/:id', async (req, res) => {
  try {
    const review = await reviewService.getByJobId(req.params.id)
    return res.status(SUCCESS).send(review)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/user/:id', async (req, res) => {
  try {
    const reviews = await reviewService.getByUserId(req.params.id)
    return res.status(SUCCESS).send(reviews)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/', async (req, res) => {
  try {
    await reviewService.create(req.body)
    return res.status(CREATED).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

module.exports = router
