/* eslint-disable no-useless-catch */
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const { BAD_REQUEST } = require('../../helpers/HTTP.CODES')
const Job = require('../jobs/job.model')
const User = require('../users/user.model')
const Review = require('./review.model')

exports.getByUserId = async (id) => {
  try {
    const reviews = await Review.findOne({ userId: id })
    return reviews
  } catch (error) {
    throw error
  }
}
exports.getByJobId = async (id) => {
  try {
    const review = await Review.findOne({ job: id })
    return review
  } catch (error) {
    throw error
  }
}

// create(review) funciton assumes the userId and commentBy to be correct i.e
// they already exist in the user collection
exports.create = async (review) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const doesJobExist = await Job.findById(review.job)
    if (!doesJobExist) {
      throw ErrorHandler('job does not exist', BAD_REQUEST)
    }

    const newReview = new Review(review)
    await newReview.save({ session })
    const ratingResult = await Review.aggregate([
      { $match: { userId: ObjectId(review.userId) } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$rating' }
        }
      },
      { $project: { avg: 1 } }
    ])
    await User.findByIdAndUpdate(newReview.userId, { rating: ratingResult[0].avg }, { session })
    await session.commitTransaction()
    return
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}
