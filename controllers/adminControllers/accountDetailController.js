const account = require("../../model/account");
const permToken = require("../../model/permToken");

const apiResponse = require("../../utils/apiResponse");

const accountDetailGet = async (req, res) => {
	const accountId = req.params.accountId;
	try {
		// Get account
		const _acc = await account.findOne({ _id: accountId }).select("-password");

		if (!_acc) {
			return res.status(401).json(
				apiResponse(null, {
					code: "INVALID_FORM_FIELD",
					message: "account id not found",
				}),
			);
		}
		// 	Get permToken
		const _permToken = await permToken
			.findOne({ accountID: accountId })
			.select("token updatedAt");
		return res
			.status(201)
			.json(apiResponse({ accountInfo: _acc, permToken: _permToken }));
	} catch (err) {
		return res.status(401).json(
			apiResponse(null, {
				code: "SERVER_ERROR",
				message: err.toString(),
			}),
		);
	}
};

module.exports = { accountDetailGet };
