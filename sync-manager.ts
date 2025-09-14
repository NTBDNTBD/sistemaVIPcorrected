"use client"

interface PendingOperation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export class SyncManager {
  private pendingOperations: PendingOperation[] = [];
  private isSyncing = false;
  private storageKey = 'barvip_pending_operations';

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadPendingOperations();
    }
  }

  private loadPendingOperations() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load pending operations:', error);
      this.pendingOperations = [];
    }
  }

  private savePendingOperations() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.warn('Failed to save pending operations:', error);
    }
  }

  public addOperation(type: 'INSERT' | 'UPDATE' | 'DELETE', table: string, data: any) {
    const operation: PendingOperation = {
      id: crypto.randomUUID(),
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.pendingOperations.push(operation);
    this.savePendingOperations();

    console.log(`Added pending operation: ${type} on ${table}`, operation);
  }

  public async syncPendingOperations(): Promise<boolean> {
    if (this.isSyncing || this.pendingOperations.length === 0) {
      return true;
    }

    this.isSyncing = true;
    console.log(`Starting sync of ${this.pendingOperations.length} pending operations...`);

    try {
      const syncPromises = this.pendingOperations.map(async (operation) => {
        try {
          await this.executeOperation(operation);
          return { success: true, operation };
        } catch (error) {
          operation.retryCount++;
          console.warn(`Failed to sync operation ${operation.id}, retry count: ${operation.retryCount}`, error);
          
          // Remove operations that have failed too many times
          if (operation.retryCount >= 3) {
            console.error(`Operation ${operation.id} failed permanently, removing from queue`);
            return { success: true, operation }; // Remove from queue
          }
          
          return { success: false, operation };
        }
      });

      const results = await Promise.allSettled(syncPromises);
      
      // Remove successfully synced operations
      this.pendingOperations = this.pendingOperations.filter((operation, index) => {
        const result = results[index];
        if (result.status === 'fulfilled' && result.value.success) {
          return false; // Remove from pending
        }
        return true; // Keep in pending
      });

      this.savePendingOperations();
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      console.log(`Sync completed: ${successCount}/${results.length} operations synced successfully`);
      
      return this.pendingOperations.length === 0;
    } catch (error) {
      console.error('Sync process failed:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeOperation(operation: PendingOperation): Promise<void> {
    const response = await fetch('/api/sync-operation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(operation),
    });

    if (!response.ok) {
      throw new Error(`Sync operation failed: ${response.statusText}`);
    }
  }

  public getPendingCount(): number {
    return this.pendingOperations.length;
  }

  public clearAllPending() {
    this.pendingOperations = [];
    this.savePendingOperations();
  }
}

export const syncManager = new SyncManager();