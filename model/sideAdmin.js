const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FacilityAdminSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      enum: ["library", "boys_hostel", "girls_hostel"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
    
    position: {
      type: String,
      required: false,
      trim: true,
    },

    info: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FacilityAdmin", FacilityAdminSchema);
