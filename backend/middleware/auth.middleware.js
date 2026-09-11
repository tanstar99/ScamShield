import { verifyToken } from "../utils/token.js";

const isAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: "Unauthorized" });

    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
export default isAuth;