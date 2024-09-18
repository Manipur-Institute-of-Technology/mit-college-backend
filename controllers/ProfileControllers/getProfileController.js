const { facultyProfile: faculty } = require("../../model/facultyProfile");
const apiResponse = require("../../utils/apiResponse");

const getProfile = async (profileId) => {
	const profile = await faculty.findOne({ _id: profileId });
	if (!profile) throw new Error(`${profileId} not found`);
	return profile;
};

/**
 *
 * Get Profile Handler by faculty owner
 */
const profileGetHandlerFaculty = async (req, res) => {
	try {
		const accId = req.locals.acc._id;
		const profileId = await faculty.findOne({ acountId: accId });
		if (!profileId) throw new Error(`${profileId} not found`);
		const profileInfo = await getProfile(profileId);
		return res.status(201).json(apiResponse(profileInfo));
	} catch (err) {
		return res.status(401).json(
			apiResponse(null, {
				code: "SEVER_ERROR",
				message: err.toString(),
			}),
		);
	}
};

/**
 *
 * Get Profile Handler by public
 */
const profileGetHandler = async (req, res) => {
	try {
		const profileId = req.params.profileId;
		const profileInfo = await getProfile(profileId);
		return res.status(201).json(apiResponse(profileInfo));
	} catch (err) {
		return res.status(401).json(
			apiResponse(null, {
				code: "SEVER_ERROR",
				message: err.toString(),
			}),
		);
	}
};

module.exports = { profileGetHandler, profileGetHandlerFaculty };
