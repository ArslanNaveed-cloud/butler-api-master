const mongoose = require('mongoose')

const Invoice = mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'jobs'
  },
  consumer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  amountPayable: { type: Number },
  status: {
    type: String,
    enum: ['PAID', 'UNPAID'],
    default: 'UNPAID'
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('invoices', Invoice)
