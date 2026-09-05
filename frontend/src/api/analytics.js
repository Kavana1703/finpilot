import api from "./client";

export async function getAnalyticsOverview(month, year) {
  const { data } = await api.get("/analytics/overview", {
    params: { month, year },
  });
  return data;
}
