import axios from "axios";
export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  timeout: 15000,
});
let csrfToken;
export const setCsrf = (token) => {
  csrfToken = token;
};
api.interceptors.request.use(async (config) => {
  if (!["get", "head", "options"].includes(config.method)) {
    if (!csrfToken) csrfToken = (await api.get("/auth/csrf")).data.data.token;
    config.headers["x-csrf-token"] = csrfToken;
  }
  return config;
});
export const get = async (path) => (await api.get(path)).data;
export const errorMessage = (error) =>
  error.response?.data?.error?.message ||
  "Cannot reach the server. Check the API and database connection.";
