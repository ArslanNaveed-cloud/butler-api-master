
const Admin = require('../app/admin/admin.model')
const Roles = require('../app/roles/role.model')
const bcrypt = require('bcrypt')
const { SA_FULLNAME, SA_EMAIL, SA_PASSWORD, SA_ROLE_TITLE } = require('../helpers/constants')
require('dotenv').config()
exports.seedSuperAdmin = async () => {
  await Admin.deleteMany()
  const salt = await bcrypt.genSalt(10)
  const roleSA = await Roles.findOne({ title: SA_ROLE_TITLE })
  const newAdmin = new Admin({
    fullName: SA_FULLNAME,
    email: SA_EMAIL,
    password: await bcrypt.hash(SA_PASSWORD, salt),
    role: roleSA._id
  })
  await newAdmin.save()
  console.log('super admin user created succesfully')
}

// async function seedData () {
//   await mongoose.connect(process.env.MONGO_URI, async (err, r) => {
//     if (!err) {
//       console.log('mongoDB connected successfully to ' + process.env.MONGO_URI)
//       await seedSuperAdmin()
//     }
//   })
// }
// seedData()
