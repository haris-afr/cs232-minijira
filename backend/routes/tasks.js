const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { parseId, hasAnyAccess, isOwnerOrManager } = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.use(auth);

async function getStoryProject(storyID) {
  const r = await db.query('SELECT projectID FROM story WHERE storyID=$1', [storyID]);
  return r.rowCount === 0 ? null : r.rows[0].projectid;
}

router.get('/', async (req, res) => {
  try {
    const storyID = parseId(req.params.storyID);
    if (!storyID) return res.status(400).json({ error: 'Invalid story id' });
    const projectID = await getStoryProject(storyID);
    if (!projectID) return res.status(404).json({ error: 'Story not found' });
    if (!(await hasAnyAccess(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const r = await db.query(
      `SELECT t.taskID, t.storyID, t.sprintID, t.assignedTo,
              t.taskDeadline, t.taskStatus, t.taskDescript, t.taskCreatedOn,
              u.username AS assignedToUsername,
              sp.title AS sprintTitle
         FROM task t
         LEFT JOIN "user" u ON u.userID = t.assignedTo
         LEFT JOIN sprint sp ON sp.sprintID = t.sprintID
         WHERE t.storyID=$1
         ORDER BY t.taskCreatedOn DESC`,
      [storyID]
    );
    return res.json({ data: r.rows });
  } catch (err) {
    console.error('list tasks error:', err);
    return res.status(500).json({ error: 'Failed to list tasks' });
  }
});

router.post('/', async (req, res) => {
  try {
    const storyID = parseId(req.params.storyID);
    if (!storyID) return res.status(400).json({ error: 'Invalid story id' });
    const projectID = await getStoryProject(storyID);
    if (!projectID) return res.status(404).json({ error: 'Story not found' });
    if (!(await isOwnerOrManager(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Owner or manager only' });
    }
    const { sprintID, assignedTo, taskDescript, taskDeadline, taskStatus } = req.body || {};
    const sprintIDInt = parseId(sprintID);
    const assignedToInt = parseId(assignedTo);
    if (!sprintIDInt) return res.status(400).json({ error: 'sprintID is required' });
    if (!assignedToInt) return res.status(400).json({ error: 'assignedTo is required' });

    const sprintCheck = await db.query(
      'SELECT 1 FROM sprint WHERE sprintID=$1 AND projectID=$2',
      [sprintIDInt, projectID]
    );
    if (sprintCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Sprint does not belong to this project' });
    }

    const r = await db.query(
      `INSERT INTO task (storyID, sprintID, assignedTo, taskDescript, taskDeadline, taskStatus)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        storyID,
        sprintIDInt,
        assignedToInt,
        taskDescript || null,
        taskDeadline || null,
        taskStatus || 'to-do',
      ]
    );
    return res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('create task error:', err);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:taskID', async (req, res) => {
  try {
    const storyID = parseId(req.params.storyID);
    const taskID = parseId(req.params.taskID);
    if (!storyID || !taskID) return res.status(400).json({ error: 'Invalid id' });
    const projectID = await getStoryProject(storyID);
    if (!projectID) return res.status(404).json({ error: 'Story not found' });

    const taskQ = await db.query(
      'SELECT taskID, storyID, sprintID, assignedTo, taskStatus FROM task WHERE taskID=$1 AND storyID=$2',
      [taskID, storyID]
    );
    if (taskQ.rowCount === 0) return res.status(404).json({ error: 'Task not found' });
    const task = taskQ.rows[0];

    const userID = req.user.userID;
    const ownerOrManager = await isOwnerOrManager(projectID, userID);

    if (!ownerOrManager) {
      if (task.assignedto !== userID) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const { taskStatus } = req.body || {};
      if (!taskStatus) {
        return res.status(400).json({ error: 'Members may only update taskStatus' });
      }
      const r = await db.query(
        `UPDATE task SET taskStatus=$1 WHERE taskID=$2 RETURNING *`,
        [taskStatus, taskID]
      );
      return res.json({ data: r.rows[0] });
    }

    const { sprintID, assignedTo, taskDescript, taskDeadline, taskStatus } = req.body || {};
    const newSprintID = sprintID === undefined || sprintID === null ? null : parseId(sprintID);
    if (sprintID !== undefined && sprintID !== null && !newSprintID) {
      return res.status(400).json({ error: 'Invalid sprintID' });
    }
    if (newSprintID) {
      const sprintCheck = await db.query(
        'SELECT 1 FROM sprint WHERE sprintID=$1 AND projectID=$2',
        [newSprintID, projectID]
      );
      if (sprintCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Sprint does not belong to this project' });
      }
    }
    const newAssignedTo =
      assignedTo === undefined || assignedTo === null ? null : parseId(assignedTo);
    if (assignedTo !== undefined && assignedTo !== null && !newAssignedTo) {
      return res.status(400).json({ error: 'Invalid assignedTo' });
    }

    const r = await db.query(
      `UPDATE task SET
         sprintID = COALESCE($1, sprintID),
         assignedTo = COALESCE($2, assignedTo),
         taskDescript = COALESCE($3, taskDescript),
         taskDeadline = COALESCE($4, taskDeadline),
         taskStatus = COALESCE($5, taskStatus)
       WHERE taskID=$6 RETURNING *`,
      [
        newSprintID,
        newAssignedTo,
        taskDescript || null,
        taskDeadline || null,
        taskStatus || null,
        taskID,
      ]
    );
    return res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('update task error:', err);
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:taskID', async (req, res) => {
  try {
    const storyID = parseId(req.params.storyID);
    const taskID = parseId(req.params.taskID);
    if (!storyID || !taskID) return res.status(400).json({ error: 'Invalid id' });
    const projectID = await getStoryProject(storyID);
    if (!projectID) return res.status(404).json({ error: 'Story not found' });
    if (!(await isOwnerOrManager(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Owner or manager only' });
    }
    const r = await db.query(
      'DELETE FROM task WHERE taskID=$1 AND storyID=$2 RETURNING taskID',
      [taskID, storyID]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Task not found' });
    return res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('delete task error:', err);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
