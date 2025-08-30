import { RequestHandler } from 'express';
import { generateReceiptHTML } from '../utils/receipt.js';
import prisma from '../prisma/client.js';
import puppeteer from 'puppeteer';

export const downloadReceiptPDF: RequestHandler = async (req, res) => {
  try {
    const reference = req.query.reference as string;
    const bookingId = req.query.bookingId as string;

    let payment;

    if (reference) {
      payment = await prisma.payment.findUnique({
        where: { reference },
        include: {
          booking: {
            include: {
              room: { include: { roomType: true } },
            },
          },
        },
      });
    } else if (bookingId) {
      payment = await prisma.payment.findFirst({
        where: { bookingId, status: 'SUCCESS' },
        include: {
          booking: {
            include: {
              room: { include: { roomType: true } },
            },
          },
        },
      });
    } else {
      return res.status(400).json({ error: 'Missing reference or bookingId' });
    }

    if (!payment || !payment.booking) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const html = generateReceiptHTML({
      guestName: payment.booking.guestName,
      roomType: payment.booking.room.roomType.name,
      room: payment.booking.room.roomName,
      checkInDate: payment.booking.checkIn,
      checkOutDate: payment.booking.checkOut,
      amount: payment.amount,
      status: payment.status,
      reference: payment.reference ?? `Manual-${payment.id}`,
      paymentDate: payment.paymentDate!,
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=receipt-${payment.reference ?? payment.id}.pdf`
    );
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};