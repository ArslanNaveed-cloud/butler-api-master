const Permission = require('../app/permissions/permission.model')
const Role = require('../app/roles/role.model')
const { SA_ROLE_TITLE } = require('../helpers/constants')
require('dotenv').config()

exports.seedRole = async () => {
  const perms = await Permission.findOne()
  await Role.deleteMany()
  if (perms.values.length) {
    const spAdminRole = new Role({
      title: SA_ROLE_TITLE,
      description: 'He has all the permissions',
      permissions: perms.values
    })
    await spAdminRole.save()
    console.log('super admin--role created succesfully')
  }
}
