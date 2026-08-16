const bcrypt = require("bcryptjs");
const otpGen = require("otp-generator");

const Account = require("../../model/account");
const OTPToken = require("../../model/otpToken");

const apiResponse = require("../../utils/apiResponse");
const { sendMail } = require("../../utils/mailSender");
const htmlMailVerifyOTPTemplate = require("../../template/mailVerifyOTPTemplate");

const verifyEmailGet = async (req, res) => {
	const { id } = res.locals.decodedToken;

	const otpTokenDuration = 30; // in minutes
	const otpTokenStr = otpGen.generate(8, { specialChars: false });

	try {
		const _otpToken = await OTPToken.findOneAndUpdate(
			{ accountID: id, verificationType: "mailVerification" },
			{
				token: await bcrypt.hash(otpTokenStr, 8),
				validDuration: otpTokenDuration,
			},
			{
				new: true,
				upsert: true,
			},
		).populate("accountID");

		// Send OTP EMail
		await sendMail(
			_otpToken.accountID.email,
			"Email Verification",
			htmlMailVerifyOTPTemplate({
				otpToken: otpTokenStr,
				otpTokenDuration: `${otpTokenDuration} minutes`,
			}),
		);
		res.status(201).json(
			apiResponse({
				message: `OTP send to ${_otpToken.accountID.email} successfully`,
			}),
		);
	} catch (err) {
		res.status(400).json(
			apiResponse(null, {
				code: "OTP_SERVICE_ERROR",
				message: err.toString(),
			}),
		);
	}
};

const verifyEmailPost = async (req, res) => {
	// TODO: Since, we'll be using OTP verification frequently, why dont we write it as a middleware
	// Get otp from DB

	const _otp = await OTPToken.findOne({
		accountID: res.locals.decodedToken.id,
		verificationType: "mailVerification",
	});
	// Check otp token entry in DB
	if (!_otp) {
		return res.status(401).json(
			apiResponse(null, {
				code: "OTP_SERVICE_ERROR",
				message: process.env.ENV === "dev" ? "OTP timeout" : "OTP timeout",
			}),
		);
	}
	try {
		// Check OTP is valid
		await _otp.verifyToken(req.body.mailOTPCode);
		// change account status to pending by admin
		await Account.findOneAndUpdate(
			{ _id: res.locals.decodedToken.id },
			{
				status: "pending",
			},
		);
		// Remove token from DB
		await OTPToken.deleteOne({ _id: _otp._id });

		res.status(201).json(apiResponse({ message: "OTP successfully verified" }));
	} catch (err) {
		res.status(401).json(
			apiResponse(null, {
				code: "OTP_SERVICE_ERROR",
				message: err.toString(),
			}),
		);
	}
};

module.exports = { verifyEmailGet, verifyEmailPost };
