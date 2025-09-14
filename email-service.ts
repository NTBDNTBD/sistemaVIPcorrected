import nodemailer from "nodemailer"

export const isEmailDemo = () => {
  return !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD
}

const createGmailTransporter = () => {
  if (isEmailDemo()) {
    return null
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.")
  }

  return nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export const sendEmail = async (to: string, subject: string, htmlContent: string, textContent?: string) => {
  if (isEmailDemo()) {
    console.log(`[DEMO Email] To: ${to}, Subject: ${subject}`)
    return { success: true, demo: true }
  }

  try {
    const transporter = createGmailTransporter()

    if (!transporter) {
      throw new Error("Gmail transporter not configured")
    }

    const mailOptions = {
      from: `"${process.env.NEXT_PUBLIC_BAR_NAME || "Bar VIP"}" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      text: textContent || subject,
      html: htmlContent,
    }

    const result = await transporter.sendMail(mailOptions)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}
