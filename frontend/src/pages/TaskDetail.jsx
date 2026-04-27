import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTask, updateTask, deleteTask } from '../api/tasks';
import {
  listComments,
  createComment,
  deleteComment,
} from '../api/comments';
import {
  listAttachments,
  createAttachment,
  deleteAttachment,
} from '../api/attachments';
import { getProject } from '../api/projects';
import { listSprints } from '../api/sprints';
import { getUser } from '../auth';
import StatusBadge from '../components/StatusBadge';

export default function TaskDetail() {
  const { taskID } = useParams();
  const tID = Number(taskID);
  const me = getUser();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const t = await getTask(tID);
      setTask(t);
      const [p, c, a, sp] = await Promise.all([
        getProject(t.projectid),
        listComments(tID),
        listAttachments(tID),
        listSprints(t.projectid),
      ]);
      setProject(p);
      setComments(c);
      setAttachments(a);
      setSprints(sp);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tID]);

  if (loading) return <div className="empty">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!task) return <div className="empty">Task not found</div>;

  const isOwner = me && me.userID === project?.owner?.userid;
  const isManager = (project?.managers || []).some((m) => m.userid === me?.userID);
  const canManage = isOwner || isManager;
  const isAssignee = me && task.assignedto === me.userID;

  const allUsers = [
    ...(project?.owner ? [project.owner] : []),
    ...(project?.managers || []),
    ...(project?.members || []),
  ].reduce((acc, u) => {
    if (!acc.some((x) => x.userid === u.userid)) acc.push(u);
    return acc;
  }, []);

  async function handleStatusChange(taskStatus) {
    try {
      await updateTask(task.storyid, tID, { taskStatus });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    }
  }

  return (
    <div>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>
            {task.taskdescript || `Task #${task.taskid}`}
          </h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            <Link to={`/projects/${task.projectid}`}>{task.projecttitle}</Link>
            {' / '}
            <Link to={`/projects/${task.projectid}/stories/${task.storyid}`}>
              {task.storytitle}
            </Link>
          </p>
        </div>
        <Link to={`/projects/${task.projectid}/stories/${task.storyid}`} className="btn secondary">
          ← Back
        </Link>
      </div>

      <div className="card">
        <div className="row between">
          <h2>Details</h2>
          <StatusBadge status={task.taskstatus} />
        </div>
        <div className="col" style={{ marginTop: 8 }}>
          <div>
            <span className="muted">Sprint:</span> {task.sprinttitle || '—'}
          </div>
          <div>
            <span className="muted">Assigned to:</span>{' '}
            {task.assignedtousername || '—'}
          </div>
          <div>
            <span className="muted">Deadline:</span>{' '}
            {task.taskdeadline ? new Date(task.taskdeadline).toLocaleString() : '—'}
          </div>
          <div>
            <span className="muted">Created:</span>{' '}
            {new Date(task.taskcreatedon).toLocaleString()}
          </div>
        </div>

        {(canManage || isAssignee) && (
          <div className="row" style={{ marginTop: 12 }}>
            <label className="muted" style={{ marginBottom: 0 }}>
              Update status:
            </label>
            <select
              value={task.taskstatus || 'to-do'}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ maxWidth: 200 }}
            >
              <option value="to-do">To-do</option>
              <option value="in-progress">In-progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}

        {canManage && (
          <EditTaskForm
            task={task}
            sprints={sprints}
            users={allUsers}
            onSaved={load}
          />
        )}

        {canManage && (
          <button
            className="danger"
            style={{ marginTop: 12 }}
            onClick={async () => {
              if (!window.confirm('Delete this task?')) return;
              try {
                await deleteTask(task.storyid, tID);
                window.location.href = `/projects/${task.projectid}/stories/${task.storyid}`;
              } catch (err) {
                setError(err.response?.data?.error || 'Failed to delete');
              }
            }}
          >
            Delete task
          </button>
        )}
      </div>

      <CommentsSection taskID={tID} comments={comments} me={me} onChange={load} />
      <AttachmentsSection
        taskID={tID}
        attachments={attachments}
        me={me}
        canManage={canManage}
        onChange={load}
      />
    </div>
  );
}

