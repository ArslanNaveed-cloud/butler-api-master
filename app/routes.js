const express = require('express')
const router = express.Router()
const roleController = require('./roles/role.controller')
const adminAuthController = require('./admin/admin.controller')
const userController = require('./users/user.controller')
const permissionController = require('./permissions/permission.controller')
const categoryController = require('./categories/category.controller')
const jobController = require('./jobs/job.controller')
const reviewController = require('./reviews/review.controller')
const invoiceController = require('./invoices/invoice.controller')
const chatController = require('./chats/chat.controller')
const paymentController = require('./payments/payment.controller')
const { isAdmin } = require('./admin/admin.service')
const { isUser } = require('./users/user.service')

const multer = require('multer')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/messages_static_data')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.' + file.originalname) // mime type gives ext of file
  }
})
const upload = multer({ dest: 'uploads/messages_static_data', storage: storage })

router.use('/role', isAdmin, roleController)
router.use('/admin', adminAuthController)
router.use('/permission', isAdmin, permissionController)
router.use('/category', categoryController)
router.use('/job', jobController)
router.use('/user', userController)
router.use('/review', isUser, reviewController)
router.use('/invoice', invoiceController)
router.use('/chat', chatController)
router.use('/payment', isAdmin, paymentController)
router.post('/upload-file', isUser, upload.single('file'), (req, res) => {
  try {
    res.send({ path: req.file.path })
  } catch (err) {
    res.status(500).send({ message: err.message })
  }
})

module.exports = router
