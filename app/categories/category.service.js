/* eslint-disable no-useless-catch */
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const { BAD_REQUEST, NOT_FOUND, INTERNAL_ERR } = require('../../helpers/HTTP.CODES')
const Category = require('./category.model')
exports.getAll = async () => {
  try {
    const categories = await Category.find()
    if (!categories) {
      throw ErrorHandler('categories not found', NOT_FOUND)
    }
    return { categories }
  } catch (error) {
    throw error
  }
}
exports.create = async (body) => {
  try {
    const newCategory = new Category(body)
    body.path = body.path ? body.path : null
    // if (body.path && !body.path.match(/^,[^\s,]+(?:,\s*[^\s]+)*,$/)) {
    //   throw ErrorHandler('invalid path', BAD_REQUEST)
    // }
    await newCategory.save()
  } catch (error) {
    throw error
  }
}
exports.update = async (body, id) => {
  try {
    const category = await Category.findById(id)
    if (!category) {
      throw ErrorHandler('category not found', NOT_FOUND)
    }
    category.name = body.name
    category.path = body.path
    await category.save()
  } catch (error) {
    throw error
  }
}
exports.delete = async (id) => {
  try {
    const dbInstance = await Category.findById(id)
    await Category.deleteMany({ path: new RegExp(',' + dbInstance.name + ',') })
    if (!dbInstance) {
      throw ErrorHandler('no associated category found', BAD_REQUEST)
    }
    await Category.findByIdAndDelete(id)
    return
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
