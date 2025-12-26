const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Schema = mongoose.Schema;

const OTPTokenSchema = new Schema(
	{
		accountID: {
			type: Schema.Types.ObjectId,
			ref: "Account",
			required: true,
			index: true,
		},
		token: {
			type: String, // hashed OTP
			required: true,
		},
		validDuration: {
			type: Number, // minutes
			required: true,
		},
		verified: {
			type: Boolean,
			default: false,
		},
		verificationType: {
			type: String,
			enum: ["mailVerification", "forgotPassword"],
			default: "mailVerification",
		},
		expiresAt: {
			type: Date,
			default: () => Date.now() + 5 * 60 * 1000, // 5 minutes
			index: { expires: 0 }, // TTL index
		},
	},
	{ timestamps: true },
);

OTPTokenSchema.methods.verifyToken = async function (otp) {
	if (Date.now() > this.expiresAt.getTime()) {
		throw new Error("OTP expired");
	}

	const match = await bcrypt.compare(otp, this.token);
	if (!match) throw new Error("Invalid OTP");

	this.verified = true;
	await this.save();
	return true;
};

module.exports = mongoose.model("OTPToken", OTPTokenSchema);
