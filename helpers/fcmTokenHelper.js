const admin = require('firebase-admin')
const User = require('./../app/users/user.model')

// admin.initializeApp({
//   // credential: admin.credential.cert(serviceAccount),
//   credential: admin.credential.cert({}),
//   databaseURL: 'bdurlPlaceHolder'
// })
// console.log(admin.app().name)
module.exports.sendPushNotification = async (data) => {
  try {
    const user = await User.findById(data.userId)
    if (!user) {
      console.log('User Not Found!')
      return
    }
    // for (let i = 0; i < user.tokens.length; i++) {
    const body = data.message
    const title = data.title
    const message = {
      notification: {
        title: title, // title of notification
        body: body // content of the notification
      },
      data: data.payload, // payload you want to send with your notification
      token: user.fcmToken
    }

    admin.messaging().send(message)
      .then((response) => {
        // Response is a message ID string.
        // console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error.message)
      })
    // }
  } catch (e) {
    return console.log(e.message)
  }
}
