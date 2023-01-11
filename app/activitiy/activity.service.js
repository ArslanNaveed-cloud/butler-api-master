const Activity = require('./activity.model')

exports.getAll = async (query) => {
  const activities = await Activity.find(query)
  return activities
}

exports.create = async (data) => {
  const activity = new Activity(data)
  await activity.save()
}
