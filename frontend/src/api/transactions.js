import api from "./client";

/**
 * `basePath` is "/income", "/expenses", or "/transactions" (unified view).
 * All three share the same request/response shape on the backend.
 */
export async function listTransactions(basePath, params = {}) {
  const { data } = await api.get(basePath, { params });
  return data; // { items, total, page, page_size }
}

export async function createTransaction(basePath, payload) {
  const { data } = await api.post(basePath, payload);
  return data;
}

export async function updateTransaction(basePath, id, payload) {
  const { data } = await api.put(`${basePath}/${id}`, payload);
  return data;
}

export async function deleteTransaction(basePath, id) {
  await api.delete(`${basePath}/${id}`);
}
