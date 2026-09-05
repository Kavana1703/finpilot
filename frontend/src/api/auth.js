import api from "./client";

export async function registerUser({ name, email, password }) {
  const { data } = await api.post("/auth/register", { name, email, password });
  return data;
}

export async function loginUser({ email, password }) {
  // FastAPI's OAuth2PasswordRequestForm expects form-encoded data,
  // with the email sent as "username".
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const { data } = await api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data; // { access_token, token_type }
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function logoutUser() {
  await api.post("/auth/logout");
}

export async function changePassword({ old_password, new_password }) {
  const { data } = await api.post("/auth/change-password", { old_password, new_password });
  return data;
}

export async function forgotPassword(email) {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword({ token, new_password }) {
  const { data } = await api.post("/auth/reset-password", { token, new_password });
  return data;
}
