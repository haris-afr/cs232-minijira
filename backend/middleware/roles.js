const db = require('../db');

function parseId(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function isOwner(projectID, userID) {
  const r = await db.query(
    'SELECT 1 FROM project WHERE projectID=$1 AND ownerID=$2',
    [projectID, userID]
  );
  return r.rowCount > 0;
}

async function isManager(projectID, userID) {
  const r = await db.query(
    'SELECT 1 FROM manages WHERE projectID=$1 AND userID=$2',
    [projectID, userID]
  );
  return r.rowCount > 0;
}

async function isMember(projectID, userID) {
  const r = await db.query(
    'SELECT 1 FROM works WHERE projectID=$1 AND userID=$2',
    [projectID, userID]
  );
  return r.rowCount > 0;
}

async function hasAnyAccess(projectID, userID) {
  return (
    (await isOwner(projectID, userID)) ||
    (await isManager(projectID, userID)) ||
    (await isMember(projectID, userID))
  );
}

async function isOwnerOrManager(projectID, userID) {
  return (await isOwner(projectID, userID)) || (await isManager(projectID, userID));
}

module.exports = { parseId, isOwner, isManager, isMember, hasAnyAccess, isOwnerOrManager };
