document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const taskInput = document.getElementById('task-input');
  const addTaskButton = document.getElementById('add-task-button');
  const taskList = document.getElementById('task-list');
  
  // Active task tracking
  let activeTaskId = null;
  const taskTimes = {}; // { taskId: numberOfSeconds }

  // Timer interval for the active task
  let timerInterval = null;

  // Whether the main (global) timer is running
  let mainTimerRunning = false;

  // **NEW** Two dictionaries to keep track of DB total vs. local:
  const dbTimeSpent = {};   // { taskId: numberOfSeconds from the DB }
  const localTime = {};     // { taskId: numberOf extra seconds accumulated locally }
  

  /*
  // 1) ADD NEW TASKS
  addTaskButton.addEventListener('click', () => {
      const taskName = taskInput.value.trim();
      if (!taskName) {
          alert('Please enter a task name.');
          return;
      }

      // Generate unique ID
      const taskId = `task-${Date.now()}`;
      taskTimes[taskId] = 0;

      // Create the DOM element
      const taskItem = document.createElement('div');
      taskItem.classList.add('task-item');
      taskItem.setAttribute('data-task-id', taskId);

      // We have separate Select + Unselect buttons
      taskItem.innerHTML = `
          <button class="task-select">Select</button>
          <button class="task-unselect" style="display: none;">Unselect</button>
          <span class="task-name">${taskName}</span>
          <span class="task-time">0m0s</span>
          <button class="task-delete">&#10005;</button>
      `;

      // Add to DOM, clear input
      taskList.appendChild(taskItem);
      taskInput.value = '';

      // 2) TASK EVENT LISTENERS
      // (A) Select button
      const selectBtn = taskItem.querySelector('.task-select');
      selectBtn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          handleSelectTask(taskId);
      });

      // (B) Unselect button
      const unselectBtn = taskItem.querySelector('.task-unselect');
      unselectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleUnselectTask(taskId);
      });

      // (C) Checkbox to mark completed
      const checkbox = taskItem.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => {
          taskItem.querySelector('.task-name')
              .classList.toggle('completed', checkbox.checked);
      });

      // (D) Delete button
      const deleteBtn = taskItem.querySelector('.task-delete');
      deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          delete taskTimes[taskId];
          taskItem.remove();

          // If the deleted task was active, unselect it
          if (activeTaskId === taskId) {
              activeTaskId = null;
              stopActiveTaskInterval();
          }
      });
  });
  */

  // 1) ADD NEW TASKS
  addTaskButton.addEventListener('click', () => {
      const taskName = taskInput.value.trim();
      if (!taskName) {
      alert('Please enter a task name.');
      return;
      }
  
      // Make the POST request to create the task in the database
      fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: taskName })
      })
      .then(res => {
          if (!res.ok) {
          throw new Error('Failed to create task');
          }
          return res.json();
      })
      .then(data => {
          // data.task is the newly created Task from the server
          console.log('Created task:', data.task);
          // Now we call our 'renderTask(...)' function
          renderTask(data.task);
          taskInput.value = '';
      })
      .catch(err => {
          console.error(err);
          alert('Error creating task');
      });
  });

const importTodoistBtn = document.getElementById('import-todoist-btn');
const todoistTaskModal = document.getElementById('todoist-task-modal');
const todoistTaskList = document.getElementById('todoist-task-list');
const confirmImportBtn = document.getElementById('confirm-import');
const cancelImportBtn = document.getElementById('cancel-import');

