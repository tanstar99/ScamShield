import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import { Schema, model } from "mongoose";
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    isGoogleAuth: { type: Boolean, default: false },
    phone:{
      type: String,
      
    }
    
  },
  { timestamps: true }
);

const User = model("User", userSchema);
export default User;