import jwt from "jsonwebtoken";
const generateToken = (user) => {
  try {
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });
    return token;
  } catch (error) {
    console.log("Error generating token", error);
  }
};


const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.log("Error verifying token", error);
    return null;
  } 
};
export { generateToken, verifyToken };