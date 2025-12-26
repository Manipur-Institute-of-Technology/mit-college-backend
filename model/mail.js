const mongoose = require("mongoose");
const validator = require("validator");

const mailSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Email is invalid");
      }
    }
  },
  message: {
    type: String,
    required: true,
    trim: true
  }
});

const Mail = mongoose.model("Mail", mailSchema);
module.exports = Mail;
