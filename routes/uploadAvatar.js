const uploadController = require("../controllers/uploadControllers");
const uploadImage = require("../middlewares/uploadImage");
const auth = require("../middlewares/auth");

const uploadRouter = require("express").Router();

uploadRouter.post(
  "/upload_avatar",
  auth,
  uploadImage,
  uploadController.uploadAvatar
);

module.exports = uploadRouter;
