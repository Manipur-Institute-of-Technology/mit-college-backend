const express = require("express");
const { gender, facultyRoles } = require("../model/facultyProfile");
const apiResponse = require("../utils/apiResponse");

const router = new express.Router();

router.get("/roles", (req, res) => {
	res.status(200).json(apiResponse(facultyRoles));
});

router.get("/gender", (req, res) => {
	res.status(201).json(apiResponse(gender));
});

module.exports = router;
