const express = require("express");

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please Enter Your Name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please Enter Your Email"],
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please Enter Your Password"],
    },
    role: {
      type: Number,
      default: 0, //O=user 1=admin 2=super admin 3=seller 4=driver/deliveryman
    },
    avatar: {
      type: String,
      default:
        "https://res-console.cloudinary.com/dvzn2mpvu/thumbnails/v1/image/upload/v1657185271/cG5nd2luZy5jb21fZ3drYXh3/preview",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Users", userSchema);
