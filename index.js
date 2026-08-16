require("dotenv").config({ path: "config/dev.env" });

const express = require("express");
const logger = require("morgan");
const cors = require("cors");

const mongoose = require("./db/mongoose");

const apiResponse = require("./utils/apiResponse");

const accountRouter = require("./routers/Account");
const adminRouter = require("./routers/Admin");
const mailRouter = require("./routers/Mail");
const notification = require("./routers/Notification");
const download = require("./routers/Download");
const information = require("./routers/Information");
const department = require("./routers/Department");
const gallery = require("./routers/Gallery");
const image = require("./routers/Image");
const authority = require("./routers/Authority");
const sideAdmin = require("./routers/SideAdmin");
const studentList = require("./routers/StudentList");
const nirfRouter = require("./routers/Nirf");
const conferenceRouter = require("./routers/Conference");
const aicteVaaniRouter = require("./routers/AicteVaani");
const administratorRouter = require("./routers/InstituteAdministrator");
const facultyRouter = require("./routers/Faculty");
const facultyUpdate = require("./routers/FacultyUpdate");
const paperRouter = require("./routers/Paper");
const carouselRouter = require("./routers/ImageCarousal");

const app = express();

app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(require("path").join(process.cwd(), "uploads")));

app.use("/mit/account", accountRouter);
app.use("/mit/admin", adminRouter);
app.use("/mit/mail", mailRouter);
app.use("/mit/notification", notification);
app.use("/mit/download", download);
app.use("/mit/information", information);
app.use("/mit/department", department);
app.use("/mit/gallery", gallery);
app.use("/mit/image", image);
app.use("/mit/authority", authority);
app.use("/mit/sideadmin", sideAdmin);
app.use("/mit/studentlist", studentList);
app.use("/mit/nirf", nirfRouter);
app.use("/mit/conference", conferenceRouter);
app.use("/mit/aicte-vaani", aicteVaaniRouter);
app.use("/mit/administrator", administratorRouter);

// Faculty public APIs
app.use("/mit/faculty", facultyRouter);

app.use("/mit/paper", paperRouter);
app.use("/mit/carousel", carouselRouter);
// Faculty update APIs (protected)
app.use("/mit/faculty-update", facultyUpdate);

app.use((req, res, next) => {
	return res.status(404).json(
		apiResponse(null, {
			code: "NOT FOUND",
			message: "invalid API route",
		}),
	);
});


app.use((err, req, res, next) => {
	return res.status(500).send(
		apiResponse(null, {
			code: "INTERNAL_SERVER_ERROR",
			message: err.toString(),
		}),
	);
});

app.listen(process.env.PORT);


