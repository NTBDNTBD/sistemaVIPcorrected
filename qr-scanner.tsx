"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, CameraOff, RotateCcw, Zap } from "lucide-react"
import jsQR from "jsqr"

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
  isActive: boolean
  onToggle: () => void
}

const QRScanner = ({ onScan, onError, isActive, onToggle }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>("")
  const [scanning, setScanning] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt")

  useEffect(() => {
    // Check camera permission on mount
    checkCameraPermission()
  }, [])

  useEffect(() => {
    if (isActive && cameraPermission !== "denied") {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isActive, cameraPermission])

  const checkCameraPermission = async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
        setCameraPermission(permission.state)

        // Listen for permission changes
        permission.onchange = () => {
          setCameraPermission(permission.state)
        }
      } else {
        setCameraPermission("prompt")
      }
    } catch (error) {
      setCameraPermission("prompt")
    }
  }

  const startCamera = async () => {
    try {
      setError("")

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Tu navegador no soporta acceso a la cámara. Usa Chrome, Firefox o Safari.")
      }

      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            ?.play()
            .then(() => {
              setScanning(true)
              startScanning()
            })
            .catch((playError) => {
              console.error("Video play error:", playError)
              setError("Error al reproducir video de la cámara")
            })
        }
      }

      setStream(mediaStream)
      setCameraPermission("granted")
    } catch (err: any) {
      let errorMessage = "No se pudo acceder a la cámara."

      switch (err.name) {
        case "NotAllowedError":
          errorMessage = "Permisos de cámara denegados. Haz clic en 'Permitir' cuando el navegador lo solicite."
          setCameraPermission("denied")
          break
        case "NotFoundError":
          errorMessage = "No se encontró ninguna cámara. Verifica que tu dispositivo tenga cámara."
          break
        case "NotSupportedError":
          errorMessage = "La cámara no es compatible. Usa HTTPS o un navegador compatible."
          break
        case "NotReadableError":
          errorMessage = "La cámara está siendo usada por otra aplicación."
          break
        case "OverconstrainedError":
          errorMessage = "No se pudo configurar la cámara con los parámetros solicitados."
          break
        default:
          if (err.message.includes("navegador")) {
            errorMessage = err.message
          } else {
            errorMessage = `Error de cámara: ${err.message || "Error desconocido"}`
          }
      }

      setError(errorMessage)
      onError?.(errorMessage)
      console.error("Camera error:", err)
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
      setStream(null)
    }
    setScanning(false)

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    const scanFrame = () => {
      if (!scanning || !video.videoWidth || !video.videoHeight) {
        if (scanning) {
          requestAnimationFrame(scanFrame)
        }
        return
      }

      const { videoWidth, videoHeight } = video
      canvas.width = videoWidth
      canvas.height = videoHeight

      try {
        context.drawImage(video, 0, 0, videoWidth, videoHeight)
        const imageData = context.getImageData(0, 0, videoWidth, videoHeight)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          console.log("QR Code detected:", code.data)
          onScan(code.data)
          setTimeout(() => {
            if (scanning) {
              requestAnimationFrame(scanFrame)
            }
          }, 1000)
          return
        }
      } catch (scanError) {
        console.error("Scan error:", scanError)
      }

      if (scanning) {
        requestAnimationFrame(scanFrame)
      }
    }

    scanFrame()
  }

  const simulateScan = () => {
    const demoProducts = [
      {
        type: "product",
        productId: "prod-1",
        productCode: "PRD123456",
        name: "Whisky Premium",
        price: 150.0,
        timestamp: Date.now(),
      },
      {
        type: "product",
        productId: "prod-2",
        productCode: "PRD789012",
        name: "Ron Añejo",
        price: 85.0,
        timestamp: Date.now(),
      },
      {
        type: "product",
        productId: "prod-3",
        productCode: "PRD345678",
        name: "Vodka Premium",
        price: 120.0,
        timestamp: Date.now(),
      },
    ]

    const randomProduct = demoProducts[Math.floor(Math.random() * demoProducts.length)]
    const demoQRData = JSON.stringify(randomProduct)
    onScan(demoQRData)
  }

  const requestCameraPermission = async () => {
    setCameraPermission("prompt")
    await startCamera()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Escáner QR</span>
          <Button onClick={onToggle} variant="outline" size="sm" disabled={!navigator.mediaDevices?.getUserMedia}>
            {isActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          </Button>
        </CardTitle>
        <CardDescription>
          {navigator.mediaDevices?.getUserMedia
            ? "Escanea códigos QR de productos para agregarlos al carrito"
            : "Tu navegador no soporta acceso a la cámara"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
              {cameraPermission === "denied" && (
                <div className="mt-2 space-x-2">
                  <Button onClick={requestCameraPermission} size="sm" variant="outline">
                    Reintentar
                  </Button>
                  <Button onClick={simulateScan} size="sm" variant="secondary">
                    Usar Demo
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isActive && !error && (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-48 bg-black rounded-lg object-cover"
              playsInline
              muted
              autoPlay
              onError={(e) => {
                console.error("Video error:", e)
                setError("Error al cargar el video de la cámara")
              }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 border-2 border-white border-dashed rounded-lg animate-pulse" />
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex gap-2">
              <Button onClick={simulateScan} className="flex-1" size="sm" variant="secondary">
                <Zap className="mr-2 h-4 w-4" />
                Demo Scan
              </Button>
            </div>
          </div>
        )}

        {!isActive && (
          <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
            <div className="text-center space-y-4">
              <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {cameraPermission === "denied"
                    ? "Permisos de cámara requeridos"
                    : "Presiona el botón para activar la cámara"}
                </p>
                {cameraPermission === "denied" && (
                  <Button onClick={requestCameraPermission} size="sm">
                    Permitir Cámara
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Demo button always available */}
        <Button onClick={simulateScan} className="w-full bg-transparent" variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Escanear Producto Demo
        </Button>
      </CardContent>
    </Card>
  )
}

// Export both named and default exports for compatibility
export { QRScanner }
export default QRScanner