function EditTaskForm({ task, sprints, users, onSaved }) {
  const [show, setShow] = useState(false);
  const [descr, setDescr] = useState(task.taskdescript || '');
  const [sprintID, setSprintID] = useState(task.sprintid || '');
  const [assignedTo, setAssignedTo] = useState(task.assignedto || '');
  const [deadline, setDeadline] = useState(
    task.taskdeadline ? task.taskdeadline.slice(0, 10) : ''
  );
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      await updateTask(task.storyid, task.taskid, {
        taskDescript: descr,
        sprintID: sprintID ? Number(sprintID) : null,
        assignedTo: assignedTo ? Number(assignedTo) : null,
        taskDeadline: deadline || null,
      });
      setShow(false);
      onSaved();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed to update');
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button className="secondary" onClick={() => setShow((s) => !s)}>
        {show ? 'Cancel edit' : 'Edit task'}
      </button>
      {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
      {show && (
        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Description</label>
            <textarea
              rows={2}
              value={descr}
              onChange={(e) => setDescr(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Sprint</label>
            <select value={sprintID} onChange={(e) => setSprintID(e.target.value)}>
              <option value="">—</option>
              {sprints.map((s) => (
                <option key={s.sprintid} value={s.sprintid}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Assignee</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.userid} value={u.userid}>
                  {u.username}
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
          <button type="submit">Save</button>
        </form>
      )}
    </div>
  );
}

function CommentsSection({ taskID, comments, me, onChange }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setErr('');
    try {
      await createComment(taskID, text);
      setText('');
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed');
    }
  }

  async function handleDelete(commentID) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(taskID, commentID);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed');
    }
  }

  return (
    <div className="card">
      <h2>Comments</h2>
      {err && <div className="error">{err}</div>}
      {comments.length === 0 ? (
        <div className="empty">No comments yet.</div>
      ) : (
        <div>
          {comments.map((c) => (
            <div className="comment" key={c.commentid}>
              <div className="row between">
                <span className="author">{c.username || `User #${c.userid}`}</span>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  {new Date(c.commentcreatedon).toLocaleString()}
                </span>
              </div>
              <div style={{ marginTop: 4 }}>{c.commenttxt}</div>
              {me && me.userID === c.userid && (
                <div style={{ marginTop: 6 }}>
                  <button
                    className="danger secondary"
                    onClick={() => handleDelete(c.commentid)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div className="field">
          <label>Add a comment</label>
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something..."
          />
        </div>
        <button type="submit" disabled={!text.trim()}>
          Post
        </button>
      </form>
    </div>
  );
}

function AttachmentsSection({ taskID, attachments, me, canManage, onChange }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      await createAttachment(taskID, { attachName: name, attachUrl: url });
      setName('');
      setUrl('');
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed');
    }
  }

  async function handleDelete(attachID) {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await deleteAttachment(taskID, attachID);
      onChange();
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Failed');
    }
  }

  return (
    <div className="card">
      <h2>Attachments</h2>
      {err && <div className="error">{err}</div>}
      {attachments.length === 0 ? (
        <div className="empty">No attachments yet.</div>
      ) : (
        <div className="list">
          {attachments.map((a) => (
            <div className="list-item" key={a.attachid}>
              <div>
                <a href={a.attachurl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                  {a.attachname}
                </a>
                <div className="meta">
                  Added by {a.username || `User #${a.userid}`}
                </div>
              </div>
              {(canManage || (me && me.userID === a.userid)) && (
                <button
                  className="danger secondary"
                  onClick={() => handleDelete(a.attachid)}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <button type="submit">Add attachment</button>
      </form>
    </div>
  );
}
