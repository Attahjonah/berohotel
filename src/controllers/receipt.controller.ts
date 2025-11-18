import prisma from "../prisma/client.js";
import puppeteer from "puppeteer"; // Import puppeteer if you don't use the cached getBrowser function
import { generateReceiptHTML } from "../utils/receipt.js";

// ⚠️ NOTE: This function placeholder assumes you have a global or memoized
// Puppeteer browser instance initialized and managed elsewhere in your app.
// If you are NOT managing a global instance, replace 'getBrowser' with 
// 'await puppeteer.launch({ headless: true })' and ensure you close the browser.
// For this example, we'll include a minimal, self-contained launch/close logic 
// as a safe fallback, but the recommended approach is the cached one.

// --- Start Self-Contained Puppeteer Fallback (Less Efficient but works standalone) ---
// If you use the cached approach, remove this block and ensure 'getBrowser' is imported.
let cachedBrowser = null;
const getBrowser = async () => {
  if (cachedBrowser) return cachedBrowser;
  cachedBrowser = await puppeteer.launch({ headless: true });
  return cachedBrowser;
};
// --- End Self-Contained Puppeteer Fallback ---


/**
 * Downloads a PDF receipt for a given booking ID.
 * It strictly looks for the latest successful payment associated with the booking.
 */
export const downloadReceiptPDF = async (req, res) => {
    const bookingId = req.params.bookingId;

    if (!bookingId) {
        return res.status(400).json({ error: "Booking ID is required." });
    }

    let page = null; // Initialize page variable for error cleanup

    try {
        // 1. Fetch Booking and Associated Successful Payment
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                room: { include: { roomType: true } },
                // ✅ FIX: Use the plural relation name 'payments' as defined in your schema
                payments: { 
                    where: { status: 'SUCCESS' }, 
                    orderBy: { paymentDate: 'desc' }, 
                    take: 1
                },
            },
        });

        if (!booking) {
            return res.status(404).json({ error: "Booking not found." });
        }

        // ✅ FIX: Access the data using the plural relation name 'payments'
        const successfulPayment = booking.payments?.[0]; 

        if (!successfulPayment) {
            return res.status(404).json({ error: "No successful payment found for this booking to generate a receipt." });
        }
        
        // 2. Nights Calculation (Improved robustness by clearing time parts)
        const checkInDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);
        
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(0, 0, 0, 0);

        const nights = Math.ceil(
            (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // 3. Prepare Receipt Data
        const receiptData = {
            guestName: booking.guestName,
            roomType: booking.room.roomType.name,
            roomName: booking.room.roomName,
            checkInDate: booking.checkIn,
            checkOutDate: booking.checkOut,
            nights: nights,
            // Use payment data for final amount and reference
            amount: successfulPayment.amount, 
            status: successfulPayment.status, 
            reference: successfulPayment.reference || `Manual-${successfulPayment.id}`,
            paymentDate: successfulPayment.paymentDate,
            guestEmail: booking.guestEmail,
            bookingId: booking.id,
        };

        const html = generateReceiptHTML(receiptData);

        // 4. PDF Generation using Cached Browser
        let browser;
        try {
            browser = await getBrowser(); // Use the cached/global browser
            page = await browser.newPage();
            
            await page.setContent(html, { waitUntil: "networkidle0" });
            const pdfBuffer = await page.pdf({ format: "A4" });
            
            await page.close(); // Clean up the page

            // 5. Send Response
            const filename = `receipt-${receiptData.reference || bookingId}.pdf`;
            res.set({
                "Content-Type": "application/pdf",
                // 'attachment' forces a download prompt, 'inline' displays in browser
                "Content-Disposition": `attachment; filename="${filename}"`, 
            });

            res.send(pdfBuffer);

        } catch (puppeteerError) {
            // Handle Puppeteer-specific errors
            console.error("❌ Puppeteer/PDF generation error:", puppeteerError);
            if (page) await page.close();
            // Re-throw to be caught by outer catch
            throw new Error("PDF Generation Failed"); 
        }

    } catch (error) {
        console.error("❌ Receipt processing error:", error);
        // Provide a clearer error if it's a known server issue
        const statusCode = error.message.includes("PDF Generation Failed") ? 503 : 500;
        res.status(statusCode).json({ error: "Failed to generate receipt due to a server error." });
    }
};