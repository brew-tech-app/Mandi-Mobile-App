declare module 'react-native-sqlite-storage' {
  export interface ResultSet {
    insertId: number;
    rowsAffected: number;
    rows: {
      length: number;
      item(index: number): any;
      raw(): any[];
    };
  }

  export interface Transaction {
    executeSql(
      sqlStatement: string,
      arguments?: any[],
      callback?: (transaction: Transaction, resultSet: ResultSet) => void,
      errorCallback?: (transaction: Transaction, error: any) => void,
    ): void;
  }

  export interface SQLiteDatabase {
    transaction(
      callback: (transaction: Transaction) => void,
      errorCallback?: (error: any) => void,
      successCallback?: () => void,
    ): void;
    readTransaction(
      callback: (transaction: Transaction) => void,
      errorCallback?: (error: any) => void,
      successCallback?: () => void,
    ): void;
    executeSql(
      statement: string,
      params?: any[],
    ): Promise<[ResultSet]>;
    close(): Promise<void>;
  }

  export interface DatabaseParams {
    name: string;
    location?: string;
    createFromLocation?: string;
  }

  const SQLite: {
    DEBUG(debug: boolean): void;
    enablePromise(enable: boolean): void;
    openDatabase(
      params: DatabaseParams,
    ): Promise<SQLiteDatabase>;
  };

  export default SQLite;
}
