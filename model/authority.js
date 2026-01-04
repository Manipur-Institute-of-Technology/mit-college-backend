const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AuthoritySchema = new Schema(
  {
    position: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (value) {
          return /vice[-\s]?chancellor|vc|principal/i.test(value);
        },
        message:
          "Position must include Vice-Chancellor, VC, or Principal",
      },
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    info: {
      type: String,
      required: true,
    },

    photo: {
      type: String, // image URL / file path
      required: true,
    },

    bios: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Authority", AuthoritySchema);
