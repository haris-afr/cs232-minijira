import api from './client';

export async function listProjects() {
  const res = await api.get('/projects');
  return res.data.data;
}

export async function getProject(id) {
  const res = await api.get(`/projects/${id}`);
  return res.data.data;
}

export async function createProject(payload) {
  const res = await api.post('/projects', payload);
  return res.data.data;
}

export async function deleteProject(id) {
  const res = await api.delete(`/projects/${id}`);
  return res.data.data;
}

export async function addMember(projectID, userID) {
  const res = await api.post(`/projects/${projectID}/members`, { userID });
  return res.data.data;
}

export async function removeMember(projectID, userID) {
  const res = await api.delete(`/projects/${projectID}/members/${userID}`);
  return res.data.data;
}

export async function addManager(projectID, userID) {
  const res = await api.post(`/projects/${projectID}/managers`, { userID });
  return res.data.data;
}

export async function removeManager(projectID, userID) {
  const res = await api.delete(`/projects/${projectID}/managers/${userID}`);
  return res.data.data;
}

export async function linkRepository(projectID, payload) {
  const res = await api.post(`/projects/${projectID}/repository`, payload);
  return res.data.data;
}
