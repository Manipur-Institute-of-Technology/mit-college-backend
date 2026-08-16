const account = require("../../model/account");
const apiResponse = require("../../utils/apiResponse");

const accountSearchEmailGet = async (req, res) => {
	// TODO: Add search controller
	const email = req.query.q.trim();

	const accountList = await account.find({ email }).select("-password");

	res.status(201).json({ accountList });
};

const accountSearchUsernameGet = async (req, res) => {
	const username = req.query.q.trim();

	const accountList = await account
		.find({
			username: { $regex: `${username}.*` },
		})
		.select("-password");

	res.status(201).json({ accountList });
};

module.exports = { accountSearchEmailGet, accountSearchUsernameGet };
