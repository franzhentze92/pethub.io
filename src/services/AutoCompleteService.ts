import { autoCompleteOverdueMealsForUser } from '../utils/feedingScheduleAutomation';
import { supabase } from '../lib/supabase';

class AutoCompleteService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start the auto-complete service
  start(intervalMinutes: number = 5) {
    if (this.isRunning) {
      console.log('Auto-complete service is already running');
      return;
    }

    console.log(`Starting auto-complete service (checking every ${intervalMinutes} minutes)`);
    this.isRunning = true;

    // Check immediately
    this.checkAndCompleteOverdueMeals();

    // Then check at regular intervals
    this.intervalId = setInterval(() => {
      this.checkAndCompleteOverdueMeals();
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
  }

  // Stop the auto-complete service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Auto-complete service stopped');
  }

  // Check for overdue meals and auto-complete them
  private async checkAndCompleteOverdueMeals() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const completedCount = await autoCompleteOverdueMealsForUser(user.id);

      if (completedCount > 0) {
        console.log(`Auto-completed ${completedCount} overdue meals`);
      }
    } catch (error) {
      console.error('Error in auto-complete service:', error);
    }
  }

  // Manual trigger for testing
  async triggerCheck() {
    await this.checkAndCompleteOverdueMeals();
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId !== null
    };
  }
}

// Singleton available for manual triggers; global automation runs via useFeedingAutomation.
export const autoCompleteService = new AutoCompleteService();

export default AutoCompleteService;
