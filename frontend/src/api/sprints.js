import api from './client';

export async function listSprints(projectID) {
  const res = await api.get(`/projects/${projectID}/sprints`);
  return res.data.data;
}

export async function createSprint(projectID, payload) {
  const res = await api.post(`/projects/${projectID}/sprints`, payload);
  return res.data.data;
}

export async function updateSprint(projectID, sprintID, payload) {
  const res = await api.put(`/projects/${projectID}/sprints/${sprintID}`, payload);
  return res.data.data;
}

export async function deleteSprint(projectID, sprintID) {
  const res = await api.delete(`/projects/${projectID}/sprints/${sprintID}`);
  return res.data.data;
}
