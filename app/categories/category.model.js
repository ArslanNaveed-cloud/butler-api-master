const mongoose = require('mongoose')

const Category = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  path: { type: String }
})
// const autoPopulateChildren = function (next) {
//   this.populate('children')
//   next()
// }

// Catergory
//   .pre('findOne', autoPopulateChildren)
//   .pre('find', autoPopulateChildren)
module.exports = mongoose.model('categories', Category)
