import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getProject,
  addMember,
  removeMember,
  addManager,
  removeManager,
  linkRepository,
} from '../api/projects';
import { listStories, createStory, deleteStory } from '../api/stories';
import {
  listSprints,
  createSprint,
  deleteSprint,
} from '../api/sprints';
import { searchUsers } from '../api/users';
import { getUser } from '../auth';
import StatusBadge from '../components/StatusBadge';

export default function ProjectDetail() {
  const { id } = useParams();
  const projectID = Number(id);
  const me = getUser();

  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('stories');

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [p, st, sp] = await Promise.all([
        getProject(projectID),
        listStories(projectID),
        listSprints(projectID),
      ]);
      setProject(p);
      setStories(st);
      setSprints(sp);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [projectID]);

  if (loading) return <div className="empty">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!project) return <div className="empty">Project not found</div>;

  const isOwner = me && me.userID === project.owner?.userid;
  const isManager = (project.managers || []).some((m) => m.userid === me?.userID);
  const canManage = isOwner || isManager;

  return (
    <div>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>{project.projectTitle}</h1>
          {project.projectDescript && (
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {project.projectDescript}
            </p>
          )}
        </div>
        <Link to="/" className="btn secondary">
          ← Back
        </Link>
      </div>

      <div className="tabs">
        <button className={tab === 'stories' ? 'active' : ''} onClick={() => setTab('stories')}>
          Stories
        </button>
        <button className={tab === 'sprints' ? 'active' : ''} onClick={() => setTab('sprints')}>
          Sprints
        </button>
        <button className={tab === 'team' ? 'active' : ''} onClick={() => setTab('team')}>
          Team
        </button>
        <button className={tab === 'repo' ? 'active' : ''} onClick={() => setTab('repo')}>
          Repository
        </button>
      </div>

      {tab === 'stories' && (
        <StoriesTab
          projectID={projectID}
          stories={stories}
          canManage={canManage}
          onChange={loadAll}
        />
      )}
      {tab === 'sprints' && (
        <SprintsTab
          projectID={projectID}
          sprints={sprints}
          canManage={canManage}
          onChange={loadAll}
        />
      )}
      {tab === 'team' && (
        <TeamTab project={project} isOwner={isOwner} onChange={loadAll} />
      )}
      {tab === 'repo' && (
        <RepoTab project={project} isOwner={isOwner} onChange={loadAll} />
      )}
    </div>
  );
}

