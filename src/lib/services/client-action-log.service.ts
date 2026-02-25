/**
 * Client-side service for logging actions
 * This service calls the API endpoint instead of directly using the server-side service
 */
export const ClientActionLogService = {
  /**
   * Log an action
   * @param params Action log parameters
   * @returns Promise that resolves when the action is logged
   */
  logAction: async (params: {
    entityId: string;
    entityType: string;
    action: string;
    details?: Record<string, any>;
  }): Promise<void> => {
    try {
      const response = await fetch('/api/action-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to log action:', errorData.error);
      }
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }
}; 