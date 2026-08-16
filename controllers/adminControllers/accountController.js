const mongoose = require("mongoose");
const otpGen = require("otp-generator");

const account = require("../../model/account");
const permToken = require("../../model/permToken");
const otpToken = require("../../model/otpToken");
const facultyProfile = require("../../model/facultyProfile");

const apiResponse = require("../../utils/apiResponse");

const accountPatch = async (req, res) => {
	const { accountId, status } = req.body;

	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		// Check account exist
		const _acc = await account.findOne({ _id: accountId });
		if (!_acc)
			return res.status(401).json(
				apiResponse(null, {
					code: "INVALID FORM FIELD",
					message: "account id not found",
				}),
			);
		// Update Account status
		await account.updateOne({ _id: accountId }, { status });
		// Generate Perm Token for faculty account when status is set to active only
		if (_acc.accountType === "faculty" && status === "active") {
			await permToken.findOneAndUpdate(
				{ accountID: accountId },
				{ token: otpGen.generate(process.env.PERM_TOKEN_LEN) },
				{
					upsert: true,
				},
			);
		}
		await session.commitTransaction();
		session.endSession();
		res.status(202).json(apiResponse({ message: "account status updated" }));
	} catch (err) {
		await session.abortTransaction();
		session.endSession();

		return res
			.status(401)
			.json(
				apiResponse(null, { code: "SERVER_ERROR", message: err.toString() }),
			);
	}
};

const accountDelete = async (req, res) => {
	const { accountId } = req.body;

	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const _acc = await account.findOne({ _id: accountId });
		if (!_acc)
			return res.status(401).json(
				apiResponse(null, {
					code: "INVALID FORM FIELD",
					message: "account id not found",
				}),
			);

		const accountType = _acc.accountType;
		await account.deleteOne({ _id: accountId });

		// Delete Permanent Token, if faculty
		if (accountType === "faculty") {
			await permToken.deleteOne({ accountID: accountId });
			// Delete related info from facultyProfile collection
			await facultyProfile.deleteOne({ accountId: accountId });
		}
		// Delete related info from OTP collection, if exist
		await otpToken.deleteMany({ accountID: accountId });

		await session.commitTransaction();
		session.endSession();

		res
			.status(201)
			.json(apiResponse({ message: `${accountId} deleted successfully` }));
	} catch (err) {
		await session.abortTransaction();
		session.endSession();

		return res
			.status(401)
			.json(
				apiResponse(null, { code: "SERVER_ERROR", message: err.toString() }),
			);
	}

	return;
};

module.exports = { accountPatch, accountDelete };
