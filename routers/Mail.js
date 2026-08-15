const express = require("express");
const router = new express.Router();

const Mail = require("../model/mail");
const jwtAuth = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

router.post("/SendMail", async (req, res) => {
	try {
		const newMail = new Mail(req.body);
		await newMail.save();

		res.status(201).json({
			message: "Mail sent successfully",
		});
	} catch (error) {
		res.status(400).json({
			error: error.message,
		});
	}
});

router.get(
	"/GetMails",
	jwtAuth,
	Authorization(["admin"]),
	async (req, res) => {
		try {
			const mails = await Mail.find({}).sort({ _id: -1 });
			res.status(200).json(mails);
		} catch (error) {
			res.status(400).json({
				error: "Failed to fetch mails",
			});
		}
	}
);

router.delete(
	"/DeleteMail/:_id",
	jwtAuth,
	Authorization(["admin"]),
	async (req, res) => {
		try {
			const deletedMail = await Mail.findOneAndDelete({
				_id: req.params._id,
			});

			if (!deletedMail) {
				return res.status(404).json({
					error: "Mail not found",
				});
			}

			res.status(200).json({
				message: "Mail deleted successfully",
			});
		} catch (error) {
			res.status(400).json({
				error: "Mail delete failed",
			});
		}
	}
);

module.exports = router;
