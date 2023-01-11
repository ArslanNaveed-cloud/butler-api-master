/* eslint-disable no-useless-catch */
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const { INTERNAL_ERR, BAD_REQUEST, NOT_FOUND, FORBIDDEN } = require('../../helpers/HTTP.CODES')
const { CLIENT, SA_ROLE_TITLE, FREELANCER, OPEN_CHAT, ACCEPTED, CLOSED, PENDING, SUBMITTED, APPROVED } = require('../../helpers/constants')
const { validJobSchema } = require('../../helpers/validation.schema')
const Job = require('./job.model')
const fs = require('fs')
const { promisify } = require('util')
const User = require('../users/user.model')
const { ChatRoom } = require('../chats/chatRoom.model')
// const Invoice = require('../invoices/invoice.model')
// const moment = require('moment')
const unlinkAsync = promisify(fs.unlink)
const { sendEmail } = require('../emails/mailer')
const Admin = require('../admin/admin.model')
const { default: mongoose } = require('mongoose')
const JobInvite = require('./job-invite.model')
exports.getAll = async (queryParams, activeUser) => {
  try {
    const sortBy = queryParams.sortBy ? queryParams.sortBy : 'createdAt'
    const pageNo = queryParams.pageNo ? Number(queryParams.pageNo) : 1
    const pageSize = queryParams.pageSize ? Number(queryParams.pageSize) : 10
    const q = queryParams.q ? queryParams.q : ''
    const freelancerId = queryParams.freelancerId ? queryParams.freelancerId : null
    const clientId = queryParams.clientId ? queryParams.clientId : null
    const order = queryParams.order && queryParams.order === 'desc' ? -1 : 1
    let noOfPages = 0
    const skip = noOfPages === 1 ? 0 : ((pageNo - 1) * pageSize)
    const query = {
      $or: [{ title: { $regex: q, $options: 'i' } },
        { 'assignedTo.name': { $regex: q, $options: 'i' } },
        { 'assignedTo.email': { $regex: q, $options: 'i' } },
        { 'client.email': { $regex: q, $options: 'i' } },
        { 'client.name': { $regex: q, $options: 'i' } },
        { 'assignedBy.email': { $regex: q, $options: 'i' } },
        { 'assignedBy.name': { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }]
    }
    if (clientId) {
      query['client.id'] = clientId
    }
    if (freelancerId) {
      query['assignedTo.id'] = freelancerId
    }
    if (activeUser) {
      (activeUser.userType === CLIENT && activeUser.id)
        ? query['client.id'] = activeUser.id
        : query['assignedTo.id'] = activeUser.id
    }

    const count = await Job.countDocuments(query)
    noOfPages = Math.ceil(count / pageSize)
    const jobs = await Job.find(query, {}, { skip: skip, limit: pageSize }).sort({ [sortBy]: order || 1 })
    return { totalCount: count, data: jobs }
  } catch (error) {
    throw error
  }
}
exports.getById = async (id, activeUser) => {
  try {
    const query = { _id: id }
    if (activeUser) {
      (activeUser.userType === CLIENT && activeUser.id)
        ? query['client.id'] = activeUser.id
        : query['assignedTo.id'] = activeUser.id
    }
    const job = await Job.findOne(query).lean()
    if (!job) {
      throw ErrorHandler('job not found', NOT_FOUND)
    }
    return job
  } catch (error) {
    throw error
  }
}
exports.createJob = async (req) => {
  try {
    try {
      if (req.body.assignedTo) {
        req.body.assignedTo = JSON.parse(req.body.assignedTo)
      }
      req.body.client = JSON.parse(req.body.client)
      req.body.category = JSON.parse(req.body.category)
    } catch (error) {
      throw ErrorHandler('client must be of type object', BAD_REQUEST)
    }
    req.body.attachments = req.files.map(item => { return `${process.env.SERVER_URL}${item.path}` })
    const { error } = validJobSchema(req.body)
    // this principally should have more checks

    const clientExists = await User.findById(req.body.client.id)
    if (!clientExists) {
      throw ErrorHandler('invalid client or freelancer id', BAD_REQUEST)
    }
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    const { title, category, assignedTo, description, client, endDate, price } = req.body

    let newClientChatInst
    let superAdmin = await Admin.aggregate([{
      $lookup: {
        from: 'roles',
        localField: 'role',
        foreignField: '_id',
        as: 'role'
      }
    },
    {
      $match: {
        'role.title': SA_ROLE_TITLE
      }
    }])
    if (!superAdmin[0]._id) {
      throw ErrorHandler('S.Admin not found', INTERNAL_ERR)
    }
    superAdmin = JSON.parse(JSON.stringify(superAdmin))
    const existingOpenChat = await ChatRoom.findOne({ roomType: OPEN_CHAT, 'user.participant': mongoose.Types.ObjectId(client.id) })
    const adminS = [{ participant: superAdmin[0]._id }]

    if (superAdmin[0]._id !== req.user.id) {
      adminS.push({ participant: req.user.id })
    }
    if (!existingOpenChat) {
      newClientChatInst = new ChatRoom({
        admins: adminS,
        roomType: CLIENT,
        user: { participant: client.id }
      })
      await newClientChatInst.save()
    } else {
      existingOpenChat.roomType = CLIENT
      await existingOpenChat.save()
    }
    // let freelanceChat
    // if (!assignedTo) {
    //   freelanceChat = new ChatRoom({
    //     admins: adminS,
    //     roomType: FREELANCER,
    //     user: { participant: assignedTo.id }
    //   })
    //   await freelanceChat.save()
    // }
    const newJob = new Job()
    newJob.title = title
    newJob.client = client
    newJob.category = category
    newJob.assignedBy = {
      email: req.user.email,
      id: req.user.id,
      name: req.user.fullName
    }
    // newJob.assignedTo = assignedTo
    newJob.description = description
    newJob.attachments = req.body.attachments
    newJob.endDate = endDate
    newJob.price = price
    newJob.status = PENDING
    newJob.clientRoomId = existingOpenChat?._id || newClientChatInst?._id
    const nJob = await newJob.save()
    if (newClientChatInst) {
      await ChatRoom.findByIdAndUpdate(newClientChatInst._id, { job: nJob._id })
    }
    if (!assignedTo) {
      sendCategoryWiseNotifications(category, nJob)
    } else if (assignedTo) {
      const user = await User.findById(assignedTo.id).lean()
      sendInviteToFreelancer(user, nJob)
      const newInvite = new JobInvite({
        job: nJob._id,
        user: assignedTo.id
      })
      newInvite.save()
    }
    return
  } catch (error) {
    deleteUnprocessedFiles(req.body)
    throw error
  }
}
exports.updateJob = async (req, id) => {
  try {
    const job = req.body
    try {
      if (job.assignedTo) {
        job.assignedTo = JSON.parse(job.assignedTo)
      }
      job.client = JSON.parse(job.client)
      job.category = JSON.parse(job.category)
    } catch (error) {
      throw ErrorHandler('assignedTo,category && client must be of type object', BAD_REQUEST)
    }
    const { error } = validJobSchema(job)
    if (error) {
      throw ErrorHandler(error.message, BAD_REQUEST)
    }
    const dbInstance = await Job.findById(id)
    if (!dbInstance) {
      throw ErrorHandler('no associated job found', BAD_REQUEST)
    }
    const { title, assignedTo, description, attachments, endDate, price, status } = job
    dbInstance.title = title || dbInstance.title
    // dbInstance.assignedTo = assignedTo || dbInstance.assignedTo
    // dbInstance.client = client || dbInstance.client
    // dbInstance.category = category || dbInstance.category
    // has the client already any chatRoom with same jobId
    let existingFreelancerChatRoom
    if (assignedTo?.id) {
      existingFreelancerChatRoom = await ChatRoom.findOne({
        'user.participant': mongoose.Types.ObjectId(assignedTo.id),
        job: mongoose.Types.ObjectId(dbInstance._id)
      })
    }

    if (assignedTo && assignedTo.id !== dbInstance.assignedTo?.id?.toString() && !existingFreelancerChatRoom) {
      const superAdmin = await Admin.aggregate([{
        $lookup: {
          from: 'roles',
          localField: 'role',
          foreignField: '_id',
          as: 'role'
        }
      },
      {
        $match: {
          'role.title': SA_ROLE_TITLE
        }
      }])
      const adminS = [{ participant: superAdmin[0]._id }]
      if (superAdmin[0]._id.toString() !== req.user.id) {
        adminS.push({ participant: req.user.id })
      }
      const freelanceChat = new ChatRoom({
        admins: adminS,
        roomType: FREELANCER,
        job: dbInstance._id,
        user: { participant: assignedTo.id }
      })
      await freelanceChat.save()
      dbInstance.freelancerRoomId = freelanceChat._id
      dbInstance.assignedTo = assignedTo
    }
    dbInstance.description = description || dbInstance.description
    dbInstance.attachments = attachments?.length ? [...dbInstance.attachments, ...attachments] : dbInstance.attachments
    dbInstance.endDate = endDate || dbInstance.endDate
    dbInstance.price = price || dbInstance.price
    dbInstance.status = status || dbInstance.status
    await dbInstance.save()
    return
  } catch (error) {
    deleteUnprocessedFiles(req.body)
    throw error
  }
}
exports.submissionInitmation = async (jobId, user) => {
  try {
    const dbInstance = await Job.findOne({
      _id: jobId,
      'assignedTo.id': mongoose.Types.ObjectId(user.id)
    })
    if (!dbInstance) {
      throw ErrorHandler('no associated job found', BAD_REQUEST)
    }
    if (dbInstance.status === SUBMITTED) {
      throw ErrorHandler('job already submitted', BAD_REQUEST)
    }
    dbInstance.status = SUBMITTED
    dbInstance.submittedOn = new Date()
    dbInstance.save()
  } catch (error) {
    throw error
  }
}
exports.approvalInitmation = async (jobId, user) => {
  try {
    const dbInstance = await Job.findOne({
      _id: jobId,
      'client.id': mongoose.Types.ObjectId(user.id)
    })
    if (!dbInstance) {
      throw ErrorHandler('no associated job found', BAD_REQUEST)
    }
    if (dbInstance.status === APPROVED) {
      throw ErrorHandler('job already approved', BAD_REQUEST)
    }
    dbInstance.status = APPROVED
    dbInstance.approvedOn = new Date()
    dbInstance.save()
  } catch (error) {
    throw error
  }
}
exports.acceptInvite = async (jobId, user) => {
  try {
    const dbInstance = await Job.findById(jobId)
    const jobInvite = await JobInvite.findOne({ job: mongoose.Types.ObjectId(jobId), user: mongoose.Types.ObjectId(user.id) })
    if (!dbInstance) {
      throw ErrorHandler('no associated job found', BAD_REQUEST)
    }
    if (dbInstance.status === ACCEPTED) {
      throw ErrorHandler('Job already accepted', FORBIDDEN)
    }
    const superAdmin = await Admin.aggregate([{
      $lookup: {
        from: 'roles',
        localField: 'role',
        foreignField: '_id',
        as: 'role'
      }
    },
    {
      $match: {
        'role.title': SA_ROLE_TITLE
      }
    }])
    const adminS = [{ participant: superAdmin[0]._id }]
    const newFreelancerRoom = new ChatRoom({
      admins: adminS,
      roomType: FREELANCER,
      job: jobId,
      user: { participant: user.id }
    })
    await newFreelancerRoom.save()
    if (jobInvite) {
      jobInvite.status = ACCEPTED
      await jobInvite.save()
    }
    dbInstance.assignedTo = {
      name: user.fullName,
      email: user.email,
      id: user.id
    }
    dbInstance.status = ACCEPTED
    await dbInstance.save()
    await JobInvite.updateMany({ job: mongoose.Types.ObjectId(jobId), _id: { $ne: mongoose.Types.ObjectId(jobInvite._id) } }, { status: CLOSED })
    return JSON.parse(JSON.stringify(dbInstance))
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.getInvites = async (queryParams, user) => {
  try {
    const sortBy = queryParams.sortBy || 'createdAt'
    const pageNo = queryParams.pageNo ? Number(queryParams.pageNo) : 1
    const pageSize = queryParams.pageSize ? Number(queryParams.pageSize) : 10
    const q = queryParams.q ? queryParams.q : ''
    const order = queryParams.order && queryParams.order === 'desc' ? -1 : 1
    const skip = pageNo === 1 ? 0 : ((pageNo - 1) * pageSize)
    const query = {
      $or: [{ status: { $regex: q, $options: 'i' } }],
      user: mongoose.Types.ObjectId(user.id)
    }
    const count = await JobInvite.countDocuments(query)
    const invites = await JobInvite.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          pipeline: [{
            $project: { price: 0 }
          }],
          as: 'job'
        }
      },
      { $skip: skip },
      { $limit: pageSize },
      { $sort: { [sortBy]: order || 1 } }
    ])
    return { totalCount: count, data: invites }

    // let invites = await JobInvite.find({ }).populate('job').lean()
    // invites = invites.map((item, i) => {
    //   delete item.job.price
    //   return item
    // })
    // return invites
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.getInviteById = async (inviteId, user) => {
  try {
    const query = { _id: inviteId, user: mongoose.Types.ObjectId(user.id) }
    const invite = await JobInvite.findOne(query).populate('job').lean()
    if (!invite) {
      throw ErrorHandler('invite not found', NOT_FOUND)
    }
    delete invite.job.price
    return invite
  } catch (error) {
    throw error
  }
}
exports.delete = async (id) => {
  try {
    const dbInstance = await Job.findById(id)
    if (!dbInstance) {
      throw ErrorHandler('no associated job found', BAD_REQUEST)
    }
    await Job.findByIdAndDelete(id)
    return
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
exports.deleteFile = async (id, { address }) => {
  try {
    const dbJobInstance = await Job.findById(id)
    if (!dbJobInstance) {
      throw ErrorHandler('no associated job found', BAD_REQUEST)
    }
    dbJobInstance.attachments = dbJobInstance.attachments.filter(att => att !== address)
    await deleteUnprocessedFiles({ attachments: [address] })
    await dbJobInstance.save()
    return
  } catch (error) {
    throw ErrorHandler(error.message, INTERNAL_ERR)
  }
}
const sendCategoryWiseNotifications = async (category, job) => {
  const usersByCategory = await User.find({ skills: mongoose.Types.ObjectId(category.id) })
  for (let index = 0; index < usersByCategory.length; index++) {
    sendInviteToFreelancer(usersByCategory[index], job)
  }
}
const sendInviteToFreelancer = (user, job) => {
  const attachments = job.attachments.map(item => { return { path: item } })
  sendEmail(user.email, { title: job.title, name: user.fullName }, `Invite for ${job.title}`, 'job-invite.hbs', attachments)
  const newInvite = new JobInvite({
    job: job._id,
    user: user._id
  })
  newInvite.save()
}
const deleteUnprocessedFiles = async (body) => {
  if (body.attachments && body.attachments.length) {
    for await (const g of body.attachments) {
      unlinkAsync(g.split(process.env.SERVER_URL)[1])
    }
  }
}
