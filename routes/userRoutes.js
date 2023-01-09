const userController = require("../controllers/userController");
const auth = require("../middlewares/auth");
const authAdmin = require("../middlewares/authAdmin");

const userRouter = require("express").Router();

userRouter.post("/register", userController.register);
userRouter.post("/activation", userController.activateEmail);
userRouter.post("/login", userController.login);
userRouter.post("/refresh", userController.getAccessToken);

userRouter.post("/forgot__password", userController.forgotPassword);
userRouter.post("/reset__password", auth, userController.resetPassword);

userRouter.get("/info", auth, userController.getUserInfo);
userRouter.get("/all_info", auth, authAdmin, userController.getAllUserInfo);

userRouter.get("/log_out", userController.logOut);
userRouter.patch("/update", auth, userController.updateUser);
userRouter.patch(
  "/update_role/:id",
  auth,
  authAdmin,
  userController.updateUsersRole
);
userRouter.delete("/delete/:id", auth, authAdmin, userController.deleteUser);

//social login??
userRouter.post("/google_login", userController.googleLogin);
userRouter.post("/facebook_login", userController.facebookLogin);

module.exports = userRouter;
