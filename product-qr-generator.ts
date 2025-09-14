import QRCode from "qrcode"

export interface ProductQRData {
  type: "product"
  productId: string
  productCode: string
  name: string
  price: number
  timestamp: number
}

export const generateProductQR = async (product: {
  id: string
  product_qr_code: string
  name: string
  price: number
}): Promise<string> => {
  try {
    const qrData: ProductQRData = {
      type: "product",
      productId: product.id,
      productCode: product.product_qr_code,
      name: product.name,
      price: product.price,
      timestamp: Date.now(),
    }

    const qrString = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 200,
    })

    return qrString
  } catch (error) {
    console.error("Error generating product QR code:", error)
    throw new Error("Failed to generate product QR code")
  }
}

export const generateProductCode = (): string => {
  const prefix = "PRD"
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export const parseProductQR = (qrData: string): ProductQRData | null => {
  try {
    const parsed = JSON.parse(qrData)
    if (parsed.type === "product" && parsed.productId && parsed.productCode) {
      return parsed as ProductQRData
    }
    return null
  } catch (error) {
    console.error("Error parsing product QR:", error)
    return null
  }
}
