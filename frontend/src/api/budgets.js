import api from "./client";

export async function getBudgets(month, year) {
  const { data } = await api.get("/budgets", { params: { month, year } });
  return data;
}

export async function createBudget({ category_id, amount, month, year }) {
  const { data } = await api.post("/budgets", { category_id, amount, month, year });
  return data;
}

export async function updateBudget(id, amount) {
  const { data } = await api.put(`/budgets/${id}`, { amount });
  return data;
}

export async function deleteBudget(id) {
  await api.delete(`/budgets/${id}`);
}
