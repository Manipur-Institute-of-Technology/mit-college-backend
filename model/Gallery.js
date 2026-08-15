const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    galleryName: {
      type: String,
      required: true,
      trim: true,
    },

    is_normal_gallery: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// UNIQUE GALLERY NAME
// =====================================================

gallerySchema.index(
  {
    galleryName: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  mongoose.models.Gallery ||
  mongoose.model("Gallery", gallerySchema);