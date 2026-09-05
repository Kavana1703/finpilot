import api from "./client";

export async function getReportSummary(month, year) {
  const { data } = await api.get("/reports/summary", { params: { month, year } });
  return data;
}

async function downloadFile(path, params, fallbackFilename) {
  const response = await api.get(path, { params, responseType: "blob" });

  // Prefer the filename the backend suggests via Content-Disposition.
  const disposition = response.headers["content-disposition"];
  const match = disposition && disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : fallbackFilename;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function downloadReportPdf(month, year) {
  return downloadFile("/reports/pdf", { month, year }, `finpilot-report-${year}-${month}.pdf`);
}

export function downloadReportCsv(month, year) {
  return downloadFile("/reports/csv", { month, year }, `finpilot-transactions-${year}-${month}.csv`);
}
