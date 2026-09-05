import api from "./client";

export async function getBills() {
  const { data } = await api.get("/bills");
  return data;
}

export async function createBill(payload) {
  const { data } = await api.post("/bills", payload);
  return data;
}

export async function setParticipantPaid(billId, participantId, paid) {
  const { data } = await api.patch(`/bills/${billId}/participants/${participantId}`, { paid });
  return data;
}

export async function deleteBill(id) {
  await api.delete(`/bills/${id}`);
}
