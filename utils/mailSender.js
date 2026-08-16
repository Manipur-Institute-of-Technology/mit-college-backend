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

const mailSender = async (email, title, body) => {
	return transporter.sendMail({
		from: `"MIT Imphal" <${process.env.BOT_MAIL}>`,
		to: email,
		subject: title,
		html: body,
	});
};

const sendMail = async (receiverMailAddr, title, htmlBody) => {
	if (process.env.ENV === "dev") {
		return null;
	}
	return transporter.sendMail({
		from: `"MIT Imphal" <${process.env.BOT_MAIL}>`,
		to: receiverMailAddr,
		subject: title,
		html: htmlBody,
	});
};

module.exports = { mailSender, sendMail };
