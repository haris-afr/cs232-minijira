import api from './client';

export async function listTasks(storyID) {
  const res = await api.get(`/stories/${storyID}/tasks`);
  return res.data.data;
}

export async function getTask(taskID) {
  const res = await api.get(`/tasks/${taskID}`);
  return res.data.data;
}

export async function createTask(storyID, payload) {
  const res = await api.post(`/stories/${storyID}/tasks`, payload);
  return res.data.data;
}

export async function updateTask(storyID, taskID, payload) {
  const res = await api.put(`/stories/${storyID}/tasks/${taskID}`, payload);
  return res.data.data;
}

export async function deleteTask(storyID, taskID) {
  const res = await api.delete(`/stories/${storyID}/tasks/${taskID}`);
  return res.data.data;
}
