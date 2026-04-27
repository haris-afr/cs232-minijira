import api from './client';

export async function listAttachments(taskID) {
  const res = await api.get(`/tasks/${taskID}/attachments`);
  return res.data.data;
}

export async function createAttachment(taskID, payload) {
  const res = await api.post(`/tasks/${taskID}/attachments`, payload);
  return res.data.data;
}

export async function deleteAttachment(taskID, attachID) {
  const res = await api.delete(`/tasks/${taskID}/attachments/${attachID}`);
  return res.data.data;
}
