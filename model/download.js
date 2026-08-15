const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DownloadSchema = new Schema(
  {
    fileName: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },

    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Download", DownloadSchema);