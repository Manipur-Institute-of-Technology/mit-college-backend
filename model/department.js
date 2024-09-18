const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DepartmentSchema = new Schema({
	name: {
		type: String,
		requires: true,
		lowercase: true,
		maxLength: 100,
	},
});

DepartmentSchema.static.getDepartmentById = async function (dId) {
	const department = await this.findOne({ _id: dId });
	if (!department) throw new Error(`Department Id: ${dId} doesnt exist`);
	return department;
};

DepartmentSchema.static.getAllDepartment = async function () {
	return await this.find({});
};

DepartmentSchema.static.AddDepartment = async function (departmentName) {
	const isExist = await this.findOne({ name: departmentName });
	if (isExist)
		throw new Error(`Department with name: ${departmentName} already exist`);
	// await t
};

module.exports = mongoose.model("Department", DepartmentSchema);
