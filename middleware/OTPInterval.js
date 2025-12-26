const mongoose = require("mongoose");
const OTPToken = require("../model/otpToken");
const apiResponse = require("../utils/apiResponse");

const OTPInterval = (interval, verificationType) => async (req, res, next) => {
	const token = await OTPToken.findOne({
		accountID: res.locals.decodedToken.id,
		verificationType,
	}).sort({ updatedAt: -1 });

	if (!token) return next();

	const nextAllowed =
		new Date(token.updatedAt).getTime() + interval * 1000;

	if (Date.now() < nextAllowed) {
		return res.status(429).json(
			apiResponse(null, {
				code: "OTP_SERVICE_ERROR",
				message: `OTP can be requested after ${interval} minutes`,
			})
		);
	}
	next();
};

module.exports = OTPInterval;

