import React from "react"

// Simple SVG icon components as fallbacks
const createIcon = (path: string, viewBox = "0 0 24 24") => {
  return React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => (
    <svg
      ref={ref}
      width="24"
      height="24"
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={path} />
    </svg>
  ))
}

// Fallback icons with simple SVG paths
export const fallbackIcons = {
  Shield: createIcon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
  Loader2: createIcon("M21 12a9 9 0 11-6.219-8.56"),
  LogIn: createIcon("M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M21 12H9"),
  Bell: createIcon("M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"),
  Users: createIcon(
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-4.5M16 3.13a4 4 0 010 7.75M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  ),
  DollarSign: createIcon("M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"),
  Calendar: createIcon(
    "M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM21 7a2 2 0 00-2-2H5a2 2 0 00-2 2v2h18V7zM7 3v4M17 3v4",
  ),
  TrendingUp: createIcon("M22 7l-8.5 8.5-5-5L2 17"),
  Download: createIcon("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"),
  Search: createIcon("M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"),
  Plus: createIcon("M12 5v14M5 12h14"),
  Edit: createIcon("M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"),
  Trash2: createIcon("M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"),
  Package: createIcon(
    "M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16V8z",
  ),
  QrCode: createIcon("M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"),
  Camera: createIcon("M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"),
  CameraOff: createIcon(
    "M1 1l22 22M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34m-7.72-2.06a4 4 0 11-5.56-5.56",
  ),
  // Add more icons as needed...
}

// Try to import lucide-react, fall back to our icons if it fails
let lucideIcons: any = {}

try {
  // Dynamic import to avoid build-time errors
  if (typeof window !== "undefined") {
    import("lucide-react")
      .then((lucide) => {
        lucideIcons = lucide
      })
      .catch(() => {
        console.log("Using fallback icons - lucide-react not available")
      })
  }
} catch (error) {
  console.log("Using fallback icons - lucide-react not available")
}

// Export function to get icon (lucide-react or fallback)
export const getIcon = (name: string) => {
  return lucideIcons[name] || fallbackIcons[name as keyof typeof fallbackIcons] || fallbackIcons.Package
}

// Export commonly used icons
export const Shield = getIcon("Shield")
export const Loader2 = getIcon("Loader2")
export const LogIn = getIcon("LogIn")
export const Bell = getIcon("Bell")
export const Users = getIcon("Users")
export const DollarSign = getIcon("DollarSign")
export const Calendar = getIcon("Calendar")
export const TrendingUp = getIcon("TrendingUp")
export const Download = getIcon("Download")
export const Search = getIcon("Search")
export const Plus = getIcon("Plus")
export const Edit = getIcon("Edit")
export const Trash2 = getIcon("Trash2")
export const Package = getIcon("Package")
export const QrCode = getIcon("QrCode")
export const Camera = getIcon("Camera")
export const CameraOff = getIcon("CameraOff")
