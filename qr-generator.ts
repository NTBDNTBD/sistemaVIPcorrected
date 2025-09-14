import QRCode from "qrcode"

export const generateMemberQR = async (memberCode: string): Promise<string> => {
  try {
    // Simplified QR data to reduce size
    const qrString = await QRCode.toDataURL(memberCode, {
      errorCorrectionLevel: "L", // Reduced error correction to minimize size
      type: "image/png",
      quality: 0.8, // Reduced quality to minimize size
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 128, // Reduced width from 256 to 128
    })

    return qrString
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Failed to generate QR code")
  }
}

export const generateMemberCode = (): string => {
  const prefix = "VIP"
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export const generateProductQR = (productId: string): string => {
  // Generate a compact QR code string for products
  const prefix = "PROD"
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 4).toUpperCase()
  return `${prefix}_${timestamp}_${random}`
}

export const generateProductCode = (): string => {
  const prefix = "P"
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 4).toUpperCase()
  return `${prefix}${timestamp}${random}`
}
