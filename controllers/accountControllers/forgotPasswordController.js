const mongoose = require("mongoose");
const otpGen = require("otp-generator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const account = require("../../model/account");
const otpToken = require("../../model/otpToken");
const permToken = require("../../model/permToken");

const { sendMail } = require("../../utils/mailSender");
const apiResponse = require("../../utils/apiResponse");
const htmlMailVerifyOTPTemplate = require("../../template/mailVerifyOTPTemplate");

const OTPInterval = require("../../middleware/OTPInterval");

const forgotPasswordGet = async (req, res) => {
    const { email, accountType } = req.body;

    try {
        // =====================================================
        // VALIDATE EMAIL
        // =====================================================

        if (!email) {
            return res.status(400).json(
                apiResponse(null, {
                    code: "EMAIL_REQUIRED",
                    message: "Email is required",
                })
            );
        }

        if (!["admin", "faculty"].includes(accountType)) {
            return res.status(400).json(
                apiResponse(null, {
                    code: "INVALID_ACCOUNT_TYPE",
                    message: "Invalid account type",
                })
            );
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        // =====================================================
        // FIND ACCOUNT
        // =====================================================

        const _acc = await account.findOne({
            email: normalizedEmail,
            accountType,
        });

        if (!_acc) {
            return res.status(404).json(
                apiResponse(null, {
                    code: "ACCOUNT_NOT_FOUND",
                    message:
                        "No account exists with this email.",
                })
            );
        }

        // =====================================================
        // OTP RATE LIMIT
        // =====================================================

        res.locals.decodedToken = {
            id: _acc._id.toString(),
        };

        await OTPInterval(
            1,
            "forgotPassword"
        )(req, res, () => {});

        if (res.headersSent) {
            return;
        }

        // =====================================================
        // GENERATE NUMERIC OTP
        // =====================================================
		console.log("OTP_TOKEN_LEN from ENV:", process.env.OTP_TOKEN_LEN);
		console.log("OTP length:", Number(process.env.OTP_TOKEN_LEN));

        const otpTokenStr = otpGen.generate(
            Number(process.env.OTP_TOKEN_LEN),
            {
                digits: true,
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            }
        );

        // =====================================================
        // HASH OTP
        // =====================================================

        const hashedOTP = await bcrypt.hash(
            otpTokenStr,
            Number(process.env.SALT)
        );

        // =====================================================
        // STORE OTP
        // =====================================================

        const _otpToken =
            await otpToken.findOneAndUpdate(
                {
                    accountID: _acc._id,
                    verificationType:
                        "forgotPassword",
                },
                {
                    token: hashedOTP,

                    validDuration:
                        Number(
                            process.env
                                .OTP_TOKEN_DURATION
                        ),

                    verified: false,

                    expiresAt:
                        new Date(
                            Date.now() +
                                Number(
                                    process.env
                                        .OTP_TOKEN_DURATION
                                ) *
                                60 *
                                1000
                        ),
                },
                {
                    new: true,
                    upsert: true,
                }
            );

        // =====================================================
        // SEND OTP EMAIL
        // =====================================================

        await sendMail(
            _acc.email,
            "Forgot Password - OTP",
            htmlMailVerifyOTPTemplate({
                otpToken: otpTokenStr,
                otpTokenDuration:
                    `${process.env.OTP_TOKEN_DURATION} minutes`,
            })
        );

        // =====================================================
        // DEVELOPMENT LOG
        // =====================================================

        if (process.env.ENV === "dev") {
            console.log(
                "================================="
            );

            console.log(
                "FORGOT PASSWORD OTP:"
            );

            console.log(
                "Email:",
                _acc.email
            );

            console.log(
                "Account Type:",
                _acc.accountType
            );

            console.log(
                "OTP:",
                otpTokenStr
            );

            console.log(
                "================================="
            );
        }

        // =====================================================
        // CREATE OTP ID TOKEN
        // =====================================================

        const otpId = jwt.sign(
            {
                id: _otpToken._id,
            },
            process.env.JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn:
                    `${process.env.OTP_TOKEN_DURATION}m`,
            }
        );

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(201).json(
            apiResponse({
                message:
                    `OTP sent to ${_acc.email} successfully`,

                otpId,

                expiresIn:
                    Number(
                        process.env
                            .OTP_TOKEN_DURATION
                    ) * 60,
            })
        );

    } catch (err) {
        console.error(
            "FORGOT PASSWORD OTP ERROR:",
            err
        );

        return res.status(500).json(
            apiResponse(null, {
                code: "SERVER_ERROR",
                message:
                    err.message ||
                    "Failed to send OTP",
            })
        );
    }
};

const forgotPasswordVerifyOTPPost = async (req, res) => {
	console.log(req.body);
	const otpTokenStr = req.body.otpToken,
		otpIdToken = req.body.otpId;

	try {
		// Verify otpId-jwt-token
		const decodedToken = jwt.verify(otpIdToken, process.env.JWT_SECRET, {
			algorithms: "HS256",
		});
		// verify otpID
		const _otp = await otpToken.findOne({
			_id: decodedToken.id,
			verified: false,
			// token: await bcrypt.hash(otpTokenStr, +process.env.SALT),
			verificationType: "forgotPassword",
		});
		if (!_otp) {
			return res.status(401).json(
				apiResponse(null, {
					code: "OTP_VERIFICATION_ERROR",
					message: "invalid OTP token",
				}),
			);
		}
		// Verify otp token
		if (!(await bcrypt.compare(otpTokenStr, _otp.token)))
			return res.status(401).json(
				apiResponse(null, {
					code: "OTP_VERIFICATION_ERROR",
					message: "invalid OTP token",
				}),
			);
		// Update Token status
		await otpToken.findOneAndUpdate(
			{ _id: decodedToken.id },
			{ verified: true },
		);
		// Return jsontoken
		const jwtToken = jwt.sign(
			{
				id: decodedToken.id,
				expiredAt: Date.now() + process.env.OTP_TOKEN_DURATION * 1000 * 60,
			},
			process.env.JWT_SECRET,
			{ algorithm: "HS256", expiresIn: `${process.env.OTP_TOKEN_DURATION}m` },
		);
		res
			.status(201)
			.json(
				apiResponse({ message: "OTP successfully verify", token: jwtToken }),
			);
	} catch (err) {
		console.error(err);
		res.status(401).json(
			apiResponse(null, {
				code: "OTP_VERIFICATION_ERROR",
				message: err.toString(),
			}),
		);
	}
};

const forgotPasswordOTPPost = async (req, res) => {
	const jwtOtpToken = req.body.otpToken;
	const password = req.body.password;
	console.log(password, jwtOtpToken);
	try {
		// Verify token
		const decoded = jwt.verify(jwtOtpToken, process.env.JWT_SECRET, {
			algorithm: "HS256",
		});
		// check otp verified or not
		const otpTokenId = decoded.id;
		console.log(decoded);
		const { expiredAt } = decoded;
		console.log(typeof expiredAt);

		if (Date.now() >= new Date(expiredAt).getTime()) {
			console.log("expired token");
			return res.status(401).json(
				apiResponse(null, {
					code: "OTP_VERIFICATION_ERROR",
					message: "expired otp token",
				}),
			);
		}
		// Check id in otp collection
		const _otp = await otpToken.findOne({ _id: otpTokenId });
		if (!_otp) {
			return res.status(401).json(
				apiResponse(null, {
					code: "OTP_VERIFICATION_ERROR",
					message: "invalid otp token",
				}),
			);
		}
		// Check otp verfied
		if (!_otp.verified) {
			return res.status(401).json(
				apiResponse(null, {
					code: "OTP_VERIFICATION_ERROR",
					message: "otp not verified",
				}),
			);
		}
		// update password
		await account.updateOne(
			{ _id: _otp.accountID },
			{
				password: await bcrypt.hash(password, +process.env.SALT),
			},
		);
		// delete otp request from db
		await otpToken.deleteOne({ _id: otpTokenId });
		return res
			.status(201)
			.json(apiResponse({ message: `password successfully changed` }));
	} catch (err) {
		console.error(err);
		res.status(401).json(
			apiResponse(null, {
				code: "OTP_VERIFICATION_ERROR",
				message: err.toString(),
			}),
		);
	}
};

const forgotPasswordPermTokenPost = async (req, res) => {
	const _permToken = req.body.permToken,
		password = req.body.password;

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		// Verifies data
		// Token doesnt match
		const iPermToken = await permToken.findOne({ token: _permToken });
		if (!iPermToken) {
			return res.status(401).json(
				apiResponse(null, {
					code: "INVALID_TOKEN",
					message: "invalid perm token",
				}),
			);
		}
		// Update password
		const _acc = await account.findOneAndUpdate(
			{ _id: iPermToken.accountID },
			{ password: await bcrypt.hash(password, +process.env.SALT) },
			{ new: true },
		);

		// update permToken after its used
		await permToken.updateOne(
			{ token: _permToken },
			{
				createdAt: Date.now(),
				token: otpGen.generate(+process.env.PERM_TOKEN_LEN),
			},
		);

		await session.commitTransaction();
		session.endSession();

		return res.status(201).json({
			message: "password successfully changed",
			username: _acc.username,
			email: _acc.email,
		});
	} catch (err) {
		console.error(err);

		await session.abortTransaction();
		session.endSession();

		return res.status(401).json(
			apiResponse(null, {
				code: "TOKEN_VERIFICATION_FAILED",
				nessage: err.toString(),
			}),
		);
	}
};

module.exports = {
	forgotPasswordGet,
	forgotPasswordOTPPost,
	forgotPasswordPermTokenPost,
	forgotPasswordVerifyOTPPost,
};
