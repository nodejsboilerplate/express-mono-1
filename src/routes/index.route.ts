import { Router } from "express";
import userRouter from "./user.route"

const router: Router = Router();
router.use("/v1/user", userRouter);

export default router;
