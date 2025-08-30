import  nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.GMAIL_USER, // e.g. bennyrosehotel@yahoo.com
    pass: process.env.GMAIL_PASS, // App password or SMTP password
  },
});