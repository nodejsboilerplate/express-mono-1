import { Router } from "express";
import userRouter from "./user.route";
import resendRouter from "./resend.route";
import authRouter from "./auth.route";

const router: Router = Router();
router.use("/v1/user", userRouter);
router.use("/v1/auth", authRouter);
router.use("/v1/resend", resendRouter);

export default router;
