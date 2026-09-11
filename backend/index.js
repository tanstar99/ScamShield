import express from "express";
import dotenv from "dotenv";
import ConnectDB from "./config/Db.js";
import AuthRouter from "./routes/auth.routes.js";
import cors from "cors";
import UserRouter from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import ScanRouter from "./routes/scan.routes.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173","http://localhost:8901", /^chrome-extension:\/\//],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use("/api/auth", AuthRouter);
app.use("/api/user", UserRouter);
app.use("/api/scan", ScanRouter);
app.get("/", (req, res) => {
  res.send("API is running...");
});

const startServer = async () => {
  try {
    await ConnectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start", error);
  }
};

startServer();