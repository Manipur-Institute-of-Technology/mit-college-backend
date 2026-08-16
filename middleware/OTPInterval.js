const mongoose = require("mongoose");
const OTPToken = require("../model/otpToken");
const apiResponse = require("../utils/apiResponse");

const OTPInterval =
    (interval, verificationType) =>
    async (req, res, next) => {

        try {
            const token =
                await OTPToken.findOne({
                    accountID:
                        res.locals
                            .decodedToken
                            .id,

                    verificationType,
                }).sort({
                    updatedAt: -1,
                });

            if (!token) {
                return next();
            }

            const nextAllowed =
                new Date(
                    token.updatedAt
                ).getTime() +
                interval *
                    60 *
                    1000;

            if (
                Date.now() <
                nextAllowed
            ) {
                const remainingSeconds =
                    Math.ceil(
                        (nextAllowed -
                            Date.now()) /
                            1000
                    );

                const minutes =
                    Math.floor(
                        remainingSeconds /
                            60
                    );

                const seconds =
                    remainingSeconds %
                    60;

                return res
                    .status(429)
                    .json(
                        apiResponse(
                            null,
                            {
                                code: "OTP_SERVICE_ERROR",

                                message:
                                    `OTP can be requested after ${minutes}m ${seconds}s`,

                                retryAfter:
                                    remainingSeconds,
                            }
                        )
                    );
            }

            next();

        } catch (error) {
            return res
                .status(500)
                .json(
                    apiResponse(
                        null,
                        {
                            code:
                                "OTP_INTERVAL_ERROR",

                            message:
                                error.message,
                        }
                    )
                );
        }
    };

module.exports = OTPInterval;
