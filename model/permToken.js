const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PermTokenSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
      length: 32,
    },

    purpose: {
      type: String,
      enum: ["forgot_password"],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Auto delete expired tokens
PermTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PermToken", PermTokenSchema);
