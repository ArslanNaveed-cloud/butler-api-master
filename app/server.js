const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With')
  next()
})
app.use(cors())
const http = require('http').createServer(app)
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // limit of 100MB for fileSize
})
const PORT = process.env.PORT || 8080
const routes = require('./routes')
app.use(cors())
require('dotenv').config()
app.use(express.json())

require('./chats/chat.stream')(io)
app.use(routes)
mongoose.connect(process.env.MONGO_URI, (err) => {
  if (!err) {
    console.log('mongoDB connected successfully to ' + process.env.MONGO_URI)
  } else {
    console.error(err)
  }
})
app.listen(PORT, () => {
  console.log('App listening on ' + PORT)
})
http.listen(4000, function () {
  console.log('listening on port 4000')
})
app.use('/uploads', express.static('uploads'))
