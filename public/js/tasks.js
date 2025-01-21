document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  //const taskInput = document.getElementById('task-input');
  //const addTaskButton = document.getElementById('add-task-button');
  const taskList = document.getElementById('task-list');

  // New "Add Task" popup elements
  const addTaskBtn       = document.getElementById('add-task-btn');
  const addTaskPopup     = document.getElementById('add-task-popup');
  const cancelBtn        = document.getElementById('cancel-btn');
  const addTaskConfirmBtn= document.getElementById('add-task-confirm-btn');
  const newTaskInput     = document.getElementById('new-task-input');

  new Sortable(document.getElementById('task-list'), {
    animation: 150,
    ghostClass: 'bg-gray-200', // or any class you want
    onEnd: () => {
      console.log('Tasks reordered');
      // If you want to persist order to DB, handle here
    },
  });
  

  // Active task tracking
  window.activeTaskId = null;
  const taskTimes = {}; // { taskId: numberOfSeconds }

  //const tasksMenuTrigger = document.getElementById('tasks-menu-trigger');

  // Timer interval for the active task
  let timerInterval = null;

  // Whether the main (global) timer is running
  let mainTimerRunning = false;

  // **NEW** Two dictionaries to keep track of DB total vs. local:
  window.dbTimeSpent = {};   // { taskId: numberOfSeconds from the DB }
  window.localTime = {};     // { taskId: numberOf extra seconds accumulated locally }
  

  // 1) ADD NEW TASKS
  /*
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
  */

// Show/hide popup
addTaskBtn.addEventListener('click', () => {
  addTaskPopup.classList.toggle('hidden');
});

cancelBtn.addEventListener('click', () => {
  addTaskPopup.classList.add('hidden');
  newTaskInput.value = '';
});

