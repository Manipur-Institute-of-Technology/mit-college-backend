const validator = require("validator");
const { ReqFieldValidator } = require("../middleware/FieldValidator");
const { facultyRoles, gender } = require("../model/facultyProfile");
const { default: mongoose } = require("mongoose");
const Department = require("../model/department");

const FacultyProfileFieldVal = ReqFieldValidator(
	{
		code: "INCOMPLETE_FIELD",
		message: "Mandatory Profile fields are not complete",
	},
	[
		{
			location: "body",
			keys: ["email"],
			validatorCb: (val) => validator.isEmail(val),
			error: "Invalid Email",
		},
		{
			location: "body",
			keys: ["phoneNumber"],
			validatorCb: (val) =>
				validator.isMobilePhone(
					val,
					validator.isMobilePhoneLocales.filter((d) => d === "en-IN"),
				),
			error: "Invalid Phone Number, Only India Number is allowed",
		},
		{
			location: "body",
			keys: ["namePrefix"],
			validatorCb: (val) => val.length !== 0,
			error: "Name Prefix cannot be empty",
		},
		{
			location: "body",
			keys: ["firstName"],
			validatorCb: (val) => val.length !== 0,
			error: "First Name cannot be empty",
		},
		{
			location: "body",
			keys: ["lastName"],
			validatorCb: (val) => val.length !== 0,
			error: "Last Name cannot be empty",
		},
		{
			location: "body",
			keys: ["sex"],
			validatorCb: (val) =>
				gender.filter((d) => d.toLowerCase() === val).length === 1,
			error: "invalid sex field",
		},
		{
			location: "body",
			keys: ["startDate"],
			validatorCb: (val) => validator.isDate(val),
			error: "invalid start date field",
		},
		{
			location: "body",
			keys: ["departmentId"],
			validatorCb: (val) => {
				if (!mongoose.Types.ObjectId.isValid(val)) return false;
				return (async () => {
					try {
						await Department.getDepartmentById(val);
					} catch (err) {
						return false;
					}
					return true;
				})();
			},
			error: "invalid department field",
		},
		{
			location: "body",
			keys: ["highestDeg"],
			validatorCb: (val) =>
				val.degName.length !== 0 && val.instituteName.length !== 0,
			error: "degree name or institute name cannot be empty",
		},
		{
			location: "body",
			keys: ["expertFields"],
			validatorCb: (val) => {
				val = val.filter((d) => d.length !== 0);
				if (val.length === 0) {
					return false;
				}
				return true;
			},
			setter: (val) => {
				return [
					{
						fieldName: "expertFieldsFltr",
						value: val.filter((d) => d.length !== 0),
					},
				];
			},
			error: "invalid expert field",
		},
		{
			location: "body",
			keys: ["published"],
			validatorCb: (vals) => {
				for (const val of vals) {
					if (!val.title || val.title.length === 0) return false;
					if (!val.type || val.type.length === 0) return false;
					if (
						!val.year ||
						!(
							1990 <= parseInt(val) && parseInt(val) <= new Date().getFullYear()
						)
					)
						return false;
					if (!val.paperLink || !/https?:\/\/(www\.)?.+/g.test(val))
						return false;
				}
				return true;
			},
			error: `
			invalid paper info:\n
			Reasons\n
			- paper title cannot be empty
			- paper type cannot be empty
			- invalid paper published year,\nyear should be integer and between ${1900} and ${new Date().getFullYear()}, inclusive
			- invalid paper link, paper link should in format: ${
				/https?:\/\/(www\.)?.+/.source
			}\n eg: http://paper.io/johnsnow/213w3`,
		},
		{
			location: "body",
			keys: ["roles"],
			validatorCb: (vals) => {
				vals = vals.filter((d) => d.length !== 0);
				for (const val of vals) {
					const indx = facultyRoles.indexOf(val);
					if (indx === -1) return false;
				}
				return true;
			},
			setter: (vals) => {
				vals = vals.filter((d) => d.length !== 0);
				const st = new Set();
				for (const val of vals) {
					st.add(val);
				}
				return { fieldName: "rolesF", value: [...st.values()] };
			},
			error: "invalid faculty role",
		},
	],
);

module.exports = FacultyProfileFieldVal;
