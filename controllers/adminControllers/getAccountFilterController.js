const account = require("../../model/account");

const apiResponse = require("../../utils/apiResponse");

const getAccountFilterGet = async (req, res) => {
	// /getaccounts/filter?accountType=x&status=x
	const { accountType, status } = req.query;

	const filterParams = {};
	if (accountType) filterParams["accountType"] = accountType;
	if (status) filterParams["status"] = status;

	return res.status(201).json(apiResponse(await account.find(filterParams)));
};

module.exports = { getAccountFilterGet };