addTaskConfirmBtn.addEventListener('click', () => {
  const taskName = newTaskInput.value.trim();
  if (!taskName) {
    alert('Please enter a task name.');
    return;
  }
  // This calls your existing POST /tasks logic:
  fetch('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: taskName })
  })
  .then(res => {
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  })
  .then(data => {
    console.log('Created task:', data.task);
    renderTask(data.task);
    newTaskInput.value = '';
    addTaskPopup.classList.add('hidden');
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

// In tasks.js, somewhere after DOMContentLoaded:
const tasksMenuTrigger = document.getElementById('tasks-menu-trigger');

// Make sure tasksMenuTrigger exists in the DOM
if (tasksMenuTrigger) {
  tasksMenuTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    // If there's already a menu, remove it
    const oldMenu = document.getElementById('tasks-popup-menu');
    if (oldMenu) oldMenu.remove();

    // Build a new menu <div>
    const menu = document.createElement('div');
    menu.id = 'tasks-popup-menu';
    menu.className = `
      absolute top-10 right-0 bg-white text-black border border-gray-300 
      rounded shadow-md text-sm z-10 p-2 w-40
    `;

    // 1) Check if user is logged in
    let isLoggedIn = false;
    try {
      const sessionRes = await fetch('/check-session');
      const sessionData = await sessionRes.json();
      isLoggedIn = sessionData.loggedIn === true;
    } catch (err) {
      console.error('Error checking session:', err);
    }

    // 2) If not logged in => no Todoist
    if (!isLoggedIn) {
      // We'll just show "Connect to Todoist" as an example
      const mustLoginItem = document.createElement('div');
      mustLoginItem.textContent = 'Connect to Todoist';
      mustLoginItem.className = 'cursor-pointer hover:bg-gray-100 px-2 py-1';
      mustLoginItem.addEventListener('click', () => {
        alert('Please log in first!');
      });
      menu.appendChild(mustLoginItem);
    } else {
      // 3) If logged in => do a quick GET /todoist/tasks
      //    If 200 => we’re connected, else 400 => not connected
      let isConnected = false;
      try {
        const todoistRes = await fetch('/todoist/tasks');
        if (todoistRes.ok) {
          // If it returned tasks => definitely connected
          isConnected = true;
        } else if (todoistRes.status === 400) {
          // "User is not connected" is what your code does
          isConnected = false;
        }
        // We don’t actually use the tasks data here.
      } catch (error) {
        console.error('Error fetching /todoist/tasks:', error);
      }

      if (!isConnected) {
        // Show a single option: "Connect to Todoist" => calls /todoist/connect
        const connectItem = document.createElement('div');
        connectItem.textContent = 'Connect to Todoist';
        connectItem.className = 'cursor-pointer hover:bg-gray-100 px-2 py-1';
        connectItem.addEventListener('click', () => {
          // Just redirect to /todoist/connect
          // The callback will redirect back to /index.html 
          // (once you remove the old “Todoist connected” page)
          window.location.href = '/todoist/connect';
        });
        menu.appendChild(connectItem);
      } else {
        // Already connected => show "Import from Todoist"
        const importItem = document.createElement('div');
        importItem.textContent = 'Import from Todoist';
        importItem.className = 'cursor-pointer hover:bg-gray-100 px-2 py-1';
        importItem.addEventListener('click', () => {
          importTodoist(); // We'll define this function below
          menu.remove(); // Hide the menu
        });
        menu.appendChild(importItem);
      }
    }

    // Insert menu into the DOM
    tasksMenuTrigger.parentNode.appendChild(menu);

    // If user clicks anywhere else, remove the menu
    document.addEventListener('click', function docListener() {
      menu.remove();
      document.removeEventListener('click', docListener);
    }, { once: true });
  });
}

// Helper function to import tasks + show the modal
function importTodoist() {
  fetch('/todoist/tasks')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch Todoist tasks');
      return res.json();
    })
    .then((projectsWithTasks) => {
      const todoistTaskModal = document.getElementById('todoist-task-modal');
      todoistTaskModal.style.display = 'block';

      const todoistTaskList = document.getElementById('todoist-task-list');
      todoistTaskList.innerHTML = '';

      projectsWithTasks.forEach(project => {
        const projectContainer = document.createElement('div');
        projectContainer.classList.add('todoist-project');

        const projectTitle = document.createElement('h4');
        projectTitle.textContent = project.projectName;
        projectContainer.appendChild(projectTitle);

        const tasksContainer = document.createElement('div');
        tasksContainer.classList.add('todoist-tasks');

        project.tasks.forEach(task => {
          const taskItem = document.createElement('div');
          taskItem.classList.add('todoist-task-item');
          // Allow wrapping
          taskItem.style.whiteSpace = 'normal';
          taskItem.style.wordBreak = 'break-word';

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
  */

  function renderTask(task) {
    // Create outer container
    const taskItem = document.createElement('div');
    // Some Tailwind classes for styling:
    taskItem.className = `
      task-item bg-white p-4 rounded-lg shadow-md flex justify-between items-center 
      cursor-pointer relative
    `;
    // We store the MongoDB _id
    taskItem.setAttribute('data-task-id', task._id);
  
    // Initialize DB vs. local time
    dbTimeSpent[task._id] = task.timeSpent || 0;
    localTime[task._id]    = 0;
  
    // Convert total timeSpent to minutes/seconds for display
    const dbMin = Math.floor(task.timeSpent / 60);
    const dbSec = task.timeSpent % 60;
  
    // We'll build the inner HTML:
    // Left side: check icon + task name
    // Right side: local time + total time + 3-dots
    taskItem.innerHTML = `
      <div class="flex items-center">
        <!-- A “check-circle” icon, can be replaced with your own logic -->
        <i class="fas fa-check-circle text-gray-400"></i>
        <!-- If name is too long, we can add .truncate or a max-width style -->
        <span class="ml-2 text-gray-700 font-semibold task-name" 
              style="max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${task.title}
        </span>
      </div>
      <div class="flex items-center space-x-3">
        <span class="task-local-time text-blue-600 text-sm">Local: 0m0s</span>
        <span class="task-total-time text-gray-500 text-sm">
          Total: ${dbMin}m${dbSec}s
        </span>
        <!-- 3-dots menu trigger -->
        <i class="fas fa-ellipsis-v text-gray-400 cursor-pointer three-dots-menu"></i>
      </div>
    `;
  
    // Append to the #task-list
    taskList.appendChild(taskItem);
  
    // *** (1) Click to toggle selection/unselection
    taskItem.addEventListener('click', (e) => {
      // If the user clicked the 3-dots icon, we don't want to toggle select
      if (e.target.classList.contains('three-dots-menu')) {
        return; 
      }
      if (activeTaskId === task._id) {
        // if it's currently active, unselect
        handleUnselectTask(task._id);
      } else {
        handleSelectTask(task._id);
      }
    });
  
    // *** (2) 3-dots menu: create a small popup or dropdown
    const threeDotsIcon = taskItem.querySelector('.three-dots-menu');
    threeDotsIcon.addEventListener('click', (e) => {
      e.stopPropagation(); // so it doesn't toggle selection
  
      // Build a simple menu
      const menu = document.createElement('div');
      menu.className = `
        absolute top-10 right-4 bg-white border border-gray-300 
        rounded shadow-md text-sm z-10 p-2
      `;
      
      // Common actions
      const deleteLocal = document.createElement('div');
      deleteLocal.textContent = 'Delete locally';
      deleteLocal.className = 'cursor-pointer hover:bg-gray-100 px-2 py-1';
      deleteLocal.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // do your local delete fetch -> then remove from DOM
        fetch(`/tasks/${task._id}`, { method: 'DELETE' })
          .then(res => {
            if(!res.ok) throw new Error('Failed to delete');
            taskItem.remove();
            if (activeTaskId === task._id) {
              activeTaskId = null;
              stopActiveTaskInterval();
            }
          })
          .catch(console.error);
        menu.remove();
      });
      menu.appendChild(deleteLocal);
  
      if (task.todoistId) {
        // *** It's a Todoist task => "Complete" and "Delete from Todoist"
        const complete = document.createElement('div');
        complete.textContent = 'Mark as completed';
        complete.className = 'cursor-pointer hover:bg-gray-100 px-2 py-1';
        complete.addEventListener('click', (ev) => {
          ev.stopPropagation();
          fetch('/todoist/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.todoistId })
          })
          .then(res => {
            if(!res.ok) throw new Error('Failed to complete in Todoist');
            // remove from UI or visually mark as done
            taskItem.remove();
          })
          .catch(console.error);
          menu.remove();
        });
        menu.appendChild(complete);
  
        const deleteTodoist = document.createElement('div');
        deleteTodoist.textContent = 'Delete from Todoist';
        deleteTodoist.className = 'cursor-pointer hover:bg-gray-100 px-2 py-1';
        deleteTodoist.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if(!confirm('Delete from Todoist?')) return;
          fetch('/todoist/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.todoistId })
          })
          .then(res => {
            if(!res.ok) throw new Error('Failed to delete from Todoist');
            taskItem.remove();
          })
          .catch(console.error);
          menu.remove();
        });
        menu.appendChild(deleteTodoist);
      } else {
        // *** Non‐Todoist => rename option
        const rename = document.createElement('div');
        rename.textContent = 'Rename';
        rename.className = 'cursor-pointer hover:bg-gray-100 px-2 py-1';
        rename.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const newName = prompt('Enter new task name:', task.title);
          if(newName && newName.trim() !== '') {
            fetch(`/tasks/${task._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newName.trim() })
            })
            .then(res => {
              if(!res.ok) throw new Error('Failed to rename task');
              return res.json();
            })
            .then(updated => {
              // Update UI
              taskItem.querySelector('.task-name').textContent = updated.task.title;
            })
            .catch(console.error);
          }
          menu.remove();
        });
        menu.appendChild(rename);
      }
  
      // Attach to the DOM
      taskItem.appendChild(menu);
  
      // If user clicks outside, remove the menu
      document.addEventListener('click', function docListener() {
        menu.remove();
        document.removeEventListener('click', docListener);
      }, { once: true });
    });
  }
  

  // ------------------------------------------------------------------
  // 3) SELECT A TASK
  // ------------------------------------------------------------------

  function handleSelectTask(taskId) {
    // If main timer is running + we have a different active task => confirm switch
    if (mainTimerRunning && activeTaskId && activeTaskId !== taskId) {
      const confirmSwitch = confirm('Timer is running. Switch tasks?');
      if (!confirmSwitch) return;
      stopActiveTaskInterval();
    }
  
    if (activeTaskId === taskId) return; // already active
  
    // Deactivate old
    if (activeTaskId) {
      handleUnselectTask(activeTaskId);
    }
  
    activeTaskId = taskId;
    // add a black left border or something to highlight
    const selectedTask = document.querySelector(`[data-task-id="${taskId}"]`);
    //selectedTask.classList.add('selected'); 
    selectedTask.style.borderLeft = '4px solid black'; // or any style you want
    selectedTask.classList.add('selected-task');
  
    if (mainTimerRunning) {
      startActiveTaskInterval();
    }
  }
  
  /*
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
  */

  // ------------------------------------------------------------------
  // 4) UNSELECT A TASK
  // ------------------------------------------------------------------
  function handleUnselectTask(taskId) {
    if (activeTaskId !== taskId) return;
  
    // Stop counting time on this active task
    stopActiveTaskInterval();
  
    // Update DB for final timeSpent
    const oldDB = dbTimeSpent[taskId] || 0;
    const local = localTime[taskId] || 0;
    const newTotal = oldDB + local;
    fetch(`/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeSpent: newTotal })
    })
    .then(res => {
      if(!res.ok) throw new Error('Failed to update timeSpent');
      return res.json();
    })
    .then(data => {
      console.log('Unselect => updated DB timeSpent:', data.task.timeSpent);
      updateTaskTotalTime(taskId, data.task.timeSpent);
    })
    .catch(console.error);
  
    // remove highlight
    const taskEl = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskEl) {
      taskEl.classList.remove('selected-task');
      taskEl.style.borderLeft = 'none';
    }
  
    activeTaskId = null;
  }
  /*
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
  */

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

  window.startActiveTaskInterval = function startActiveTaskInterval() {
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
    

    window.stopActiveTaskInterval = function stopActiveTaskInterval() {
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

  window.updateTaskTotalTime = function updateTaskTotalTime(taskId, totalSeconds) {
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