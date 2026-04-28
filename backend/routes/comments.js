const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { parseId, hasAnyAccess } = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.use(auth);

async function getTaskProject(taskID) {
  const r = await db.query(
    `SELECT s.projectID FROM task t
       JOIN story s ON s.storyID = t.storyID
      WHERE t.taskID = $1`,
    [taskID]
  );
  return r.rowCount === 0 ? null : r.rows[0].projectid;
}

router.get('/', async (req, res) => {
  try {
    const taskID = parseId(req.params.taskID);
    if (!taskID) return res.status(400).json({ error: 'Invalid task id' });
    const projectID = await getTaskProject(taskID);
    if (!projectID) return res.status(404).json({ error: 'Task not found' });
    if (!(await hasAnyAccess(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const r = await db.query(
      `SELECT c.commentID, c.userID, c.taskID, c.commentTxt, c.commentCreatedOn,
              u.username
         FROM "comment" c
         LEFT JOIN "user" u ON u.userID = c.userID
         WHERE c.taskID=$1
         ORDER BY c.commentCreatedOn ASC`,
      [taskID]
    );
    return res.json({ data: r.rows });
  } catch (err) {
    console.error('list comments error:', err);
    return res.status(500).json({ error: 'Failed to list comments' });
  }
});

router.post('/', async (req, res) => {
  try {
    const taskID = parseId(req.params.taskID);
    if (!taskID) return res.status(400).json({ error: 'Invalid task id' });
    const projectID = await getTaskProject(taskID);
    if (!projectID) return res.status(404).json({ error: 'Task not found' });
    if (!(await hasAnyAccess(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { commentTxt } = req.body || {};
    if (!commentTxt) return res.status(400).json({ error: 'commentTxt is required' });

    const r = await db.query(
      `INSERT INTO "comment" (userID, taskID, commentTxt)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.userID, taskID, commentTxt]
    );
    return res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('create comment error:', err);
    return res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.delete('/:commentID', async (req, res) => {
  try {
    const taskID = parseId(req.params.taskID);
    const commentID = parseId(req.params.commentID);
    if (!taskID || !commentID) return res.status(400).json({ error: 'Invalid id' });

    const cQ = await db.query(
      'SELECT userID FROM "comment" WHERE commentID=$1 AND taskID=$2',
      [commentID, taskID]
    );
    if (cQ.rowCount === 0) return res.status(404).json({ error: 'Comment not found' });
    if (cQ.rows[0].userid !== req.user.userID) {
      return res.status(403).json({ error: 'Only the comment author can delete' });
    }
    await db.query('DELETE FROM "comment" WHERE commentID=$1', [commentID]);
    return res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('delete comment error:', err);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
