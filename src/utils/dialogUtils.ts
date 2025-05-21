/**
 * Utility functions for handling dialogs and confirmations
 */

/**
 * Show a confirmation dialog with the specified title and message
 * 
 * @param title Dialog title
 * @param message Dialog message
 * @returns Promise that resolves to true if confirmed, false if canceled
 */
export function confirmDialog(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    resolve(window.confirm(message));
  });
}

/**
 * Show an alert dialog with the specified title and message
 * 
 * @param title Dialog title
 * @param message Dialog message
 */
export function alertDialog(title: string, message: string): void {
  window.alert(message);
} 