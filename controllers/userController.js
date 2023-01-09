const Users = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendMail = require("../controllers/sendMail");
const { google } = require("googleapis");
const processNested = require("express-fileupload/lib/processNested");
const { OAuth2 } = google.auth;

const fetch = require("node-fetch");
const client = new OAuth2(process.env.MAILING_SERVICE_CLIENT_ID);

const { CLIENT_URL } = process.env;

const userController = {
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(500).json({ msg: "please fill out all the field" });
      }
      if (!validateEmail(email)) {
        return res
          .status(404)
          .json({ msg: "invalid email. please give the valid email" });
      }
      const user = await Users.findOne({ email });
      if (user)
        return res.status(400).json({ msg: "this email already exists" });
      if (name.length <= 3) {
        return res
          .status(404)
          .json({ msg: "name must be 3 characters or avobe" });
      }
      if (password.length <= 6) {
        return res
          .status(404)
          .json({ msg: "password must be 6 characters or avobe" });
      }
      const passwordHash = await bcrypt.hash(password, 12);

      const newUser = {
        name,
        email,
        password: passwordHash,
      };

      const activation_token = createActivationToken(newUser);

      const url = `${CLIENT_URL}/user/activate/${activation_token}`;
      sendMail(email, url, "verify your email address");

      return res.json({
        msg: "register success! please activate email to start",
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ msg: err.message });
    }
  },
  activateEmail: async (req, res) => {
    try {
      const { activation_token } = req.body;
      const user = jwt.verify(activation_token, process.env.ACTIVATIONTOKEN);

      // console.log(user);

      const { name, email, password } = user;

      const check = await Users.findOne({ email });
      if (check)
        return res.status(400).json({
          msg: "this email is exists on another account. please provide another email.",
        });

      const newUser = new Users({
        name,
        email,
        password,
      });

      await newUser.save();

      res.json({ msg: "Account has been activated" });
    } catch (err) {
      // console.log(err);
      return res.status(500).json({ msg: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      // console.log(email, password);
      const user = await Users.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ msg: "there is no account in this email" });
      }
      const userExists = await Users.findOne({ email: email });
      // console.log(userExists);

      const IsMatch = await bcrypt.compare(password, user.password);
      if (!IsMatch)
        return res.status(400).json({ msg: "password does not match" });

      const refresh_token = createRefreshToken({ id: user._id });
      console.log("admin token", refresh_token);

      res.cookie("refreshtoken", refresh_token, {
        httpOnly: true,
        path: "/user/refresh",
        expires: new Date(Date.now() + 25892000000),
      });

      res.json({ msg: "login success", user: userExists });
    } catch (err) {
      console.log(err);
      return res.status(500).json(err.message);
    }
  },
  getAccessToken: (req, res) => {
    const rf_token = req.cookies.refreshtoken;

    if (!rf_token) return res.status(404).json({ msg: "token not found" });

    jwt.verify(rf_token, process.env.REFRESHTOKEN, (err, user) => {
      if (err) return res.status(400).json({ msg: "please login now" });

      const access_token = createAccessToken({ id: user.id });

      return res.status(200).json({ token: access_token });
    });
  },
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await Users.findOne({ email });
      if (!user)
        return res
          .status(404)
          .json({ msg: "this email does not have an account" });
      const access_token = createAccessToken({ id: user._id });
      const url = `${CLIENT_URL}/user/reset/${access_token}`;

      sendMail(email, url, "reset your password.");

      return res.json({ msg: "resend the password. please check the email" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ msg: err.message });
    }
  },
  resetPassword: async (req, res) => {
    try {
      const { password } = req.body;
      console.log(password);
      const passwordHash = await bcrypt.hash(password, 12);

      await Users.findOneAndUpdate(
        { _id: req.user.id },
        {
          password: passwordHash,
        }
      );

      return res.json({ msg: "password successfully has changed" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  getUserInfo: async (req, res) => {
    console.log(req.user.id);
    try {
      const user = await Users.findById(req.user.id).select("-password");

      res.json(user);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  getAllUserInfo: async (req, res) => {
    try {
      console.log(req.user);
      const user = await Users.find().select("-password");

      return res.json(user);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  logOut: async (req, res) => {
    try {
      res.clearCookie("refreshtoken", { path: "/user/refresh_token" });
      return res.json({ msg: "loggedOut" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  updateUser: async (req, res) => {
    try {
      const { name, avatar } = req.body;
      console.log(name);
      await Users.findOneAndUpdate(
        { _id: req.user.id },
        {
          name,
          avatar,
        }
      );
      return res.json({ msg: "your profile updated  successfully" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  updateUsersRole: async (req, res) => {
    try {
      const { role } = req.body;
      await Users.findOneAndUpdate(
        { _id: req.params.id },
        {
          role,
        }
      );
      return res.json({ msg: "user role has been updated" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  deleteUser: async (req, res) => {
    console.log();
    try {
      await Users.findByIdAndDelete({ _id: req.params.id });
      res.json({ msg: "user deleted successfully" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  ///social media login

  googleLogin: async (req, res) => {
    try {
      const { tokenId } = req.body;

      const verify = await client.verifyIdToken({
        idToken: tokenId,
        audience: process.env.MAILING_SERVICE_CLIENT_ID,
      });

      const { email_verified, email, name, picture } = verify.payload;

      const password = email + process.env.GOOGLE_PASS;

      const passwordHash = await bcrypt.hash(password, 12);

      if (!email_verified)
        return res.status(400).json({ msg: "Email verification failed." });

      const user = await Users.findOne({ email });

      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
          return res.status(400).json({ msg: "Password is incorrect." });

        const refresh_token = createRefreshToken({ id: user._id });
        res.cookie("refreshtoken", refresh_token, {
          httpOnly: true,
          path: "/user/refresh",
          expires: new Date(Date.now() + 25892000000),
        });

        res.json({ msg: "Login success!" });
      } else {
        const newUser = new Users({
          name,
          email,
          password: passwordHash,
          avatar: picture,
        });

        await newUser.save();

        const refresh_token = createRefreshToken({ id: newUser._id });
        res.cookie("refreshtoken", refresh_token, {
          httpOnly: true,
          path: "/user/refresh",
          expires: new Date(Date.now() + 25892000000),
        });

        res.json({ msg: "Login success!" });
      }
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  facebookLogin: async (req, res) => {
    try {
      const { accessToken, userID } = req.body;
      const url = `https://graph.facebook.com/v4.0/${userID}/?fields=id,name,email,picture&access_token=${accessToken}`;

      const data = await fetch(url)
        .then((res) => res.json())
        .then((res) => {
          return res;
        });
      console.log(data);

      // const verify = await client.verifyIdToken({
      //   idToken: accessToken,
      //   audience: process.env.MAILING_SERVICE_CLIENT_ID,
      // });

      const { email, name, picture } = data;

      const password = email + process.env.FB_PASS;

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await Users.findOne({ email });

      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
          return res.status(400).json({ msg: "Password is incorrect." });

        const refresh_token = createRefreshToken({ id: user._id });
        res.cookie("refreshtoken", refresh_token, {
          httpOnly: true,
          path: "/user/refresh",
          expires: new Date(Date.now() + 25892000000),
        });

        res.json({ msg: "Login success!" });
      } else {
        const newUser = new Users({
          name,
          email,
          password: passwordHash,
          avatar: picture.data.url,
        });

        await newUser.save();

        const refresh_token = createRefreshToken({ id: newUser._id });
        res.cookie("refreshtoken", refresh_token, {
          httpOnly: true,
          path: "/user/refresh",
          expires: new Date(Date.now() + 25892000000),
        });

        res.json({ msg: "Login success!" });
      }
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

const validateEmail = (email) => {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};

const createActivationToken = (payload) => {
  return jwt.sign(payload, process.env.ACTIVATIONTOKEN, { expiresIn: "5m" });
};
const createAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESSTOKEN, { expiresIn: "15m" });
};
const createRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESHTOKEN, { expiresIn: "7d" });
};

module.exports = userController;
