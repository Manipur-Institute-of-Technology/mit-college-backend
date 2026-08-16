const { mailSender } = require("../utils/mailSender");
const otpGen = require("otp-generator");

const otpToken = otpGen.generate(8, {
	upperCaseAlphabets: false,
	lowerCaseAlphabets: false,
	specialChars: false,
});

mailSender(
	"receiver@gmail.com",
	"OTP Verification",
	`<h1>Please confirm your OTP</h1>
     <p>Here is your OTP code: <b>${otpToken}</b></p>`
)
	.then(() => {})
	.catch(() => {});
