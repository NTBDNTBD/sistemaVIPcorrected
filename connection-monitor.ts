"use client"

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

export class ConnectionMonitor {
  private status: ConnectionStatus = 'online';
  private listeners: ((status: ConnectionStatus) => void)[] = [];
  private supabaseHealthCheck: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Monitor browser online/offline events
    window.addEventListener('online', () => {
      this.setStatus('reconnecting');
      this.checkSupabaseHealth();
    });

    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });

    // Initial check
    if (!navigator.onLine) {
      this.setStatus('offline');
    } else {
      this.checkSupabaseHealth();
    }

    // Periodic health checks every 30 seconds
    this.supabaseHealthCheck = setInterval(() => {
      if (navigator.onLine && this.status !== 'offline') {
        this.checkSupabaseHealth();
      }
    }, 30000);
  }

  private async checkSupabaseHealth() {
    try {
      const response = await fetch('/api/health-check', {
        method: 'GET',
        cache: 'no-cache',
      });

      if (response.ok) {
        this.setStatus('online');
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.warn('Supabase health check failed, switching to demo mode:', error);
      this.setStatus('offline');
    }
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status !== status) {
      this.status = status;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  public destroy() {
    if (this.supabaseHealthCheck) {
      clearInterval(this.supabaseHealthCheck);
    }
    this.listeners = [];
  }
}

export const connectionMonitor = new ConnectionMonitor();