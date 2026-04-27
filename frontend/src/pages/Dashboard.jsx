import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, createProject, deleteProject } from '../api/projects';
import { getUser } from '../auth';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [descr, setDescr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const me = getUser();

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createProject({ projectTitle: title, projectDescript: descr });
      setTitle('');
      setDescr('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete project');
    }
  }

  return (
    <div>
      <div className="section-title">
        <h1 style={{ margin: 0 }}>Your projects</h1>
        <button onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'New project'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Create project</h3>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                rows={3}
                value={descr}
                onChange={(e) => setDescr(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="card empty">
          You have no projects yet. Create your first project to get started.
        </div>
      ) : (
        <div className="grid">
          {projects.map((p) => (
            <div className="card" key={p.projectid}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <Link to={`/projects/${p.projectid}`} style={{ fontWeight: 600 }}>
                  {p.projecttitle}
                </Link>
                {me && me.userID === p.ownerid && (
                  <span className="badge">Owner</span>
                )}
              </div>
              {p.projectdescript && (
                <p className="muted" style={{ margin: '4px 0' }}>
                  {p.projectdescript}
                </p>
              )}
              <div className="row between" style={{ marginTop: 8 }}>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  Created {new Date(p.projcreatedon).toLocaleDateString()}
                </span>
                {me && me.userID === p.ownerid && (
                  <button className="danger" onClick={() => handleDelete(p.projectid)}>
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
