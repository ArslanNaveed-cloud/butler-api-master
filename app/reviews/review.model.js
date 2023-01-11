const mongoose = require('mongoose')

const Review = mongoose.Schema(
  {
    commentBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    comment: { type: String, required: true },
    rating: {
      type: Number,
      required: true
    },
    job: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true }
  }, { autoIndex: true },
  {
    timestamps: true
  })

module.exports = mongoose.model('reviews', Review)
