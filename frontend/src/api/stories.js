import api from './client';

export async function listStories(projectID) {
  const res = await api.get(`/projects/${projectID}/stories`);
  return res.data.data;
}

export async function getStory(projectID, storyID) {
  const res = await api.get(`/projects/${projectID}/stories/${storyID}`);
  return res.data.data;
}

export async function createStory(projectID, payload) {
  const res = await api.post(`/projects/${projectID}/stories`, payload);
  return res.data.data;
}

export async function updateStory(projectID, storyID, payload) {
  const res = await api.put(`/projects/${projectID}/stories/${storyID}`, payload);
  return res.data.data;
}

export async function deleteStory(projectID, storyID) {
  const res = await api.delete(`/projects/${projectID}/stories/${storyID}`);
  return res.data.data;
}
