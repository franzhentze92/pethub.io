export function dispatchNotificationsUpdated(): void {
  window.dispatchEvent(new CustomEvent('notifications-updated'));
}
