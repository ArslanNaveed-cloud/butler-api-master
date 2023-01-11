// Download the helper library from https://www.twilio.com/docs/node/install
// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
const client = require('twilio')(accountSid, authToken)

exports.sendSMS = async (body, userPhoneNumber) => {
  try {
    await client.messages.create({ body: body, from: twilioPhoneNumber, to: userPhoneNumber })
    console.log('OTP successfully sent to ' + userPhoneNumber)
  } catch (error) {
    console.log('Failed to send OTP to ' + userPhoneNumber + ' because ' + error.message)
  }
}
