interface CSPDirectives {
  [key: string]: string[]
}

export class CSPGenerator {
  private directives: CSPDirectives = {}
  private nonce: string | null = null

  constructor() {
    this.setDefaults()
  }

  private setDefaults(): void {
    this.directives = {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https:"],
      "font-src": ["'self'", "data:"],
      "connect-src": ["'self'"],
      "media-src": ["'self'"],
      "object-src": ["'none'"],
      "child-src": ["'self'"],
      "frame-src": ["'none'"],
      "worker-src": ["'self'"],
      "frame-ancestors": ["'none'"],
      "form-action": ["'self'"],
      "base-uri": ["'self'"],
      "manifest-src": ["'self'"],
    }
  }

  setNonce(nonce: string): this {
    this.nonce = nonce
    return this
  }

  addDirective(directive: string, sources: string[]): this {
    if (!this.directives[directive]) {
      this.directives[directive] = []
    }
    this.directives[directive].push(...sources)
    return this
  }

  removeDirective(directive: string): this {
    delete this.directives[directive]
    return this
  }

  allowInlineScripts(): this {
    if (this.nonce) {
      this.addDirective("script-src", [`'nonce-${this.nonce}'`])
    } else {
      this.addDirective("script-src", ["'unsafe-inline'"])
    }
    return this
  }

  allowEval(): this {
    this.addDirective("script-src", ["'unsafe-eval'"])
    return this
  }

  allowSupabase(): this {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const domain = new URL(supabaseUrl).origin
      const wsDomain = supabaseUrl.replace("https://", "wss://")
      this.addDirective("connect-src", [domain, wsDomain])
    }
    return this
  }

  allowVercelAnalytics(): this {
    this.addDirective("script-src", ["https://va.vercel-scripts.com"])
    this.addDirective("connect-src", ["https://vitals.vercel-insights.com"])
    return this
  }

  allowGoogleFonts(): this {
    this.addDirective("font-src", ["https://fonts.gstatic.com"])
    this.addDirective("style-src", ["https://fonts.googleapis.com"])
    return this
  }

  allowCDNs(): this {
    this.addDirective("script-src", ["https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"])
    this.addDirective("style-src", ["https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"])
    return this
  }

  allowImageDomains(domains: string[]): this {
    this.addDirective("img-src", domains)
    return this
  }

  strictMode(): this {
    this.directives = {
      "default-src": ["'none'"],
      "script-src": ["'self'"],
      "style-src": ["'self'"],
      "img-src": ["'self'", "data:"],
      "font-src": ["'self'"],
      "connect-src": ["'self'"],
      "media-src": ["'none'"],
      "object-src": ["'none'"],
      "child-src": ["'none'"],
      "frame-src": ["'none'"],
      "worker-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "form-action": ["'self'"],
      "base-uri": ["'self'"],
      "upgrade-insecure-requests": [],
    }
    return this
  }

  developmentMode(): this {
    this.addDirective("script-src", ["'unsafe-eval'", "'unsafe-inline'"])
    this.addDirective("style-src", ["'unsafe-inline'"])
    this.addDirective("form-action", ["'unsafe-inline'"])
    this.addDirective("connect-src", ["ws:", "wss:", "http:", "https:"])
    return this
  }

  toString(): string {
    const cspString = Object.entries(this.directives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive
        }
        return `${directive} ${sources.join(" ")}`
      })
      .join("; ")

    return cspString
  }

  toMetaTag(): string {
    return `<meta http-equiv="Content-Security-Policy" content="${this.toString()}">`
  }
}

export function generateCSP(): string {
  const csp = new CSPGenerator()

  // Configure based on environment
  if (process.env.NODE_ENV === "development") {
    csp.developmentMode()
  } else {
    csp.strictMode()
  }

  // Add necessary integrations
  csp.allowSupabase().allowVercelAnalytics().allowGoogleFonts()

  // Allow specific image domains
  const imageDomains = [
    "https://hzhgbdhihpqffmoefmmv.supabase.co", // Supabase storage
    "https://images.unsplash.com", // Placeholder images
    "https://via.placeholder.com", // Placeholder service
  ]
  csp.allowImageDomains(imageDomains)

  return csp.toString()
}
