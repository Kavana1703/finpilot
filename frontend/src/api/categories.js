import api from "./client";

export async function getCategories(type) {
  const { data } = await api.get("/categories", { params: type ? { type } : {} });
  return data;
}

export async function createCategory({ name, type }) {
  const { data } = await api.post("/categories", { name, type });
  return data;
}

export async function deleteCategory(id) {
  await api.delete(`/categories/${id}`);
}
