const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { parseId, hasAnyAccess, isOwnerOrManager } = require('../middleware/roles');

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
      `SELECT a.attachID, a.taskID, a.userID, a.attachName, a.attachUrl,
              u.username
         FROM attachment a
         LEFT JOIN "user" u ON u.userID = a.userID
         WHERE a.taskID=$1
         ORDER BY a.attachID ASC`,
      [taskID]
    );
    return res.json({ data: r.rows });
  } catch (err) {
    console.error('list attachments error:', err);
    return res.status(500).json({ error: 'Failed to list attachments' });
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
    const { attachName, attachUrl } = req.body || {};
    if (!attachName || !attachUrl) {
      return res.status(400).json({ error: 'attachName and attachUrl are required' });
    }
    const r = await db.query(
      `INSERT INTO attachment (taskID, userID, attachName, attachUrl)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [taskID, req.user.userID, attachName, attachUrl]
    );
    return res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('create attachment error:', err);
    return res.status(500).json({ error: 'Failed to create attachment' });
  }
});

router.delete('/:attachID', async (req, res) => {
  try {
    const taskID = parseId(req.params.taskID);
    const attachID = parseId(req.params.attachID);
    if (!taskID || !attachID) return res.status(400).json({ error: 'Invalid id' });

    const projectID = await getTaskProject(taskID);
    if (!projectID) return res.status(404).json({ error: 'Task not found' });

    const aQ = await db.query(
      'SELECT userID FROM attachment WHERE attachID=$1 AND taskID=$2',
      [attachID, taskID]
    );
    if (aQ.rowCount === 0) return res.status(404).json({ error: 'Attachment not found' });

    const isUploader = aQ.rows[0].userid === req.user.userID;
    const elevated = await isOwnerOrManager(projectID, req.user.userID);
    if (!isUploader && !elevated) {
      return res.status(403).json({ error: 'Only uploader or owner/manager can delete' });
    }

    await db.query('DELETE FROM attachment WHERE attachID=$1', [attachID]);
    return res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('delete attachment error:', err);
    return res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

module.exports = router;
