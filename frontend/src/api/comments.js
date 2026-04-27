import api from './client';

export async function listComments(taskID) {
  const res = await api.get(`/tasks/${taskID}/comments`);
  return res.data.data;
}

export async function createComment(taskID, commentTxt) {
  const res = await api.post(`/tasks/${taskID}/comments`, { commentTxt });
  return res.data.data;
}

export async function deleteComment(taskID, commentID) {
  const res = await api.delete(`/tasks/${taskID}/comments/${commentID}`);
  return res.data.data;
}
