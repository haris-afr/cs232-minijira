const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { parseId, hasAnyAccess, isOwnerOrManager } = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });
    if (!(await hasAnyAccess(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const r = await db.query(
      `SELECT sprintID, projectID, title, goal, deadline, createdAt
         FROM sprint WHERE projectID=$1 ORDER BY createdAt DESC`,
      [projectID]
    );
    return res.json({ data: r.rows });
  } catch (err) {
    console.error('list sprints error:', err);
    return res.status(500).json({ error: 'Failed to list sprints' });
  }
});

router.post('/', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });
    if (!(await isOwnerOrManager(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Owner or manager only' });
    }
    const { title, goal, deadline } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });

    const r = await db.query(
      `INSERT INTO sprint (projectID, title, goal, deadline)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [projectID, title, goal || null, deadline || null]
    );
    return res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('create sprint error:', err);
    return res.status(500).json({ error: 'Failed to create sprint' });
  }
});

router.put('/:sprintID', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    const sprintID = parseId(req.params.sprintID);
    if (!projectID || !sprintID) return res.status(400).json({ error: 'Invalid id' });
    if (!(await isOwnerOrManager(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Owner or manager only' });
    }
    const { title, goal, deadline } = req.body || {};
    const r = await db.query(
      `UPDATE sprint
         SET title = COALESCE($1, title),
             goal = COALESCE($2, goal),
             deadline = COALESCE($3, deadline)
         WHERE sprintID=$4 AND projectID=$5
         RETURNING *`,
      [title || null, goal || null, deadline || null, sprintID, projectID]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Sprint not found' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('update sprint error:', err);
    return res.status(500).json({ error: 'Failed to update sprint' });
  }
});

router.delete('/:sprintID', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    const sprintID = parseId(req.params.sprintID);
    if (!projectID || !sprintID) return res.status(400).json({ error: 'Invalid id' });
    if (!(await isOwnerOrManager(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Owner or manager only' });
    }
    const r = await db.query(
      'DELETE FROM sprint WHERE sprintID=$1 AND projectID=$2 RETURNING sprintID',
      [sprintID, projectID]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Sprint not found' });
    return res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('delete sprint error:', err);
    return res.status(500).json({ error: 'Failed to delete sprint' });
  }
});

module.exports = router;
