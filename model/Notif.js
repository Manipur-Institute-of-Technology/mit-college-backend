const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const NotifSchema = new Schema(
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

    type: {
      type: String,
      enum: [
        "exam",
        "admission",
        "form fillup",
        "miscellaneous",
      ],
      default: "miscellaneous",
    },

    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    active_date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notif", NotifSchema);