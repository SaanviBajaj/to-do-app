const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8080;

const pool = new Pool({
  host: process.env.DB_HOST || 'todo-db',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'todo',
  password: process.env.DB_PASSWORD || 'todo',
  database: process.env.DB_NAME || 'todo',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function waitForDatabase(maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      console.log('Connected to PostgreSQL');
      return;
    } catch (error) {
      console.log(`Database not ready (attempt ${attempt}/${maxAttempts}): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Could not connect to PostgreSQL after multiple attempts');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: error.message });
  }
});

app.get('/api/todos', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, completed, created_at FROM todos ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/todos', async (req, res) => {
  const title = req.body.title?.trim();
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at',
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/todos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { completed } = req.body;

  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be a boolean' });
  }

  try {
    const result = await pool.query(
      'UPDATE todos SET completed = $1 WHERE id = $2 RETURNING id, title, completed, created_at',
      [completed, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const result = await pool.query('DELETE FROM todos WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function start() {
  await waitForDatabase();

  app.listen(port, '0.0.0.0', () => {
    console.log(`Todo app listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start application:', error.message);
  process.exit(1);
});
