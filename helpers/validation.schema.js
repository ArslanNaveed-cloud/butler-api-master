const Joi = require('joi')
const { CLIENT, FREELANCER } = require('./constants')

exports.validRoleSchema = (data) => {
  return Joi.object({
    title: Joi.string().required().min(2),
    description: Joi.string().required().min(2),
    permissions: Joi.array().required().min(1)
  }).validate(data)
}
exports.validPermSchema = (data) => {
  return Joi.object({
    name: Joi.string().required().min(2),
    value: Joi.string().required().min(2)
  }).validate(data)
}
exports.validUserSchemaPost = (user) => {
  return Joi.object({
    firstName: Joi.string(),
    lastName: Joi.string(),
    dob: Joi.date(),
    email: Joi.string().required(),
    password: Joi.string().required().min(6),
    authType: Joi.string(),
    userType: Joi.string().valid(CLIENT, FREELANCER).required(),
    skills: Joi.alternatives().conditional('userType', { is: FREELANCER, then: Joi.array(), otherwise: Joi.valid('undefined') }),
    resume: Joi.alternatives().conditional('userType', { is: FREELANCER, then: Joi.string(), otherwise: Joi.valid('undefined') }),
    portfolio: Joi.alternatives().conditional('userType', { is: FREELANCER, then: Joi.array(), otherwise: Joi.valid('undefined') }),
    phone: Joi.string(),
    country: Joi.string(),
    address: Joi.string(),
    heardFrom: Joi.string(),
    isEmailVerified: Joi.boolean(),
    profileImage: Joi.string(),
    isProfileVerified: Joi.boolean(),
    signUpCompleted: Joi.boolean(),
    isBanned: Joi.boolean()
  }).validate(user)
}
exports.validUserSchemaPut = (user) => {
  return Joi.object({
    fullName: Joi.string(),
    dob: Joi.date(),
    email: Joi.string(),
    password: Joi.string().min(6),
    userType: Joi.string(),
    skills: Joi.alternatives().conditional('userType', { is: FREELANCER, then: Joi.array().min(1), otherwise: Joi.valid('undefined') }),
    resume: Joi.alternatives().conditional('userType', { is: FREELANCER, then: Joi.string(), otherwise: Joi.valid('undefined') }),
    portfolio: Joi.alternatives().conditional('userType', { is: FREELANCER, then: Joi.array(), otherwise: Joi.valid('undefined') }),
    phone: Joi.string(),
    country: Joi.string(),
    address: Joi.string(),
    heardFrom: Joi.string(),
    isEmailVerified: Joi.boolean(),
    isProfileVerified: Joi.boolean(),
    signUpCompleted: Joi.boolean(),
    isBanned: Joi.boolean(),
    rating: Joi.number()
  }).validate(user)
}
exports.validAdminSchema = (data) => {
  return Joi.object({
    fullName: Joi.string().required().min(2),
    email: Joi.string().required().min(2),
    password: Joi.string().required().min(2),
    role: Joi.string().required().min(2)
  }).validate(data)
}
exports.validAdminPutSchema = (data) => {
  return Joi.object({
    fullName: Joi.string(),
    email: Joi.string(),
    password: Joi.string().optional().allow(''),
    role: Joi.string(),
    isBanned: Joi.boolean()
  }).validate(data)
}
exports.validPaymentSchema = (data) => {
  return Joi.object({
    freelancer: Joi.object(),
    job: Joi.object(),
    createdBy: Joi.object(),
    amount: Joi.number(),
    status: Joi.string(),
    paymentDate: Joi.date()
  }).validate(data)
}

exports.validJobSchema = (data) => {
  return Joi.object({
    title: Joi.string().required().min(2),
    assignedTo: Joi.object(),
    description: Joi.string().required().min(2),
    attachments: Joi.array(),
    endDate: Joi.date().required(),
    price: Joi.number().required(),
    client: Joi.object().required(),
    category: Joi.object().required(),
    clientRoomId: Joi.string(),
    status: Joi.string().optional(),
    freelancerRoomId: Joi.string()
  }).validate(data)
}
exports.validReviewSchema = (data) => {
  return Joi.object({
    comment: Joi.string().required(),
    jobTitle: Joi.string().required().min(3),
    rating: Joi.number().required().min(0).max(5),
    job: Joi.string().required()
  }).validate(data)
}

exports.validInvoiceSchema = (data) => {
  return Joi.object({
    consumer: Joi.string().required(),
    invoiceDate: Joi.date().required(),
    dueDate: Joi.date().required(),
    amountPayable: Joi.number().required().min(0),
    job: Joi.string().required()
  }).validate(data)
}
