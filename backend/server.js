require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const storiesRoutes = require('./routes/stories');
const tasksRoutes = require('./routes/tasks');
const sprintsRoutes = require('./routes/sprints');
const commentsRoutes = require('./routes/comments');
const attachmentsRoutes = require('./routes/attachments');
const taskDetailRoutes = require('./routes/taskDetail');
const usersRoutes = require('./routes/users');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tasks', taskDetailRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/projects/:projectID/sprints', sprintsRoutes);
app.use('/api/projects/:projectID/stories', storiesRoutes);
app.use('/api/stories/:storyID/tasks', tasksRoutes);
app.use('/api/tasks/:taskID/comments', commentsRoutes);
app.use('/api/tasks/:taskID/attachments', attachmentsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MiniJira backend listening on port ${PORT}`);
});

module.exports = app;
