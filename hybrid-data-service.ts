"use client"

import { createClient } from '@supabase/supabase-js';
import { connectionMonitor, ConnectionStatus } from './connection-monitor';
import { syncManager } from './sync-manager';

// Demo data fallback
const DEMO_DATA = {
  users: [
    { id: '1', email: 'manager@barvip.com', role: 'manager', name: 'Demo Manager' },
    { id: '2', email: 'bartender@barvip.com', role: 'bartender', name: 'Demo Bartender' }
  ],
  sales: [
    { id: '1', user_id: '1', amount: 1250.50, created_at: new Date().toISOString(), product: 'Premium Cocktail' },
    { id: '2', user_id: '2', amount: 850.75, created_at: new Date(Date.now() - 86400000).toISOString(), product: 'Wine Selection' }
  ],
  inventory: [
    { id: '1', name: 'Premium Vodka', quantity: 45, min_stock: 10, cost: 35.50 },
    { id: '2', name: 'Craft Beer', quantity: 120, min_stock: 25, cost: 8.75 }
  ]
};

export class HybridDataService {
  private supabase: any = null;
  private isOnline = false;

  constructor() {
    this.initializeSupabase();
    this.setupConnectionMonitoring();
  }

  private initializeSupabase() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log('Supabase initialized successfully');
      } else {
        console.warn('Supabase credentials not found, running in demo-only mode');
      }
    } catch (error) {
      console.warn('Failed to initialize Supabase:', error);
    }
  }

  private setupConnectionMonitoring() {
    connectionMonitor.onStatusChange((status: ConnectionStatus) => {
      this.isOnline = status === 'online';
      
      if (this.isOnline && this.supabase) {
        // Auto-sync pending operations when connection is restored
        syncManager.syncPendingOperations();
      }
    });
  }

  async getData(table: string, filters?: any): Promise<any[]> {
    // Try Supabase first if online
    if (this.isOnline && this.supabase) {
      try {
        let query = this.supabase.from(table).select('*');
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        // Cache data locally for offline use
        this.cacheData(table, data);
        return data || [];
      } catch (error) {
        console.warn(`Failed to fetch from Supabase, falling back to demo data:`, error);
      }
    }

    // Fallback to demo data or cached data
    return this.getDemoData(table, filters);
  }

  async insertData(table: string, data: any): Promise<any> {
    const dataWithId = { ...data, id: crypto.randomUUID() };

    // Try Supabase first if online
    if (this.isOnline && this.supabase) {
      try {
        const { data: result, error } = await this.supabase
          .from(table)
          .insert(dataWithId)
          .select()
          .single();

        if (error) throw error;

        // Update local cache
        this.updateLocalCache(table, result, 'INSERT');
        return result;
      } catch (error) {
        console.warn(`Failed to insert to Supabase, queuing for sync:`, error);
      }
    }

    // Queue for later sync and update local cache
    syncManager.addOperation('INSERT', table, dataWithId);
    this.updateLocalCache(table, dataWithId, 'INSERT');
    return dataWithId;
  }

  async updateData(table: string, id: string, data: any): Promise<any> {
    const updatedData = { ...data, id };

    // Try Supabase first if online
    if (this.isOnline && this.supabase) {
      try {
        const { data: result, error } = await this.supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Update local cache
        this.updateLocalCache(table, result, 'UPDATE');
        return result;
      } catch (error) {
        console.warn(`Failed to update in Supabase, queuing for sync:`, error);
      }
    }

    // Queue for later sync and update local cache
    syncManager.addOperation('UPDATE', table, updatedData);
    this.updateLocalCache(table, updatedData, 'UPDATE');
    return updatedData;
  }

  async deleteData(table: string, id: string): Promise<boolean> {
    // Try Supabase first if online
    if (this.isOnline && this.supabase) {
      try {
        const { error } = await this.supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Update local cache
        this.updateLocalCache(table, { id }, 'DELETE');
        return true;
      } catch (error) {
        console.warn(`Failed to delete from Supabase, queuing for sync:`, error);
      }
    }

    // Queue for later sync and update local cache
    syncManager.addOperation('DELETE', table, { id });
    this.updateLocalCache(table, { id }, 'DELETE');
    return true;
  }

  private getDemoData(table: string, filters?: any): any[] {
    let data = DEMO_DATA[table as keyof typeof DEMO_DATA] || [];
    
    // Try to get cached data first
    const cached = this.getCachedData(table);
    if (cached.length > 0) {
      data = cached;
    }

    // Apply filters if provided
    if (filters && data.length > 0) {
      data = data.filter((item: any) => {
        return Object.entries(filters).every(([key, value]) => item[key] === value);
      });
    }

    return data;
  }

  private cacheData(table: string, data: any[]) {
    try {
      localStorage.setItem(`barvip_cache_${table}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  private getCachedData(table: string): any[] {
    try {
      const cached = localStorage.getItem(`barvip_cache_${table}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cached data if it's less than 1 hour old
        if (Date.now() - timestamp < 3600000) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to get cached data:', error);
    }
    return [];
  }

  private updateLocalCache(table: string, item: any, operation: 'INSERT' | 'UPDATE' | 'DELETE') {
    try {
      let cached = this.getCachedData(table);
      
      switch (operation) {
        case 'INSERT':
          cached.push(item);
          break;
        case 'UPDATE':
          cached = cached.map(c => c.id === item.id ? { ...c, ...item } : c);
          break;
        case 'DELETE':
          cached = cached.filter(c => c.id !== item.id);
          break;
      }
      
      this.cacheData(table, cached);
    } catch (error) {
      console.warn('Failed to update local cache:', error);
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return connectionMonitor.getStatus();
  }

  getPendingOperationsCount(): number {
    return syncManager.getPendingCount();
  }
}

export const hybridDataService = new HybridDataService();