function StoriesTab({ projectID, stories, canManage, onChange }) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [descr, setDescr] = useState('');
  const [deadline, setDeadline] = useState('');
  const [err, setErr] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setErr('');
    try {
      await createStory(projectID, {
        storyTitle: title,
        storyDescript: descr,
        storyDeadline: deadline || null,
      });
      setTitle('');
      setDescr('');
      setDeadline('');
      setShow(false);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed to create story');
    }
  }

  async function handleDelete(storyID) {
    if (!window.confirm('Delete this story?')) return;
    try {
      await deleteStory(projectID, storyID);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed to delete');
    }
  }

  return (
    <div className="card">
      <div className="row between">
        <h2>Stories</h2>
        {canManage && (
          <button onClick={() => setShow((s) => !s)}>
            {show ? 'Cancel' : 'New story'}
          </button>
        )}
      </div>
      {err && <div className="error">{err}</div>}
      {show && (
        <form onSubmit={handleCreate} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={2} value={descr} onChange={(e) => setDescr(e.target.value)} />
          </div>
          <div className="field">
            <label>Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <button type="submit">Create</button>
        </form>
      )}

      {stories.length === 0 ? (
        <div className="empty">No stories yet.</div>
      ) : (
        <div className="list" style={{ marginTop: 12 }}>
          {stories.map((s) => (
            <div className="list-item" key={s.storyid}>
              <div>
                <Link
                  to={`/projects/${projectID}/stories/${s.storyid}`}
                  style={{ fontWeight: 600 }}
                >
                  {s.storytitle}
                </Link>
                <div className="meta">
                  {s.taskcount} task{s.taskcount === 1 ? '' : 's'}
                  {s.storydeadline && ` · due ${new Date(s.storydeadline).toLocaleDateString()}`}
                </div>
              </div>
              <div className="row">
                <StatusBadge status={s.derivedstatus} />
                {canManage && (
                  <button className="danger secondary" onClick={() => handleDelete(s.storyid)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SprintsTab({ projectID, sprints, canManage, onChange }) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [err, setErr] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setErr('');
    try {
      await createSprint(projectID, { title, goal, deadline: deadline || null });
      setTitle('');
      setGoal('');
      setDeadline('');
      setShow(false);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed to create sprint');
    }
  }

  async function handleDelete(sprintID) {
    if (!window.confirm('Delete this sprint?')) return;
    try {
      await deleteSprint(projectID, sprintID);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed to delete');
    }
  }

  return (
    <div className="card">
      <div className="row between">
        <h2>Sprints</h2>
        {canManage && (
          <button onClick={() => setShow((s) => !s)}>
            {show ? 'Cancel' : 'New sprint'}
          </button>
        )}
      </div>
      {err && <div className="error">{err}</div>}
      {show && (
        <form onSubmit={handleCreate} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label>Goal</label>
            <textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div className="field">
            <label>Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <button type="submit">Create</button>
        </form>
      )}

      {sprints.length === 0 ? (
        <div className="empty">No sprints yet.</div>
      ) : (
        <div className="list" style={{ marginTop: 12 }}>
          {sprints.map((s) => (
            <div className="list-item" key={s.sprintid}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                {s.goal && <div className="meta">{s.goal}</div>}
                <div className="meta">
                  {s.deadline ? `Deadline: ${new Date(s.deadline).toLocaleDateString()}` : 'No deadline'}
                </div>
              </div>
              {canManage && (
                <button className="danger secondary" onClick={() => handleDelete(s.sprintid)}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamTab({ project, isOwner, onChange }) {
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function doSearch(e) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await searchUsers(search.trim());
      setResults(r);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function add(kind, userID) {
    setErr('');
    try {
      if (kind === 'member') await addMember(project.projectID, userID);
      else await addManager(project.projectID, userID);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed');
    }
  }

  async function remove(kind, userID) {
    setErr('');
    try {
      if (kind === 'member') await removeMember(project.projectID, userID);
      else await removeManager(project.projectID, userID);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed');
    }
  }

  return (
    <>
      <div className="card">
        <h2>Owner</h2>
        {project.owner ? (
          <div>
            <strong>{project.owner.username}</strong>{' '}
            <span className="muted">({project.owner.email})</span>
          </div>
        ) : (
          <div className="muted">No owner</div>
        )}
      </div>

      <div className="card">
        <h2>Managers</h2>
        {project.managers.length === 0 ? (
          <div className="empty">No managers</div>
        ) : (
          <div className="list">
            {project.managers.map((m) => (
              <div className="list-item" key={`mgr-${m.userid}`}>
                <div>
                  <strong>{m.username}</strong>{' '}
                  <span className="muted">({m.email})</span>
                </div>
                {isOwner && (
                  <button className="danger secondary" onClick={() => remove('manager', m.userid)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Members</h2>
        {project.members.length === 0 ? (
          <div className="empty">No members</div>
        ) : (
          <div className="list">
            {project.members.map((m) => (
              <div className="list-item" key={`mem-${m.userid}`}>
                <div>
                  <strong>{m.username}</strong>{' '}
                  <span className="muted">({m.email})</span>
                </div>
                {isOwner && (
                  <button className="danger secondary" onClick={() => remove('member', m.userid)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="card">
          <h2>Add a person</h2>
          {err && <div className="error">{err}</div>}
          <form onSubmit={doSearch} className="row">
            <input
              placeholder="Search username or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <button type="submit" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
          {results.length > 0 && (
            <div className="list" style={{ marginTop: 12 }}>
              {results.map((u) => (
                <div className="list-item" key={u.userid}>
                  <div>
                    <strong>{u.username}</strong>{' '}
                    <span className="muted">({u.email})</span>
                  </div>
                  <div className="row">
                    <button className="secondary" onClick={() => add('member', u.userid)}>
                      Add member
                    </button>
                    <button onClick={() => add('manager', u.userid)}>Add manager</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function RepoTab({ project, isOwner, onChange }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [branch, setBranch] = useState('main');
  const [visibility, setVisibility] = useState('public');
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      await linkRepository(project.projectID, {
        repoName: name,
        repoLink: link,
        defBranch: branch,
        repoVisibility: visibility === 'public',
      });
      setShow(false);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed to link repository');
    }
  }

  return (
    <div className="card">
      <h2>Repository</h2>
      {project.repository ? (
        <div>
          <div>
            <strong>{project.repository.repoName}</strong>{' '}
            <span className="badge">{project.repository.repoVisibility ? 'public' : 'private'}</span>
          </div>
          <div className="muted">
            <a href={project.repository.repoLink} target="_blank" rel="noreferrer">
              {project.repository.repoLink}
            </a>
          </div>
          <div className="muted">Default branch: {project.repository.defBranch || '—'}</div>
        </div>
      ) : (
        <div className="empty">No repository linked.</div>
      )}

      {isOwner && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShow((s) => !s)}>
            {show ? 'Cancel' : project.repository ? 'Replace repository' : 'Link a repository'}
          </button>
          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
          {show && (
            <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
              <div className="field">
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Link (URL)</label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Default branch</label>
                <input value={branch} onChange={(e) => setBranch(e.target.value)} />
              </div>
              <div className="field">
                <label>Visibility</label>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <button type="submit">Save</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
