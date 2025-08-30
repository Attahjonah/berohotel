import { Router } from "express";
import { downloadReceiptPDF } from "../controllers/receipt.controller.js"
import router from "./auth.routes.js";

router.get('/download', downloadReceiptPDF);

export default router