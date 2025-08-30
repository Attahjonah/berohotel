// src/utils/receipt.ts
import { format } from 'date-fns';

const COMPANY = {
  name: 'Bennyrose Hotel',
  address: 'Bennyrose Avenue, Near AMAC Market FHA Phase 2, Lugbe, Abuja',
  phone: '+234703276847, +2348023151901',
  email: ['bennyrosehotel@yahoo.com', 'bennyrosenigltd@gmail.com'],
  logoUrl: 'https://res.cloudinary.com/dfcbhd3oo/image/upload/v1748471990/benyrose_logo_ro38vw.jpg',
};

interface ReceiptData {
  guestName: string;
  roomType: string;
  room: string;
  checkInDate: Date;
  checkOutDate: Date;
  amount: number;
  status: string;
  reference: string;
  paymentDate: Date;
}

export function generateReceiptHTML(data: ReceiptData): string {
  return `
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #f9f9f9; padding: 20px; }
          .container { max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; }
          .header { text-align: center; }
          .logo { max-height: 80px; margin-bottom: 10px; }
          .section { margin-top: 30px; }
          .section-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .details-table { width: 100%; margin-top: 10px; }
          .details-table td { padding: 6px 0; }
          .details-table td:first-child { font-weight: bold; width: 40%; }
          .footer { margin-top: 30px; font-size: 13px; text-align: center; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${COMPANY.logoUrl}" alt="Hotel Logo" class="logo" />
            <h2>${COMPANY.name}</h2>
            <p>${COMPANY.address}<br />
            📞 ${COMPANY.phone}<br />
            📧 ${COMPANY.email}</p>
          </div>

          <div class="section">
            <div class="section-title">Guest & Booking Details</div>
            <table class="details-table">
              <tr><td>Guest Name:</td><td>${data.guestName}</td></tr>
              <tr><td>Room Type:</td><td>${data.roomType}</td></tr>
              <tr><td>Room Name:</td><td>${data.room}</td></tr>
              <tr><td>Check-in:</td><td>${format(data.checkInDate, 'PPP')}</td></tr>
              <tr><td>Check-out:</td><td>${format(data.checkOutDate, 'PPP')}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Payment Details</div>
            <table class="details-table">
              <tr><td>Amount Paid:</td><td>₦${data.amount.toFixed(2)}</td></tr>
              <tr><td>Status:</td><td>${data.status}</td></tr>
              <tr><td>Reference:</td><td>${data.reference}</td></tr>
              <tr><td>Payment Date:</td><td>${format(data.paymentDate, 'PPP')}</td></tr>
            </table>
          </div>

          <div class="footer">
                Thank you for choosing ${COMPANY.name}. We look forward to hosting you again!<br /><br />
                <a href="/api/receipts/download?reference=${data.reference}" target="_blank" style="display:inline-block;padding:10px 20px;background:#0078D4;color:#fff;text-decoration:none;border-radius:5px;">
                    Download PDF Receipt
                </a>
            </div>
        </div>
      </body>
    </html>
  `;
}