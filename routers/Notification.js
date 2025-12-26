const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Notif = require("../model/Notif");
const jwtAuth = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const createUploader = require("../middleware/multer");

const upload = createUploader("notifications");

router.get("/all", async (req, res) => {
	try {
		const notifications = await Notif.find().sort({ createdAt: -1 });
		res.status(200).json(notifications);
	} catch (error) {
		res.status(500).json({
			error: "Failed to fetch notifications",
		});
	}
});

router.get("/", async (req, res) => {
	try {
		const now = new Date();

		const notifications = await Notif.find({
			active_date: { $gte: now },
		}).sort({ createdAt: -1 });

		res.status(200).json(notifications);
	} catch (error) {
		res.status(500).json({
			error: "Failed to fetch active notifications",
		});
	}
});

router.post(
	"/add",
	jwtAuth,
	Authorization(["admin"]),
	upload.single("file"),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({
					error: "File is required",
				});
			}

			const { title, type, active_date } = req.body;

			if (!title) {
				return res.status(400).json({
					error: "Title is required",
				});
			}

			if (!active_date) {
				return res.status(400).json({
					error: "active_date is required",
				});
			}

			const notification = new Notif({
				fileName: req.file.filename,
				title,
				type,
				active_date: new Date(active_date),
				submittedBy: req.account._id,
			});

			await notification.save();

			res.status(201).json({
				message: "Notification created successfully",
				data: notification,
			});
		} catch (error) {
			res.status(500).json({
				error: "Failed to create notification",
			});
		}
	}
);

router.delete(
	"/delete/:id",
	jwtAuth,
	Authorization(["admin"]),
	async (req, res) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
				return res.status(400).json({
					error: "Invalid notification ID",
				});
			}

			const notification = await Notif.findById(req.params.id);

			if (!notification) {
				return res.status(404).json({
					error: "Notification not found",
				});
			}

			const filePath = path.join(
				__dirname,
				"..",
				"uploads",
				"notifications",
				notification.fileName
			);

			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}

			await notification.deleteOne();

			res.status(200).json({
				message: "Notification deleted successfully",
			});
		} catch (error) {
			res.status(500).json({
				error: "Failed to delete notification",
			});
		}
	}
);

module.exports = router;