if (importTodoistBtn) {
  importTodoistBtn.addEventListener('click', () => {
    fetch('/todoist/tasks')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch Todoist tasks');
        return res.json();
      })
      .then((projectsWithTasks) => {
        // Show the modal
        todoistTaskModal.style.display = 'block';
        todoistTaskList.innerHTML = ''; // Clear existing list
  
        // Iterate through each project and its tasks
        projectsWithTasks.forEach(project => {
          // Create a container for the project
          const projectContainer = document.createElement('div');
          projectContainer.classList.add('todoist-project');
  
          // Project title
          const projectTitle = document.createElement('h4');
          projectTitle.textContent = project.projectName;
          projectContainer.appendChild(projectTitle);
  
          // Tasks under the project
          const tasksContainer = document.createElement('div');
          tasksContainer.classList.add('todoist-tasks');
  
          project.tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('todoist-task-item');
  
            taskItem.innerHTML = `
              <input type="checkbox" id="${task.id}" data-title="${task.content}" />
              <label for="${task.id}">${task.content}</label>
            `;
            tasksContainer.appendChild(taskItem);
          });
  
          projectContainer.appendChild(tasksContainer);
          todoistTaskList.appendChild(projectContainer);
        });
      })
      .catch((err) => console.error('Error fetching Todoist tasks:', err));
  });  
  }

  // Handle confirm import
  confirmImportBtn.addEventListener('click', () => {
    const selectedTasks = Array.from(
      todoistTaskList.querySelectorAll('input[type="checkbox"]:checked')
    ).map((checkbox) => ({
      id: checkbox.id,
      title: checkbox.dataset.title,
    }));
  
    fetch('/todoist/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: selectedTasks }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to import tasks');
        return res.json();
      })
      .then((data) => {
        console.log('Tasks imported:', data.importedTasks);
        // Hide the modal and reload tasks
        todoistTaskModal.style.display = 'none';
        fetch('/tasks')
          .then((res) => res.json())
          .then((tasks) => {
            taskList.innerHTML = '';
            tasks.forEach((task) => {
              renderTask(task);
            });
          });
      })
      .catch((err) => console.error('Error importing tasks:', err));
  });
  

  // Handle cancel import
  cancelImportBtn.addEventListener('click', () => {
    todoistTaskModal.style.display = 'none';
  });

  function renderTask(task) {
    // Create the DOM element
    const taskItem = document.createElement('div');
    taskItem.classList.add('task-item');
    // Use the MongoDB _id
    taskItem.setAttribute('data-task-id', task._id);

    dbTimeSpent[task._id] = task.timeSpent || 0;

    // Reset local time to 0 (since we just loaded it from DB)
    localTime[task._id] = 0;

    // Assume timeSpent is in seconds from the server
    const dbMinutes = Math.floor(task.timeSpent / 60) || 0;
    const dbSeconds = (task.timeSpent % 60) || 0;

    taskItem.innerHTML = `
      <button class="task-select">Select</button>
      <button class="task-unselect" style="display: none;">Unselect</button>
      <span class="task-name">${task.title}</span>
      <!-- Local time increments while selected -->
      <span class="task-local-time">Local: 0m0s</span>

      <!-- DB total time from the server -->
      <span class="task-total-time">Total: ${dbMinutes}m${dbSeconds}s</span>
      <button class="task-delete-local">&#10005;</button> <!-- Local Delete Button -->
    `;

    taskList.appendChild(taskItem);

    // Event Listeners for Select/Unselect and Local Delete
    const selectBtn = taskItem.querySelector('.task-select');
    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSelectTask(task._id);
    });

    const unselectBtn = taskItem.querySelector('.task-unselect');
    unselectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleUnselectTask(task._id);
    });

    const deleteLocalBtn = taskItem.querySelector('.task-delete-local');
    deleteLocalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Delete the task locally
      fetch(`/tasks/${task._id}`, { method: 'DELETE' })
        .then(res => {
          if (!res.ok) throw new Error('Failed to delete task');
          taskItem.remove();
          if (activeTaskId === task._id) {
            activeTaskId = null;
            stopActiveTaskInterval();
          }
        })
        .catch(err => console.error(err));
    });

    // **Todoist Actions: Complete and Delete**
    if (task.todoistId) { // Only for tasks imported from Todoist
      // Complete Button
      const completeButton = document.createElement('button');
      completeButton.textContent = 'Complete';
      completeButton.classList.add('task-complete-todoist');
      completeButton.onclick = function() {
        fetch(`/todoist/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.todoistId }) // **Use todoistId**
        })
        .then(response => {
          if (response.ok) {
            console.log('Task completed on Todoist');
            taskItem.remove(); // Remove from the UI or update as needed
          } else {
            return response.json().then(errData => {
              throw new Error(errData.message || 'Failed to mark task as completed');
            });
          }
        })
        .catch(error => console.error('Error completing task:', error));
      };
      taskItem.appendChild(completeButton);

      // Delete Button
      const deleteTodoistButton = document.createElement('button');
      deleteTodoistButton.textContent = 'Delete from Todoist';
      deleteTodoistButton.classList.add('task-delete-todoist');
      deleteTodoistButton.onclick = function() {
        if (confirm('This will delete the task in Todoist. Continue?')) {
          fetch(`/todoist/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.todoistId }) // **Use todoistId**
          })
          .then(response => {
            if (response.ok) {
              console.log('Task deleted from Todoist');
              taskItem.remove(); // Remove from the UI
            } else {
              return response.json().then(errData => {
                throw new Error(errData.message || 'Failed to delete task');
              });
            }
          })
          .catch(error => console.error('Error deleting task:', error));
        }
      };
      taskItem.appendChild(deleteTodoistButton);
    }
  }

  /*
  function renderTask(task) {
      // Create the DOM element
      const taskItem = document.createElement('div');
      taskItem.classList.add('task-item');
      // Use the MongoDB _id
      taskItem.setAttribute('data-task-id', task._id);

      dbTimeSpent[task._id] = task.timeSpent || 0;

      // Reset local time to 0 (since we just loaded it from DB)
      localTime[task._id] = 0;
    
      // Assume timeSpent is in seconds from the server
      const dbMinutes = Math.floor(task.timeSpent / 60) || 0;
      const dbSeconds = (task.timeSpent % 60) || 0;
    
      taskItem.innerHTML = `
        <button class="task-select">Select</button>
        <button class="task-unselect" style="display: none;">Unselect</button>
        <span class="task-name">${task.title}</span>
        <!-- Local time increments while selected -->
        <span class="task-local-time">Local: 0m0s</span>

        <!-- DB total time from the server -->
        <span class="task-total-time">Total: ${dbMinutes}m${dbSeconds}s</span>
        <button class="task-delete">&#10005;</button>
        <button id="complete-${task.id}" class="task-complete">Complete</button>
        <button id="delete-${task.id}" class="task-delete">Delete</button>
      `;
    
      taskList.appendChild(taskItem);
    
      // If you still have a local dictionary for timeSpent
      //taskTimes[task._id] = task.timeSpent || 0;
    
      // Add the event listeners (select, unselect, etc.), the same
      // way you had them in your original code, but referencing `task._id`.
      const selectBtn = taskItem.querySelector('.task-select');
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSelectTask(task._id);
      });
    
      const unselectBtn = taskItem.querySelector('.task-unselect');
      unselectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleUnselectTask(task._id);
      });
    
      const deleteBtn = taskItem.querySelector('.task-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fetch(`/tasks/${task._id}`, { method: 'DELETE' })
          .then(res => {
            if (!res.ok) throw new Error('Failed to delete task');
            taskItem.remove();
            if (activeTaskId === task._id) {
              activeTaskId = null;
              stopActiveTaskInterval();
            }
          })
          .catch(err => console.error(err));
      });

      const completeButton = document.createElement('button');
      completeButton.textContent = 'Complete';
      completeButton.onclick = function() {
        fetch(`/todoist/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task._id })
        })
        .then(response => {
          if (response.ok) {
            console.log('Task completed on Todoist');
            taskItem.remove();  // Remove from the UI or update as needed
          } else {
            throw new Error('Failed to mark task as completed');
          }
        })
        .catch(error => console.error('Error completing task:', error));
      };
      taskItem.appendChild(completeButton);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.onclick = function() {
        if (confirm('This will delete the task in Todoist. Continue?')) {
          fetch(`/todoist/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task._id })
          })
          .then(response => {
            if (response.ok) {
              console.log('Task deleted from Todoist');
              taskItem.remove();  // Remove from the UI
            } else {
              throw new Error('Failed to delete task');
            }
          })
          .catch(error => console.error('Error deleting task:', error));
        }
      };
      taskItem.appendChild(deleteButton);

    }
    */

  // ------------------------------------------------------------------
  // 3) SELECT A TASK
  // ------------------------------------------------------------------
  function handleSelectTask(taskId) {
      // If main timer is running + we already have a different active task => confirm switch
      if (mainTimerRunning && activeTaskId && activeTaskId !== taskId) {
          const confirmSwitch = confirm('The timer is running. Switch to a new task?');
          if (!confirmSwitch) {
              return; 
          }
          // user said yes => stop old task’s interval
          stopActiveTaskInterval();
      }

      // If the task is already active, do nothing. (We can rely on the unselect button for unselecting.)
      if (activeTaskId === taskId) {
          return;
      }

      // Deactivate all tasks
      document.querySelectorAll('.task-item').forEach(item => {
          item.classList.remove('active');
          // Show "Select" button, hide "Unselect"
          item.querySelector('.task-select').style.display = 'inline-block';
          item.querySelector('.task-unselect').style.display = 'none';
      });

      // Activate this one
      activeTaskId = taskId;
      const selectedTask = document.querySelector(`[data-task-id="${taskId}"]`);
      selectedTask.classList.add('active');
      // Hide "Select" button, show "Unselect"
      selectedTask.querySelector('.task-select').style.display   = 'none';
      selectedTask.querySelector('.task-unselect').style.display = 'inline-block';

      // If main timer is running, start counting for the new active task
      if (mainTimerRunning) {
          startActiveTaskInterval();
      }
  }

  // ------------------------------------------------------------------
  // 4) UNSELECT A TASK
  // ------------------------------------------------------------------
  function handleUnselectTask(taskId) {
      // Only unselect if it's currently active
      if (activeTaskId !== taskId) {
          return;
      }

      // Stop counting time on this active task
      stopActiveTaskInterval();

      // (A) Update DB to store the final timeSpent
      // const updatedTime = taskTimes[activeTaskId] || 0;

      // 1) old total from DB
      const oldDB = dbTimeSpent[activeTaskId] || 0;
      // 2) localTime from this session
      const local = localTime[activeTaskId] || 0;
      // 3) new total = old + local
      const newTotal = oldDB + local;

      fetch(`/tasks/${activeTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeSpent: newTotal })
      })
      .then(res => {
          if (!res.ok) throw new Error('Failed to update timeSpent');
          return res.json();
      })
      .then(data => {
          console.log('Unselect => updated timeSpent in DB:', data.task.timeSpent);
          updateTaskTotalTime(data.task._id, data.task.timeSpent);
      })
      .catch(err => console.error(err));

      // Remove "active" styling
      const theTask = document.querySelector(`[data-task-id="${taskId}"]`);
      if (theTask) {
          theTask.classList.remove('active');
          // Switch buttons back
          theTask.querySelector('.task-select').style.display   = 'inline-block';
          theTask.querySelector('.task-unselect').style.display = 'none';
      }

      // Now we have no active tasks
      activeTaskId = null;
  }

  // ------------------------------------------------------------------
  // 5) TASK TIMER INTERVAL
  // ------------------------------------------------------------------
  /*
  function startActiveTaskInterval() {
      if (!activeTaskId) return;

      // Clear any existing interval
      stopActiveTaskInterval();

      // Start a new interval for the active task
      timerInterval = setInterval(() => {
          if (!activeTaskId) return;

          taskTimes[activeTaskId] = (taskTimes[activeTaskId] || 0) + 1;
          const activeEl = document.querySelector(`[data-task-id="${activeTaskId}"]`);
          if (activeEl) {
              const totalSec  = taskTimes[activeTaskId];
              const minutes   = Math.floor(totalSec / 60);
              const seconds   = totalSec % 60;
              const timeElem  = activeEl.querySelector('.task-time');
              timeElem.textContent = `${minutes}m${seconds}s`;
          }
      }, 1000);
  }
      */

  function startActiveTaskInterval() {
      if (!activeTaskId) return;
    
      stopActiveTaskInterval(); // Clear any existing interval
    
      timerInterval = setInterval(() => {
        if (!activeTaskId) return;
    
        localTime[activeTaskId] = (localTime[activeTaskId] || 0) + 1;
        const activeEl = document.querySelector(`[data-task-id="${activeTaskId}"]`);
        if (activeEl) {
          const totalSec  = localTime[activeTaskId];
          const minutes   = Math.floor(totalSec / 60);
          const seconds   = totalSec % 60;
          const timeElem  = activeEl.querySelector('.task-local-time');
          if (timeElem) {
            timeElem.textContent = `Local: ${minutes}m${seconds}s`;
          }
        }
      }, 1000);
    }
    

  function stopActiveTaskInterval() {
      clearInterval(timerInterval);
      timerInterval = null;
  }

/*
  // Add event listeners for completing and deleting Todoist tasks
function addTodoistTaskListeners(taskId) {
  const completeButton = document.querySelector(`#complete-${taskId}`);
  const deleteButton = document.querySelector(`#delete-${taskId}`);

  if (completeButton) {
    completeButton.addEventListener('click', () => {
      fetch('/todoist/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to complete task');
          return res.json();
        })
        .then(() => {
          console.log('Task completed on Todoist');
          // Optionally, remove the task from the UI
          document.querySelector(`[data-task-id="${taskId}"]`).remove();
        })
        .catch((err) => console.error(err));
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      fetch('/todoist/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to delete task');
          return res.json();
        })
        .then(() => {
          console.log('Task deleted from Todoist');
          // Optionally, remove the task from the UI
          document.querySelector(`[data-task-id="${taskId}"]`).remove();
        })
        .catch((err) => console.error(err));
    });
  }
}
*/


  // ------------------------------------------------------------------
  // 6) RESPOND TO MAIN TIMER EVENTS (FROM timer.js)
  // ------------------------------------------------------------------
  /*
  document.addEventListener('start-task-timer', () => {
      mainTimerRunning = true;
      // If a task is active, resume its interval
      if (activeTaskId) {
          startActiveTaskInterval();
      }
  });
  */

  document.addEventListener('start-task-timer', (e) => {
      const session = e.detail.session; // Retrieve session type from event
      if (session === 'Timer') { // Only start if it's a Timer session
          mainTimerRunning = true;
          // If a task is active, resume its interval
          if (activeTaskId) {
              startActiveTaskInterval();
          }
      }
  });


  document.addEventListener('stop-task-timer', () => {
      mainTimerRunning = false;
      // Stop counting time on the active task
      stopActiveTaskInterval();
  
      // If there's an active task, update the DB with the new timeSpent
      if (activeTaskId) {
        // 1) old total from DB
        const oldDB = dbTimeSpent[activeTaskId] || 0;
        // 2) localTime from this session
        const local = localTime[activeTaskId] || 0;
        // 3) new total = old + local
        const newTotal = oldDB + local;

        fetch(`/tasks/${activeTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeSpent: newTotal })
        })
        .then(res => {
          if (!res.ok) throw new Error('Failed to update timeSpent');
          return res.json();
        })
        .then(data => {
          console.log('Updated timeSpent in DB:', data.task.timeSpent);
          updateTaskTotalTime(data.task._id, data.task.timeSpent);
        })
        .catch(err => console.error(err));
      }
  });

  /*
  document.addEventListener('reset-task-timer', () => {
      mainTimerRunning = false;
      stopActiveTaskInterval();
      if (activeTaskId) {
          // Reset the currently active task’s time
          taskTimes[activeTaskId] = 0;
          const activeTask = document.querySelector(`[data-task-id="${activeTaskId}"]`);
          if (activeTask) {
              activeTask.querySelector('.task-time').textContent = '0m0s';
          }
      }
  });
  */

  document.addEventListener('reset-task-timer', () => {
      mainTimerRunning = false;
      stopActiveTaskInterval();
    
      if (activeTaskId) {
        // Reset the local time to 0
        taskTimes[activeTaskId] = 0;
    
        // Update the local DOM display
        const activeTask = document.querySelector(`[data-task-id="${activeTaskId}"]`);
        if (activeTask) {
          activeTask.querySelector('.task-local-time').textContent = '0m0s';
        }
    
        // **NEW**: PUT request to reset timeSpent on the server
        /*
        fetch(`/tasks/${activeTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeSpent: 0 })
        })
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to reset timeSpent in DB');
          }
          return res.json();
        })
        .then(data => {
          console.log('Successfully reset task on server:', data.task);
        })
        .catch(err => {
          console.error(err);
        });
        */
      }
    });

  // ------------------------------------------------------------------
  // 7) OPTIONAL: DRAG & DROP SORTING
  // ------------------------------------------------------------------
  /*
  new Sortable(taskList, {
      animation: 150,
      onEnd: () => {
          console.log('Tasks reordered');
      },
  });
  */

  function updateTaskTotalTime(taskId, totalSeconds) {
    const taskEl = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskEl) return;
  
    const totalTimeEl = taskEl.querySelector('.task-total-time');
    if (!totalTimeEl) return;
  
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    totalTimeEl.textContent = `Total: ${minutes}m${seconds}s`;
  }

// On page load, fetch tasks from server
// On page load, fetch tasks from server
fetch('/tasks', {
    method: 'GET',
    headers: {
    'Content-Type': 'application/json'
    }
})
.then(res => {
    if (!res.ok) {
    // If user not authenticated or error
    throw new Error('Failed to fetch tasks');
    }
    return res.json();
})
.then(tasks => {
    console.log('Tasks from server:', tasks);
    // Render each task into the DOM
    tasks.forEach(task => {
    renderTask(task);
    });
})
.catch(err => console.error(err));  
});