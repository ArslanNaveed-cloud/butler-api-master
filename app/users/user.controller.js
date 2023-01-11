const express = require('express')
const { INTERNAL_ERR, SUCCESS } = require('../../helpers/HTTP.CODES')
const {
  userSignUp,
  verifyEmail,
  deleteUser,
  reSendVerificationEmail,
  updateUser,
  getAll,
  getById,
  forgetPassword,
  userLogin,
  deleteFile,
  isUser,
  changePassword,
  genrateOTP,
  verifyOTP,
  adminUpdatesUser,
  getMyProfile,
  getTopClients
} = require('./user.service')
const router = express.Router()
const multer = require('multer')
const { isAdmin } = require('../admin/admin.service')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.' + file.originalname) // mime type gives ext of file
  }
})

const uploadFile = multer({ dest: 'uploads/', storage: storage })

/*
 *
 *   * USER ROUTES *
 *
 */

router.post('/sign-up', uploadFile.fields([
  { name: 'portfolio', maxCount: 10 },
  { name: 'resume', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const accessToken = await userSignUp(req.body, req.files)
    return res.status(SUCCESS).send({ accessToken })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/login', async (req, res) => {
  try {
    const accessToken = await userLogin(req.body)
    return res.status(SUCCESS).send({ accessToken })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/generate-otp', isUser, async (req, res) => {
  try {
    await genrateOTP(req.user, req.body.phone)
    return res.status(SUCCESS).send({ success: true })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/verify-otp', isUser, async (req, res) => {
  try {
    await verifyOTP(req.user, req.body.otp)
    return res.status(SUCCESS).send({ success: true })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/verify-email/:id', async (req, res) => {
  try {
    await verifyEmail(req.params.id)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/forget-password', async (req, res) => {
  try {
    await forgetPassword(req.body)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/reset-password', async (req, res) => {
  try {
    const accessToken = await changePassword(req.body)
    return res.status(SUCCESS).send({ accessToken })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.post('/resend-verify-email', async (req, res) => {
  try {
    await reSendVerificationEmail(req.body.email)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/me', isUser, uploadFile.fields([
  { name: 'portfolio', maxCount: 10 },
  { name: 'resume', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const updatedUser = await updateUser(req, req.user.id)
    return res.status(SUCCESS).send({ updatedUser })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/me', isUser, async (req, res) => {
  try {
    const userProfile = await getMyProfile(req.user.id)
    return res.status(SUCCESS).send({ ...userProfile })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.delete('/me/attachment', isUser, async (req, res) => {
  try {
    await deleteFile(req.user.id, req.body)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
// router.post('/me/payment-method', isUser, async (req, res) => {
//   try {
//     await addPaymentMethod(req.user.id, req.body)
//     return res.status(SUCCESS).send({})
//   } catch (error) {
//     return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
//   }
// })
// router.get('/me/payment-method', isUser, async (req, res) => {
//   try {
//     const paymentMethods = await getMyPaymentMethods(req.user.id)
//     return res.status(SUCCESS).send({ paymentMethods })
//   } catch (error) {
//     return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
//   }
// })
// router.put('/me/payment-method/:id', isUser, async (req, res) => {
//   try {
//     await updatePaymentMethod(req.user.id, req.body, req.params.id)
//     return res.status(SUCCESS).send({})
//   } catch (error) {
//     return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
//   }
// })
// router.delete('/me/payment-method/:id', isUser, async (req, res) => {
//   try {
//     await deletePaymentMethod(req.user.id, req.params.id)
//     return res.status(SUCCESS).send({})
//   } catch (error) {
//     return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
//   }
// })
/*
 *
 *   * ADMIN ROUTES *
 *
 */

router.get('/', isAdmin, async (req, res) => {
  try {
    const data = await getAll(req.query)
    return res.status(SUCCESS).send({ ...data })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const data = await getById(req.params.id)
    return res.status(SUCCESS).send({ ...data })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    await deleteUser(req.params.id)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const updatedUser = await adminUpdatesUser(req, req.params.id)
    return res.status(SUCCESS).send({ updatedUser })
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.put('/attachment/:id', isAdmin, async (req, res) => {
  try {
    await deleteFile(req.params.id, req.body)
    return res.status(SUCCESS).send({})
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})
router.get('/clients/top', isAdmin, async (req, res) => {
  try {
    const data = await getTopClients(req.query)
    return res.status(SUCCESS).send(data)
  } catch (error) {
    return res.status(error.status ? error.status : INTERNAL_ERR).send({ message: error.message })
  }
})

module.exports = router
