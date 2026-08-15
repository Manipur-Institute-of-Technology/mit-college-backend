const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },

    path: {
      type: String,
      default: "",
    },

    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    caption: {
      type: String,
      maxlength: 200,
      default: "",
      trim: true,
    },

    size: {
      type: Number,
      default: 0,
    },

    mimetype: {
      type: String,
      default: "",
    },

    gallery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gallery",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Image ||
  mongoose.model("Image", ImageSchema);