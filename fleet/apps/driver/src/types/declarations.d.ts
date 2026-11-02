declare module 'expo-sqlite' {
  export interface SQLiteDatabase {
    execSync(sql: string): void;
    runSync(sql: string, params?: any[]): { changes: number; lastInsertRowId: number };
    getFirstSync<T>(sql: string, params?: any[]): T | null;
    getAllSync<T>(sql: string, params?: any[]): T[];
  }
  export function openDatabaseSync(dbName: string): SQLiteDatabase;
}

