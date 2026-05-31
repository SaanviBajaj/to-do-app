const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const status = document.getElementById('status');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function loadTodos() {
  setStatus('Loading todos...');

  try {
    const response = await fetch('/api/todos');
    if (!response.ok) {
      throw new Error('Failed to load todos');
    }

    const todos = await response.json();
    renderTodos(todos);
    setStatus(`${todos.length} task${todos.length === 1 ? '' : 's'}`);
  } catch (error) {
    setStatus(error.message, true);
    todoList.innerHTML = '';
  }
}

function renderTodos(todos) {
  if (todos.length === 0) {
    todoList.innerHTML = '<li class="empty-state">No tasks yet. Add one above.</li>';
    return;
  }

  todoList.innerHTML = todos
    .map(
      (todo) => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
          <input type="checkbox" ${todo.completed ? 'checked' : ''} aria-label="Mark complete" />
          <span>${escapeHtml(todo.title)}</span>
          <button type="button" aria-label="Delete task">Delete</button>
        </li>
      `
    )
    .join('');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

todoForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = todoInput.value.trim();
  if (!title) {
    return;
  }

  try {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error('Failed to create todo');
    }

    todoInput.value = '';
    await loadTodos();
  } catch (error) {
    setStatus(error.message, true);
  }
});

todoList.addEventListener('click', async (event) => {
  const item = event.target.closest('.todo-item');
  if (!item) {
    return;
  }

  const id = item.dataset.id;

  if (event.target.matches('input[type="checkbox"]')) {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: event.target.checked }),
      });

      if (!response.ok) {
        throw new Error('Failed to update todo');
      }

      await loadTodos();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  if (event.target.matches('button')) {
    try {
      const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete todo');
      }

      await loadTodos();
    } catch (error) {
      setStatus(error.message, true);
    }
  }
});

loadTodos();
