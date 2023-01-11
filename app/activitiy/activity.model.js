const mongoose = require('mongoose');

const Activity = mongoose.Schema({
  username:{ type: String, required: true },
  email:{ type: String, required: true },
  role : { type: String, required: true },
  action: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('activities', Activity);