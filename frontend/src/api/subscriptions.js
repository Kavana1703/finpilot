import api from "./client";

export async function getSubscriptions() {
  const { data } = await api.get("/subscriptions");
  return data; // { subscriptions, monthly_total, yearly_total, active_count, cancelled_count }
}

export async function createSubscription(payload) {
  const { data } = await api.post("/subscriptions", payload);
  return data;
}

export async function updateSubscription(id, payload) {
  const { data } = await api.put(`/subscriptions/${id}`, payload);
  return data;
}

export async function cancelSubscription(id) {
  const { data } = await api.post(`/subscriptions/${id}/cancel`);
  return data;
}

export async function deleteSubscription(id) {
  await api.delete(`/subscriptions/${id}`);
}
