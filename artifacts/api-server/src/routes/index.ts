import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expertsRouter from "./experts";
import authRouter from "./auth";
import conversationsRouter from "./conversations";
import adminRouter from "./admin";
import deleteAccountRouter from "./delete-account";
import phytoIndexRouter from "./phyto-index";
import preliminaryDiagnosisRouter from "./preliminary-diagnosis";
import diagnoseImageRouter from "./diagnose-image";
import zohoStockRouter from "./zoho-stock";
import internalSyncRouter from "./internal-sync";
import uploadImageRouter from "./upload-image";

const router: IRouter = Router();

router.use(healthRouter);
router.use(expertsRouter);
router.use(authRouter);
router.use(conversationsRouter);
router.use(adminRouter);
router.use(deleteAccountRouter);
router.use(phytoIndexRouter);
router.use(preliminaryDiagnosisRouter);
router.use(diagnoseImageRouter);
router.use(zohoStockRouter);
router.use(internalSyncRouter);
router.use(uploadImageRouter);

export default router;
