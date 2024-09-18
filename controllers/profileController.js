const {
	profileDeleteHandler,
	profileDeleteHandlerAdmin,
} = require("./ProfileControllers/deleteProfileController");
const {
	profileGetHandler,
	profileGetHandlerFaculty,
} = require("./ProfileControllers/getProfileController");

module.exports = {
	profileDeleteHandler,
	profileDeleteHandlerAdmin,
	profileGetHandler,
	profileGetHandlerFaculty,
};
