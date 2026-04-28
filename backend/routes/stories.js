const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { parseId, hasAnyAccess, isOwnerOrManager } = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.use(auth);

const STORY_STATUS_SQL = `
  CASE
    WHEN COUNT(t.taskID) = 0 THEN 'to-do'
    WHEN COUNT(t.taskID) = COUNT(CASE WHEN LOWER(t.taskStatus) = 'done' THEN 1 END)
      THEN 'done'
    WHEN COUNT(CASE WHEN LOWER(t.taskStatus) = 'in-progress' THEN 1 END) > 0
      THEN 'in-progress'
    ELSE 'to-do'
  END
`;

router.get('/', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });
    if (!(await hasAnyAccess(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const r = await db.query(
      `SELECT s.storyID, s.projectID, s.storyTitle, s.storyDescript,
              s.storyDeadline, s.storyCreatedOn,
              ${STORY_STATUS_SQL} AS derivedStatus,
              COUNT(t.taskID)::int AS taskCount
         FROM story s
         LEFT JOIN task t ON t.storyID = s.storyID
         WHERE s.projectID = $1
         GROUP BY s.storyID
         ORDER BY s.storyCreatedOn DESC`,
      [projectID]
    );
    return res.json({ data: r.rows });
  } catch (err) {
    console.error('list stories error:', err);
    return res.status(500).json({ error: 'Failed to list stories' });
  }
});

router.post('/', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });
    if (!(await isOwnerOrManager(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Owner or manager only' });
    }
    const { storyTitle, storyDescript, storyDeadline } = req.body || {};
    if (!storyTitle) return res.status(400).json({ error: 'storyTitle is required' });

    const r = await db.query(
      `INSERT INTO story (projectID, storyTitle, storyDescript, storyDeadline)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [projectID, storyTitle, storyDescript || null, storyDeadline || null]
    );
    return res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('create story error:', err);
    return res.status(500).json({ error: 'Failed to create story' });
  }
});

router.get('/:storyID', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    const storyID = parseId(req.params.storyID);
    if (!projectID || !storyID) return res.status(400).json({ error: 'Invalid id' });
    if (!(await hasAnyAccess(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const r = await db.query(
      `SELECT s.storyID, s.projectID, s.storyTitle, s.storyDescript,
              s.storyDeadline, s.storyCreatedOn,
              ${STORY_STATUS_SQL} AS derivedStatus,
              COUNT(t.taskID)::int AS taskCount
         FROM story s
         LEFT JOIN task t ON t.storyID = s.storyID
         WHERE s.storyID = $1 AND s.projectID = $2
         GROUP BY s.storyID`,
      [storyID, projectID]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Story not found' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('get story error:', err);
    return res.status(500).json({ error: 'Failed to load story' });
  }
});

router.put('/:storyID', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    const storyID = parseId(req.params.storyID);
    if (!projectID || !storyID) return res.status(400).json({ error: 'Invalid id' });
    if (!(await isOwnerOrManager(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Owner or manager only' });
    }
    const { storyTitle, storyDescript, storyDeadline } = req.body || {};
    const r = await db.query(
      `UPDATE story
         SET storyTitle = COALESCE($1, storyTitle),
             storyDescript = COALESCE($2, storyDescript),
             storyDeadline = COALESCE($3, storyDeadline)
         WHERE storyID=$4 AND projectID=$5
         RETURNING *`,
      [storyTitle || null, storyDescript || null, storyDeadline || null, storyID, projectID]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Story not found' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('update story error:', err);
    return res.status(500).json({ error: 'Failed to update story' });
  }
});

router.delete('/:storyID', async (req, res) => {
  try {
    const projectID = parseId(req.params.projectID);
    const storyID = parseId(req.params.storyID);
    if (!projectID || !storyID) return res.status(400).json({ error: 'Invalid id' });
    if (!(await isOwnerOrManager(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Owner or manager only' });
    }
    const r = await db.query(
      'DELETE FROM story WHERE storyID=$1 AND projectID=$2 RETURNING storyID',
      [storyID, projectID]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Story not found' });
    return res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('delete story error:', err);
    return res.status(500).json({ error: 'Failed to delete story' });
  }
});

module.exports = router;
