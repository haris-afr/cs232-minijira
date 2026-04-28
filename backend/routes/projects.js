const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { parseId, isOwner, isManager, isMember } = require('../middleware/roles');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const userID = req.user.userID;
    const result = await db.query(
      `SELECT DISTINCT p.projectID, p.projectTitle, p.projectDescript,
              p.ownerID, p.repoID, p.projCreatedOn
         FROM project p
         LEFT JOIN works w ON w.projectID = p.projectID
         LEFT JOIN manages m ON m.projectID = p.projectID
         WHERE p.ownerID = $1 OR w.userID = $1 OR m.userID = $1
         ORDER BY p.projCreatedOn DESC`,
      [userID]
    );
    return res.json({ data: result.rows });
  } catch (err) {
    console.error('list projects error:', err);
    return res.status(500).json({ error: 'Failed to list projects' });
  }
});

router.post('/', async (req, res) => {
  const client = await db.connect();
  try {
    const { projectTitle, projectDescript } = req.body || {};
    if (!projectTitle) {
      return res.status(400).json({ error: 'projectTitle is required' });
    }
    const userID = req.user.userID;

    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO project (ownerID, projectTitle, projectDescript)
       VALUES ($1, $2, $3) RETURNING *`,
      [userID, projectTitle, projectDescript || null]
    );
    const project = inserted.rows[0];
    await client.query(
      'INSERT INTO works (userID, projectID) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userID, project.projectid]
    );
    await client.query(
      'INSERT INTO manages (userID, projectID) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userID, project.projectid]
    );
    await client.query('COMMIT');
    return res.status(201).json({ data: project });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('create project error:', err);
    return res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
});

router.get('/:id', async (req, res) => {
  try {
    const projectID = parseId(req.params.id);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });

    const userID = req.user.userID;
    const access =
      (await isOwner(projectID, userID)) ||
      (await isManager(projectID, userID)) ||
      (await isMember(projectID, userID));
    if (!access) return res.status(403).json({ error: 'Forbidden' });

    const projectQ = await db.query(
      `SELECT p.*, r.repoID, r.repoName, r.repoLink, r.defBranch, r.repoVisibility
         FROM project p
         LEFT JOIN repository r ON r.repoID = p.repoID
         WHERE p.projectID = $1`,
      [projectID]
    );
    if (projectQ.rowCount === 0) return res.status(404).json({ error: 'Project not found' });

    const project = projectQ.rows[0];

    const ownerQ = await db.query(
      'SELECT userID, username, email FROM "user" WHERE userID=$1',
      [project.ownerid]
    );

    const membersQ = await db.query(
      `SELECT u.userID, u.username, u.email
         FROM works w JOIN "user" u ON u.userID = w.userID
         WHERE w.projectID = $1`,
      [projectID]
    );

    const managersQ = await db.query(
      `SELECT u.userID, u.username, u.email
         FROM manages m JOIN "user" u ON u.userID = m.userID
         WHERE m.projectID = $1`,
      [projectID]
    );

    const repository = project.repoid
      ? {
          repoID: project.repoid,
          repoName: project.reponame,
          repoLink: project.repolink,
          defBranch: project.defbranch,
          repoVisibility: project.repovisibility,
        }
      : null;

    return res.json({
      data: {
        projectID: project.projectid,
        projectTitle: project.projecttitle,
        projectDescript: project.projectdescript,
        projCreatedOn: project.projcreatedon,
        owner: ownerQ.rows[0] || null,
        members: membersQ.rows,
        managers: managersQ.rows,
        repository,
      },
    });
  } catch (err) {
    console.error('get project error:', err);
    return res.status(500).json({ error: 'Failed to load project' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const projectID = parseId(req.params.id);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });
    if (!(await isOwner(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Only the owner can delete the project' });
    }
    await db.query('DELETE FROM project WHERE projectID=$1', [projectID]);
    return res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('delete project error:', err);
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const projectID = parseId(req.params.id);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });
    if (!(await isOwner(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Only the owner can manage members' });
    }
    const memberID = parseId(req.body && req.body.userID);
    if (!memberID) return res.status(400).json({ error: 'userID is required' });

    const u = await db.query('SELECT 1 FROM "user" WHERE userID=$1', [memberID]);
    if (u.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    await db.query(
      'INSERT INTO works (userID, projectID) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [memberID, projectID]
    );
    return res.status(201).json({ data: { userID: memberID, projectID } });
  } catch (err) {
    console.error('add member error:', err);
    return res.status(500).json({ error: 'Failed to add member' });
  }
});

router.delete('/:id/members/:userID', async (req, res) => {
  try {
    const projectID = parseId(req.params.id);
    const memberID = parseId(req.params.userID);
    if (!projectID || !memberID) return res.status(400).json({ error: 'Invalid id' });
    if (!(await isOwner(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Only the owner can manage members' });
    }
    await db.query('DELETE FROM works WHERE projectID=$1 AND userID=$2', [
      projectID,
      memberID,
    ]);
    return res.json({ data: { removed: true } });
  } catch (err) {
    console.error('remove member error:', err);
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});

router.post('/:id/managers', async (req, res) => {
  try {
    const projectID = parseId(req.params.id);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });
    if (!(await isOwner(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Only the owner can manage managers' });
    }
    const managerID = parseId(req.body && req.body.userID);
    if (!managerID) return res.status(400).json({ error: 'userID is required' });

    const u = await db.query('SELECT 1 FROM "user" WHERE userID=$1', [managerID]);
    if (u.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    await db.query(
      'INSERT INTO manages (userID, projectID) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [managerID, projectID]
    );
    return res.status(201).json({ data: { userID: managerID, projectID } });
  } catch (err) {
    console.error('add manager error:', err);
    return res.status(500).json({ error: 'Failed to add manager' });
  }
});

router.delete('/:id/managers/:userID', async (req, res) => {
  try {
    const projectID = parseId(req.params.id);
    const managerID = parseId(req.params.userID);
    if (!projectID || !managerID) return res.status(400).json({ error: 'Invalid id' });
    if (!(await isOwner(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Only the owner can manage managers' });
    }
    await db.query('DELETE FROM manages WHERE projectID=$1 AND userID=$2', [
      projectID,
      managerID,
    ]);
    return res.json({ data: { removed: true } });
  } catch (err) {
    console.error('remove manager error:', err);
    return res.status(500).json({ error: 'Failed to remove manager' });
  }
});

router.post('/:id/repository', async (req, res) => {
  const client = await db.connect();
  try {
    const projectID = parseId(req.params.id);
    if (!projectID) return res.status(400).json({ error: 'Invalid project id' });
    if (!(await isOwner(projectID, req.user.userID))) {
      return res.status(403).json({ error: 'Only the owner can link a repository' });
    }
    const { repoName, repoLink, defBranch, repoVisibility } = req.body || {};
    if (!repoName || !repoLink || typeof repoVisibility !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'repoName, repoLink and repoVisibility (bool) are required' });
    }

    await client.query('BEGIN');
    const repoIns = await client.query(
      `INSERT INTO repository (repoName, repoLink, defBranch, repoVisibility)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [repoName, repoLink, defBranch || null, repoVisibility]
    );
    const repo = repoIns.rows[0];
    await client.query('UPDATE project SET repoID=$1 WHERE projectID=$2', [
      repo.repoid,
      projectID,
    ]);
    await client.query('COMMIT');
    return res.status(201).json({ data: repo });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('link repo error:', err);
    return res.status(500).json({ error: 'Failed to link repository' });
  } finally {
    client.release();
  }
});

module.exports = router;
