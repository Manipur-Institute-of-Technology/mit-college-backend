const mongoose = require("mongoose");
// Seed admin account

mongoose.connect(process.env.MONGODB_URL);

module.exports = mongoose;
