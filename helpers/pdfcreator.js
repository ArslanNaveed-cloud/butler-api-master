/* eslint-disable no-useless-catch */
const pdf = require('html-pdf')

exports.createPDF = async (html, fileName) => {
  try {
    return new Promise((resolve, reject) => {
      pdf.create(html, { height: '11in', width: '8.5in', timeout: 600000 }).toBuffer((err, buffer) => {
        if (err) {
          reject(err)
        }
        resolve(buffer)
      })
    })
  } catch (error) {
    throw error
  }
}
