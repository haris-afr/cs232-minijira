import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStory } from '../api/stories';
import { listTasks, createTask, deleteTask } from '../api/tasks';
import { listSprints } from '../api/sprints';
import { getProject } from '../api/projects';
import { getUser } from '../auth';
import StatusBadge from '../components/StatusBadge';

export default function StoryDetail() {
  const { id, storyID } = useParams();
  const projectID = Number(id);
  const sID = Number(storyID);
  const me = getUser();

  const [story, setStory] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [s, t, p, sp] = await Promise.all([
        getStory(projectID, sID),
        listTasks(sID),
        getProject(projectID),
        listSprints(projectID),
      ]);
      setStory(s);
      setTasks(t);
      setProject(p);
      setSprints(sp);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load story');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [projectID, sID]);

  if (loading) return <div className="empty">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!story) return <div className="empty">Story not found</div>;

  const isOwner = me && me.userID === project?.owner?.userid;
  const isManager = (project?.managers || []).some((m) => m.userid === me?.userID);
  const canManage = isOwner || isManager;

  const assignableUsers = [
    ...(project?.owner ? [project.owner] : []),
    ...(project?.managers || []),
    ...(project?.members || []),
  ].reduce((acc, u) => {
    if (!acc.some((x) => x.userid === u.userid)) acc.push(u);
    return acc;
  }, []);

  return (
    <div>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>{story.storytitle}</h1>
          {story.storydescript && (
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {story.storydescript}
            </p>
          )}
        </div>
        <Link to={`/projects/${projectID}`} className="btn secondary">
          ← Back
        </Link>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <StatusBadge status={story.derivedstatus} />
        {story.storydeadline && (
          <span className="muted">
            Due {new Date(story.storydeadline).toLocaleDateString()}
          </span>
        )}
      </div>

      {canManage && (
        <NewTaskForm
          storyID={sID}
          sprints={sprints}
          users={assignableUsers}
          onCreated={load}
        />
      )}

      <div className="card">
        <h2>Tasks</h2>
        {tasks.length === 0 ? (
          <div className="empty">No tasks yet.</div>
        ) : (
          <div className="list">
            {tasks.map((t) => (
              <div className="list-item" key={t.taskid}>
                <div>
                  <Link to={`/tasks/${t.taskid}`} style={{ fontWeight: 600 }}>
                    {t.taskdescript || `Task #${t.taskid}`}
                  </Link>
                  <div className="meta">
                    {t.assignedtousername ? `Assigned to ${t.assignedtousername}` : 'Unassigned'}
                    {t.sprinttitle && ` · ${t.sprinttitle}`}
                    {t.taskdeadline && ` · due ${new Date(t.taskdeadline).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="row">
                  <StatusBadge status={t.taskstatus} />
                  {canManage && (
                    <button
                      className="danger secondary"
                      onClick={async () => {
                        if (!window.confirm('Delete this task?')) return;
                        try {
                          await deleteTask(sID, t.taskid);
                          await load();
                        } catch (err) {
                          setError(err.response?.data?.error || 'Failed to delete');
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewTaskForm({ storyID, sprints, users, onCreated }) {
  const [show, setShow] = useState(false);
  const [descr, setDescr] = useState('');
  const [sprintID, setSprintID] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('to-do');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try {
      await createTask(storyID, {
        sprintID: Number(sprintID),
        assignedTo: Number(assignedTo),
        taskDescript: descr,
        taskDeadline: deadline || null,
        taskStatus: status,
      });
      setShow(false);
      setDescr('');
      setSprintID('');
      setAssignedTo('');
      setDeadline('');
      setStatus('to-do');
      onCreated();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="row between">
        <h3>Create task</h3>
        <button className="secondary" onClick={() => setShow((s) => !s)}>
          {show ? 'Cancel' : 'New task'}
        </button>
      </div>
      {err && <div className="error">{err}</div>}
      {show && (
        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Description</label>
            <textarea
              rows={2}
              required
              value={descr}
              onChange={(e) => setDescr(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Sprint *</label>
            <select required value={sprintID} onChange={(e) => setSprintID(e.target.value)}>
              <option value="">Select a sprint…</option>
              {sprints.map((s) => (
                <option key={s.sprintid} value={s.sprintid}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Assignee *</label>
            <select
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Select an assignee…</option>
              {users.map((u) => (
                <option key={u.userid} value={u.userid}>
                  {u.username} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="to-do">To-do</option>
              <option value="in-progress">In-progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create task'}
          </button>
        </form>
      )}
    </div>
  );
}
