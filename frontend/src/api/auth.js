import api from './client';

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data.data;
}

export async function register(username, email, password) {
  const res = await api.post('/auth/register', { username, email, password });
  return res.data.data;
}

export async function getMe() {
  const res = await api.get('/users/me');
  return res.data.data;
}
