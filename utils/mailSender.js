const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 465,
	secure: true,
	auth: {
		user: process.env.BOT_MAIL,
		pass: process.env.BOT_MAIL_PASSWORD,
	},
});

transporter.verify((err, success) => {
	if (err) {
		console.error("❌ SMTP FAIL:", err.message);
	} else {
		console.log("✅ SMTP READY");
	}
});

const mailSender = async (email, title, body) => {
	try {
		const info = await transporter.sendMail({
			from: `"MIT Imphal" <${process.env.BOT_MAIL}>`,
			to: email,
			subject: title,
			html: body,
		});

		console.log("Email sent:", info.messageId);
		return info;
	} catch (error) {
		console.error("Mail Error:", error.message);
		throw error;
	}
};

const sendMail = async (receiverMailAddr, title, htmlBody) => {
	if (process.env.ENV === "dev") {
		console.log("DEV MODE: OTP mail not sent");
		return null;
	}
	try {
		const info = await transporter.sendMail({
			from: `"MIT Imphal" <${process.env.BOT_MAIL}>`,
			to: receiverMailAddr,
			subject: title,
			html: htmlBody,
		});

		console.log("OTP Mail Sent:", info.messageId);
		return info;
	} catch (error) {
		console.error("OTP Mail Error:", error.message);
		throw error;
	}
};

module.exports = { mailSender, sendMail };
