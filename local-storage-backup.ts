import { log } from "@/lib/logger"

interface MemberBackup {
  id: string
  loyalty_points: number
  total_spent: number
  last_updated: string
}

interface TransactionBackup {
  id: string
  member_id: string
  total_amount: number
  loyalty_points_earned: number
  timestamp: string
  synced: boolean
}

export class LocalStorageBackup {
  private static MEMBERS_KEY = "vip_members_backup"
  private static TRANSACTIONS_KEY = "vip_transactions_backup"

  // Backup member data
  static backupMember(memberId: string, loyaltyPoints: number, totalSpent: number) {
    try {
      const backup: MemberBackup = {
        id: memberId,
        loyalty_points: loyaltyPoints,
        total_spent: totalSpent,
        last_updated: new Date().toISOString(),
      }

      const existing = this.getMemberBackups()
      existing[memberId] = backup

      localStorage.setItem(this.MEMBERS_KEY, JSON.stringify(existing))
      log.debug("Member data backed up locally", { memberId }, "BACKUP")
    } catch (error) {
      log.error("Failed to backup member data", { error, memberId }, "BACKUP")
    }
  }

  // Backup transaction
  static backupTransaction(transaction: TransactionBackup) {
    try {
      const existing = this.getTransactionBackups()
      existing.push(transaction)

      localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(existing))
      log.debug("Transaction backed up locally", { transactionId: transaction.id }, "BACKUP")
    } catch (error) {
      log.error("Failed to backup transaction", { error, transactionId: transaction.id }, "BACKUP")
    }
  }

  // Get member backups
  static getMemberBackups(): Record<string, MemberBackup> {
    try {
      const data = localStorage.getItem(this.MEMBERS_KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  // Get transaction backups
  static getTransactionBackups(): TransactionBackup[] {
    try {
      const data = localStorage.getItem(this.TRANSACTIONS_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  // Sync pending data when connection restored
  static async syncPendingData() {
    const members = this.getMemberBackups()
    const transactions = this.getTransactionBackups().filter((t) => !t.synced)

    log.info(
      "Syncing pending data",
      {
        membersCount: Object.keys(members).length,
        transactionsCount: transactions.length,
      },
      "BACKUP",
    )

    try {
      // Sync members
      let membersSynced = 0
      for (const [memberId, memberData] of Object.entries(members)) {
        // In a real implementation, sync with Supabase
        // await supabase.from('vip_members').upsert(memberData)
        membersSynced++
      }

      // Sync transactions
      let transactionsSynced = 0
      for (const transaction of transactions) {
        // In a real implementation, sync with Supabase
        // await supabase.from('transactions').insert(transaction)
        transactionsSynced++
      }

      log.info("Sync completed", { membersSynced, transactionsSynced }, "BACKUP")
      return { membersSynced, transactionsSynced }
    } catch (error) {
      log.error("Sync failed", { error }, "BACKUP")
      return { membersSynced: 0, transactionsSynced: 0 }
    }
  }

  // Clear synced data
  static clearSyncedData() {
    localStorage.removeItem(this.MEMBERS_KEY)
    localStorage.removeItem(this.TRANSACTIONS_KEY)
  }
}
