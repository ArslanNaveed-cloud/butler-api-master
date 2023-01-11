const fs = require('fs')
const path = require('path')
const Handlebars = require('handlebars')
const nodemailer = require('nodemailer')

exports.sendEmail = async (recipient, data, subject, templateName, attachments) => {
  try {
    const source = fs.readFileSync(path.join(__dirname, `/email-templates/${templateName}`), 'utf8')
    const template = Handlebars.compile(source)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // hostname
      secureConnection: false, // TLS requires secureConnection to be false
      port: 587, // port for secure SMTP
      greetingTimeout: 1000,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        ciphers: 'SSLv3'
      }
    })
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: recipient,
      subject: subject,
      html: template(data),
      attachments: attachments
    })
  } catch (error) {
    console.log('eerr', error)
  }
}
