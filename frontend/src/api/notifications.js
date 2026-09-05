import api from "./client";

export async function getNotifications() {
  const { data } = await api.get("/notifications");
  return data; // { items, unread_count }
}

export async function generateNotifications() {
  const { data } = await api.post("/notifications/generate");
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  await api.post("/notifications/read-all");
}

export async function deleteNotification(id) {
  await api.delete(`/notifications/${id}`);
}
