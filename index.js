require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const userRouter = require("./routes/userRoutes");
// var bodyParser = require("body-parser");

const app = express();

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
// app.use(bodyParser.urlencoded({ extended: false }));

// // parse application/json
// app.use(bodyParser.json());
app.use(
  fileUpload({
    useTempFiles: true,
  })
);

// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.setHeader(
//     "Access-Control-Allow-Methods",
//     "GET, POST, OPTIONS, PUT, PATCH, DELETE"
//   );
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });
//routineSpec
app.use("/user", userRouter);
app.use("/api", require("./routes/uploadAvatar"));

// app.use("/", (req, res, next) => {
//   res.json({ msg: "hello everyone" });
// });

const URI = process.env.MONGODB;
mongoose.connect(
  URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      throw err;
    }
    console.log("connected to mongodb");
  }
);

const port = process.env.PORT || 5555;

app.listen(port, () => {
  console.log("server is running on port", port);
});
