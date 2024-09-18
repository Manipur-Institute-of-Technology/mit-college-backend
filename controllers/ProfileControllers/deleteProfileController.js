const { FacultyProfile: faculty } = require("../../model/facultyProfile");
const apiResponse = require("../../utils/apiResponse");

const deleteProfile = async (profileId) => {
	const fc = await faculty.findOne({ _id: profileId });
	if (!fc) {
		throw new Error("profile id not found");
	}
	await faculty.deleteOne({ _id: profileId });
};

const profileDeleteHandler = async (req, res) => {
	try {
		// TODO: Get corresponding profile id for this accountid
		const accId = req.locals.acc._id;
		const profileId = await faculty.findOne({ accountId: accId }).select("_id");
		if (!profileId) throw new Error(`${profileId} not found`);

		await deleteProfile(profileId);
		return res
			.status(201)
			.json(apiResponse({ message: `${profileId} deleted successfully` }));
	} catch (err) {
		return res.status(401).json(
			apiResponse(null, {
				code: "SERVER_ERROR",
				message: err.toString(),
			}),
		);
	}
};

const profileDeleteHandlerAdmin = async (req, res) => {
	try {
		const profileId = req.params.profileId;
		await deleteProfile(profileId);
		return res
			.status(201)
			.json(apiResponse({ message: `${profileId} deleted successfully` }));
	} catch (err) {
		return res.status(401).json(
			apiResponse(null, {
				code: "SERVER_ERROR",
				message: err.toString(),
			}),
		);
	}
};

module.exports = { profileDeleteHandler, profileDeleteHandlerAdmin };
