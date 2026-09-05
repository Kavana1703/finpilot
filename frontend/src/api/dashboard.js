import api from "./client";

export async function getDashboardSummary(month, year) {
  const { data } = await api.get("/dashboard/summary", {
    params: { month, year },
  });
  return data;
}
