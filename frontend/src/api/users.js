import api from './client';

export async function searchUsers(q) {
  const res = await api.get('/users/search', { params: { q } });
  return res.data.data;
}
