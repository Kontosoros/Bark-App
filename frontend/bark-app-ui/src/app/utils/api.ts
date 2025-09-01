import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';
import { environment } from '../../environments/environment';

const api = axios.create({
  baseURL: environment.apiBaseUrl,
});

api.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // If we get a 401 (Unauthorized) error, the token is expired
    if (error.response?.status === 401) {
      // Clear tokens before redirecting
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
