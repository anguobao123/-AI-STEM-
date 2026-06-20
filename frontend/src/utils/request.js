import axios from "axios";

const request = axios.create({
  baseURL: "/api",
  timeout: 10000
});

request.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload?.code === 200) {
      return payload.data;
    }
    throw new Error(payload?.msg || "Request failed");
  },
  (error) => {
    throw new Error(error?.message || "Network error");
  }
);

export default request;
