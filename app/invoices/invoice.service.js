/* eslint-disable no-useless-catch */
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const { BAD_REQUEST, NOT_FOUND, INTERNAL_ERR } = require('../../helpers/HTTP.CODES')
const { validInvoiceSchema } = require('../../helpers/validation.schema')
const Invoice = require('../invoices/invoice.model')
const Job = require('../jobs/job.model')
const moment = require('moment')
const { generateInvoice } = require('../emails/js-templates/client-invoice')
const { createPDF } = require('../../helpers/pdfcreator')
const { CLIENT } = require('../../helpers/constants')
const { sendEmail } = require('../emails/mailer')
const { ChatRoom } = require('../chats/chatRoom.model')
const { default: mongoose } = require('mongoose')
const { ChatRoomMessages } = require('../chats/chatRoomMessages.model')
const ObjectId = require('mongoose').Types.ObjectId

exports.getById = async (id) => {
  try {
    const invoice = await Invoice.findById(id).populate('job consumer')
    return invoice
  } catch (error) {
    throw error
  }
}
exports.getAll = async (queryParams, activeUser) => {
  try {
    const sortBy = queryParams.sortBy ? queryParams.sortBy : 'createdAt'
    const pageNo = queryParams.pageNo ? Number(queryParams.pageNo) : 1
    const pageSize = queryParams.pageSize ? Number(queryParams.pageSize) : 10
    const order = queryParams.order && queryParams.order === 'desc' ? -1 : 1
    const clientId = queryParams.clientId || null
    const jobId = queryParams.jobId || null

    let dateRange = {}
    if (queryParams.singleDate) {
      dateRange = {
        invoiceDate: {
          $gte: new Date(moment(queryParams.singleDate).startOf('day')),
          $lte: new Date(moment(queryParams.singleDate).endOf('day'))
        }
      }
    }
    if (queryParams.startDate && queryParams.endDate) {
      dateRange = {
        invoiceDate: {
          $gte: new Date(moment(queryParams.startDate).startOf('day')),
          $lte: new Date(moment(queryParams.endDate).endOf('day'))
        }
      }
    }
    const skip = pageNo === 1 ? 0 : ((pageNo - 1) * pageSize)
    const query = {}
    if (clientId) {
      query.consumer = ObjectId(clientId)
    }
    if (jobId) {
      query.job = ObjectId(jobId)
    }
    if (activeUser && activeUser.userType === CLIENT && activeUser.id) {
      query.consumer = ObjectId(activeUser.id)
    }
    if (queryParams.amountPayable && Number(queryParams.amountPayable)) {
      query.amountPayable = Number(queryParams.amountPayable)
    }
    const combinedQuery = [
      { $match: { ...dateRange, ...query } },
      { $skip: skip },
      { $limit: pageSize },
      { $sort: { [sortBy]: order } }
    ]
    const invoices = await Invoice.aggregate([
      {
        $facet: {
          results: [

            ...combinedQuery,
            {
              $lookup: {
                from: 'users',
                localField: 'consumer',
                foreignField: '_id',
                as: 'consumer'
              }
            },
            {
              $lookup: {
                from: 'jobs',
                localField: 'job',
                foreignField: '_id',
                as: 'job'
              }
            }
          ],
          count: [
            { $match: { ...dateRange, ...query } },
            { $count: 'totalCount' }]
        }
      }
    ])
    return { data: invoices[0].results, totalCount: invoices[0].count[0]?.totalCount }
  } catch (error) {
    throw error
  }
}
exports.getByJobId = async (id) => {
  try {
    const invoice = await Invoice.findOne({ job: id })
    return invoice
  } catch (error) {
    throw error
  }
}
exports.create = async (invoice) => {
  try {
    const doesJobExist = await Job.findById(invoice.job)
    if (!doesJobExist) {
      throw ErrorHandler('job does not exist', BAD_REQUEST)
    }
    invoice.invoiceDate = new Date()
    const { error } = validInvoiceSchema(invoice)
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    const newInvoice = new Invoice(invoice)
    newInvoice.save()
    return
  } catch (error) {
    throw error
  }
}
exports.getPDFInvoice = async (id) => {
  try {
    const invoice = await Invoice.findById(id).populate('consumer job')
    const inVoiceHtml = generateInvoice({
      title: invoice.job.title,
      client: invoice.consumer.fullName,
      invoiceDate: moment().startOf('day'),
      dueDate: moment().add(14, 'days').endOf('day'),
      amountPayable: Number(invoice.amountPayable)
    })
    const pdfBufferInvoice = await createPDF(inVoiceHtml)
    return pdfBufferInvoice
  } catch (error) {
    throw error
  }
}

exports.sendInvoice = async (jobId) => {
  try {
    const job = await Job.findById(jobId)
    if (!job) {
      throw ErrorHandler('Job not Found', NOT_FOUND)
    }
    const invoice = await Invoice.findOne({ job: jobId }).lean()
    const inVoiceHtml = generateInvoice({
      title: job.title,
      client: job.client.name,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      amountPayable: invoice.amountPayable
    })
    const pdfBufferInvoice = await createPDF(inVoiceHtml)
    sendEmail(job.client.email, { name: job.client.name }, `Invoice for ${job.title}`, 'client-invoice.hbs', [
      {
        filename: `invoice-${new Date().getTime()}.pdf`,
        content: pdfBufferInvoice
      }
    ])
    const chatRoom = await ChatRoom.findOne({ job: mongoose.Types.ObjectId(jobId), roomType: CLIENT }).lean()
    const chatRoomMessages = await ChatRoomMessages.findOne({ chatRoomId: chatRoom._id })
    if (chatRoomMessages) {
      // we need to send push Notification as well to the client
      chatRoomMessages.messages.push({
        body: `Click here to view the Invoice for  ${job.title}`,
        attachment: {
          t: 'system',
          miscData: {
            invoiceId: invoice._id
          }
        }
      })
      await chatRoomMessages.save()
    }

    return
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
