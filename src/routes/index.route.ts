import { Router } from "express";
import userRouter from "./user.route";
import resendRouter from "./resend.route";

const router: Router = Router();
router.use("/v1/user", userRouter);
router.use("/v1/resend", resendRouter);

export default router;
