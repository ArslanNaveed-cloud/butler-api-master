
const Permission = require('../app/permissions/permission.model')
const { PERMISSIONS } = require('../helpers/hard-coded-perms')
require('dotenv').config()
// all the permission must be hardcoded here //
// otherwise results could be errorous and unexpected //
const permissions = Object.entries(PERMISSIONS).map(([key, value]) => value)
exports.permissions = permissions

exports.seedPerms = async () => {
  await Permission.deleteOne()
  const newPermisisons = new Permission({
    values: permissions
  })
  await newPermisisons.save()
  console.log('permissions created succesfully')
}
