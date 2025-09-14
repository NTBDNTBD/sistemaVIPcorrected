let clsx: any
let twMerge: any

try {
  // Try to import clsx and tailwind-merge
  const clsxModule = require("clsx")
  const twMergeModule = require("tailwind-merge")
  clsx = clsxModule.clsx || clsxModule.default || clsxModule
  twMerge = twMergeModule.twMerge || twMergeModule.default || twMergeModule
} catch (error) {
  // Fallback implementation when packages fail to load
  console.warn("Failed to load clsx/tailwind-merge, using fallback implementation")

  // Simple clsx fallback
  clsx = (...inputs: any[]) => {
    return inputs
      .flat()
      .filter(Boolean)
      .map((input) => {
        if (typeof input === "string") return input
        if (typeof input === "object" && input !== null) {
          return Object.entries(input)
            .filter(([, value]) => Boolean(value))
            .map(([key]) => key)
            .join(" ")
        }
        return ""
      })
      .join(" ")
      .trim()
  }

  // Simple twMerge fallback (just returns the classes as-is)
  twMerge = (classes: string) => classes
}

export type ClassValue = string | number | boolean | undefined | null | { [key: string]: any } | ClassValue[]

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
