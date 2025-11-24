import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Daily Reset Service
 * Manages daily operational summary resets and tracks last reset date
 */
export class DailyResetService {
  private static readonly LAST_RESET_DATE_KEY = 'lastResetDate';
  private static readonly DAILY_OPERATIONAL_DATA_KEY = 'dailyOperationalData';

  /**
   * Check if it's a new day and reset is needed
   */
  public static async checkAndResetIfNewDay(): Promise<boolean> {
    try {
      const lastResetDate = await AsyncStorage.getItem(this.LAST_RESET_DATE_KEY);
      const today = this.getTodayDateString();

      if (lastResetDate !== today) {
        await this.performDailyReset();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking daily reset:', error);
      return false;
    }
  }

  /**
   * Perform daily reset operations
   */
  private static async performDailyReset(): Promise<void> {
    const today = this.getTodayDateString();

    try {
      // Reset daily operational data
      await AsyncStorage.setItem(
        this.DAILY_OPERATIONAL_DATA_KEY,
        JSON.stringify({
          date: today,
          resetAt: new Date().toISOString(),
        }),
      );

      // Update last reset date
      await AsyncStorage.setItem(this.LAST_RESET_DATE_KEY, today);

      console.log(`Daily reset performed for ${today}`);
    } catch (error) {
      console.error('Error performing daily reset:', error);
      throw error;
    }
  }

  /**
   * Get today's date as string (YYYY-MM-DD)
   */
  private static getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Get last reset date
   */
  public static async getLastResetDate(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.LAST_RESET_DATE_KEY);
    } catch (error) {
      console.error('Error getting last reset date:', error);
      return null;
    }
  }

  /**
   * Get operational data for today
   */
  public static async getDailyOperationalData(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(this.DAILY_OPERATIONAL_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting daily operational data:', error);
      return null;
    }
  }

  /**
   * Check if date is today
   */
  public static isToday(dateString: string): boolean {
    const today = this.getTodayDateString();
    const inputDate = new Date(dateString).toISOString().split('T')[0];
    return inputDate === today;
  }

  /**
   * Get start of day timestamp
   */
  public static getStartOfDay(date: Date = new Date()): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get end of day timestamp
   */
  public static getEndOfDay(date: Date = new Date()): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Get start of month timestamp
   */
  public static getStartOfMonth(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get end of month timestamp
   */
  public static getEndOfMonth(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /**
   * Get start of quarter timestamp
   */
  public static getStartOfQuarter(date: Date = new Date()): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
  }

  /**
   * Get end of quarter timestamp
   */
  public static getEndOfQuarter(date: Date = new Date()): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
  }

  /**
   * Check if date is within range
   */
  public static isDateInRange(
    date: Date,
    startDate: Date,
    endDate: Date,
  ): boolean {
    const timestamp = date.getTime();
    return timestamp >= startDate.getTime() && timestamp <= endDate.getTime();
  }
}

export default DailyResetService;
