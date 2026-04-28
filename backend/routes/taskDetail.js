const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { parseId, hasAnyAccess } = require('../middleware/roles');

const router = express.Router();

router.use(auth);

router.get('/:taskID', async (req, res) => {
  try {
    const taskID = parseId(req.params.taskID);
    if (!taskID) return res.status(400).json({ error: 'Invalid task id' });

    const r = await db.query(
      `SELECT t.taskID, t.storyID, t.sprintID, t.assignedTo,
              t.taskDeadline, t.taskStatus, t.taskDescript, t.taskCreatedOn,
              s.projectID, s.storyTitle,
              u.username AS assignedToUsername,
              sp.title AS sprintTitle,
              p.projectTitle
         FROM task t
         JOIN story s ON s.storyID = t.storyID
         JOIN project p ON p.projectID = s.projectID
         LEFT JOIN "user" u ON u.userID = t.assignedTo
         LEFT JOIN sprint sp ON sp.sprintID = t.sprintID
         WHERE t.taskID=$1`,
      [taskID]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Task not found' });
    const task = r.rows[0];
    if (!(await hasAnyAccess(task.projectid, req.user.userID))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ data: task });
  } catch (err) {
    console.error('get task error:', err);
    return res.status(500).json({ error: 'Failed to load task' });
  }
});

module.exports = router;
