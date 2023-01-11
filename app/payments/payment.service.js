const { ErrorHandler } = require('../../helpers/ErrorHandler')
const { INTERNAL_ERR, BAD_REQUEST, NOT_FOUND } = require('../../helpers/HTTP.CODES')
const { validPaymentSchema } = require('../../helpers/validation.schema')
const Job = require('../jobs/job.model')
const User = require('../users/user.model')
const Payment = require('./payment.model')

exports.createPayment = async (payment, admin) => {
  try {
    const freelancer = await User.findById(payment.freelancer).lean()
    const job = await Job.findById(payment.job).lean()
    if (!freelancer) {
      throw ErrorHandler('freelancer doesnt exist', BAD_REQUEST)
    }
    if (!job) {
      throw ErrorHandler('Invalid job Id', BAD_REQUEST)
    }
    payment.freelancer = {
      id: freelancer._id,
      name: freelancer.fullName,
      email: freelancer.email,
      phone: freelancer.phone,
      stringId: freelancer._id
    }
    payment.job = {
      id: job._id,
      stringId: job._id,
      title: job.title
    }
    const { error } = validPaymentSchema(payment)
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    payment.createdBy = {
      id: admin.id,
      name: admin.fullName,
      email: admin.email,
      stringId: admin.id
    }
    const newPayment = new Payment(payment)
    await newPayment.save()
    return
  } catch (error) {
    throw ErrorHandler(error.message, error.status || INTERNAL_ERR)
  }
}
exports.updatePayment = async (payload, id) => {
  try {
    const dbPayment = await Payment.findById(id)
    if (!dbPayment) {
      throw ErrorHandler('payment not found', NOT_FOUND)
    }
    let freelancer
    if (payload.freelancer) {
      freelancer = await User.findById(payload.freelancer).lean()
    }
    let job
    if (payload.job) {
      job = await Job.findById(payload.job).lean()
    }
    if (!freelancer) {
      throw ErrorHandler('freelancer doesnt exist', BAD_REQUEST)
    }
    if (!job) {
      throw ErrorHandler('Invalid job Id', BAD_REQUEST)
    }
    if (freelancer) {
      dbPayment.freelancer = {
        id: freelancer._id,
        name: freelancer.fullName,
        email: freelancer.email,
        phone: freelancer.phone,
        stringId: freelancer._id
      }
    }
    if (job) {
      dbPayment.job = {
        id: job._id,
        stringId: job._id,
        title: job.title
      }
    }
    dbPayment.amount = payload.amount || dbPayment.amount
    dbPayment.status = payload.status || dbPayment.status
    dbPayment.paymentDate = payload.paymentDate || dbPayment.paymentDate
    await dbPayment.save()
    return dbPayment
  } catch (error) {
    throw ErrorHandler(error.message, error.status || INTERNAL_ERR)
  }
}
exports.getAll = async (queryParams) => {
  const { sortBy } = queryParams
  const pageNo = queryParams.pageNo ? Number(queryParams.pageNo) : 1
  const pageSize = queryParams.pageSize ? Number(queryParams.pageSize) : 10
  const freelancerId = queryParams.freelancerId ? queryParams.freelancerId : null
  const q = queryParams.q ? queryParams.q : ''
  const order = queryParams.order && queryParams.order === 'desc' ? -1 : 1
  let noOfPages = 0
  const skip = noOfPages === 1 ? 0 : ((pageNo - 1) * pageSize)

  const query = {
    $or: [
      { 'freelancer.stringId': { $regex: q, $options: 'i' } },
      { 'freelancer.name': { $regex: q, $options: 'i' } },
      { 'freelancer.email': { $regex: q, $options: 'i' } },
      { 'freelancer.phone': { $regex: q, $options: 'i' } },
      { 'createdBy.stringId': { $regex: q, $options: 'i' } },
      { 'createdBy.name': { $regex: q, $options: 'i' } },
      { 'createdBy.email': { $regex: q, $options: 'i' } },
      { 'job.stringId': { $regex: q, $options: 'i' } },
      { 'job.title': { $regex: q, $options: 'i' } },
      { status: { $regex: q, $options: 'i' } }
    ]
  }
  if (freelancerId) {
    query['freelancer.stringId'] = freelancerId
  }
  const count = await Payment.countDocuments(query)
  noOfPages = Math.ceil(count / pageSize)
  const payments = await Payment.find(query, {}, { skip: skip, limit: pageSize }).sort({ [sortBy]: order || 1 })
  return { totalCount: count, data: payments }
}
