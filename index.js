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

const app = express();

app.use(logger("dev"));
app.use(cors());
app.use(express.json());

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

app.use((req, res, next) => {
	return res.status(404).json(
		apiResponse(null, {
			code: "NOT FOUND",
			message: "invalid API route",
		}),
	);
});


app.use((err, req, res, next) => {
	console.error(err.stack);
	return res.status(500).send(
		apiResponse(null, {
			code: "INTERNAL_SERVER_ERROR",
			message: err.toString(),
		}),
	);
});

const os = require("os");

const getHost = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
};

app.listen(process.env.PORT, () => {
	const host = getHost();
	console.log(`Listening on port: http://${host}:${process.env.PORT}`);
});



