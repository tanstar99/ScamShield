import express from 'express';
import { getCurrentUser } from '../controller/user.controller.js';
import isAuth from '../middleware/auth.middleware.js';
const UserRouter = express.Router();
UserRouter.get('/current', isAuth, getCurrentUser);
export default UserRouter;