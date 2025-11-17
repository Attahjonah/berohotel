import { Router } from "express";
import { downloadReceiptPDF } from "../controllers/receipt.controller.js"

const router = Router(); 

router.get('/download/:bookingId', downloadReceiptPDF);

export default router