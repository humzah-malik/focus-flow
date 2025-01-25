// public/js/stats.js (FINAL MODIFIED VERSION)

// We'll store a local "frozen" object for tasks that once appeared in the chart.
let frozenTasks = JSON.parse(localStorage.getItem('frozenTasks')) || {};

// Always generate a consistent array of the last 7 calendar days
function getPast7Days() {
  // Oldest first. We'll gather them in an array
  const days = [];
  const now = new Date();

  // We'll go from 6 days ago up to today (0 days ago)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d);
  }
  return days;
}

// Return a label like "Mon 01-25"
function formatDayLabel(dateObj) {
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const dayName = dayNames[dateObj.getDay()];
  
  // month and date with leading zeros if needed
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day   = String(dateObj.getDate()).padStart(2, '0');

  return `${dayName} ${month}-${day}`;
}

window.loadWeeklyStats = async function() {
  try {
    const res = await fetch('/stats/weekly', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Not logged in or error fetching stats');
    }
    const data = await res.json();
    console.log('Weekly Stats:', data);

    /**
     * data.dailyData => e.g. [ { date:"YYYY-MM-DD", totalDuration: <sec> }, ... ]
     * data.topTasks  => e.g. [ { title:"SomeTask", duration: <sec> }, ... ]
     * data.tasksUsed => e.g. [ { title:"SomeTask", duration: <sec> }, ... all used tasks ]
     */

    // 1) Build the "7 days" array and fill usage from dailyData
    buildDayChart(data.dailyData);

    // 2) Build the "frozen" tasks array for the pie chart
    const combinedPieData = buildFrozenTasks(data.topTasks);

    // 3) Build pie chart with that combined data
    buildTopTasksPie(combinedPieData);

    // 4) Merge aggregator tasks + frozen tasks for table
    const combinedUsedData = combineFrozenAndUsed(data.tasksUsed);

    // 5) Show the table of tasks used
    buildTasksUsedTable(combinedUsedData);

  } catch (error) {
    console.error('Error loading weekly stats:', error);
    const tasksDiv = document.getElementById('weekly-tasks');
    if (tasksDiv) {
      tasksDiv.innerHTML = '<p class="text-red-400">Unable to load stats. Are you logged in?</p>';
    }
  }
};

/**
 * buildDayChart(dailyData)
 * - X-axis = the past 7 days (fixed).
 * - Y-axis = dynamic. We show “hr” labels on the ticks & tooltips.
 *   (No forced max or stepSize, so even small usage will display a bar.)
 * 
 * CHANGED: This reverts to the dynamic Y-axis approach, 
 *          but still uses your "7-day" logic for the labels.
 */
// REPLACE your entire buildDayChart function with this snippet
function buildDayChart(dailyData) {
    const usageMap = {};
    dailyData.forEach(d => {
      usageMap[d.date] = (d.totalDuration / 3600); // real number in hours
    });
  
    const daysArray = getPast7Days(); // your function that returns 7 Date objects
    const labels = daysArray.map(d => formatDayLabel(d)); // "Mon 01-25" etc.
    
    // Build hoursData, but store real numbers
    const hoursData = daysArray.map(d => {
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth()+1).padStart(2,'0');
      const dd   = String(d.getDate()).padStart(2,'0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      return usageMap[dateStr] ? usageMap[dateStr] : 0; 
    });
  
    if (window.dayChartInstance) {
      window.dayChartInstance.destroy();
    }
    const ctx = document.getElementById('dayChart').getContext('2d');
    window.dayChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Hours Focused',
          data: hoursData,  // numeric array
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }]
      },
      options: {
        responsive: false,
        scales: {
          y: {
            beginAtZero: true,    // dynamic top 
            ticks: {
              callback: function(value) {
                return value + ' hr';
              }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                // e.g. "Hours Focused: 0.06 hr"
                return context.dataset.label + ': ' + context.parsed.y + ' hr';
              }
            }
          }
        }
      }
    });
  }   

/**
 * Merge the newly fetched topTasks with the local "frozenTasks" object.
 * If a task is new or updated, we store that in frozenTasks.
 * If a task is missing (deleted from DB), we keep the old value from frozenTasks.
 */
function buildFrozenTasks(latestTopTasks) {
  // example shape of `frozenTasks` in localStorage:
  // { "Hello": 120, "OldTask": 300, ... }  // durations in seconds

  latestTopTasks.forEach(t => {
    const title = t.title;
    const newDuration = t.duration; // in seconds
    // Always set the newDuration (the DB is authoritative while it's not deleted)
    frozenTasks[title] = newDuration;
  });

  // Save to localStorage
  localStorage.setItem('frozenTasks', JSON.stringify(frozenTasks));

  // Convert to an array for the pie chart
  const result = Object.keys(frozenTasks).map(title => {
    return { title, duration: frozenTasks[title] };
  });
  return result;
}

/**
 * combineFrozenAndUsed(tasksUsedFromServer)
 * Merges aggregator data with our local "frozenTasks" so the table 
 * also shows "deleted" tasks that once existed, at their last-known total.
 */
function combineFrozenAndUsed(tasksUsedFromServer) {
  // tasksUsedFromServer => e.g. [ { title:"Hello", duration:120 }, ...]
  // frozenTasks => e.g. { "Hello":120, "Old Task":300 }

  // 1) Convert the frozenTasks object => array
  const frozenArr = Object.keys(frozenTasks).map(title => {
    return { title, duration: frozenTasks[title] };
  });

  // 2) Create a map so we can easily update or add
  const frozenMap = {};
  frozenArr.forEach(t => {
    frozenMap[t.title] = t.duration;
  });

  // 3) For each aggregator item, update if it’s bigger or new
  tasksUsedFromServer.forEach(srv => {
    if (!frozenMap[srv.title] || srv.duration > frozenMap[srv.title]) {
      frozenMap[srv.title] = srv.duration;
    }
  });

  // 4) Convert back to an array
  const finalArr = [];
  for (const title in frozenMap) {
    finalArr.push({ title, duration: frozenMap[title] });
  }

  // 5) Sort descending by duration if you like
  finalArr.sort((a,b) => b.duration - a.duration);

  return finalArr;
}

/**
 * Build the Pie Chart from the "combinedPieData"
 * (which merges old/deleted tasks with new ones).
 * 
 * CHANGED: We filter out "No Task Selected" so it doesn’t show in the chart.
 */
function buildTopTasksPie(combinedData) {
  const ctx = document.getElementById('taskChart').getContext('2d');
  if (window.taskChartInstance) {
    window.taskChartInstance.destroy();
  }

  // ADDED: filter out "No Task Selected" from the array
  const filtered = combinedData.filter(t => t.title !== "No Task Selected");

  // Prepare labels/durations
  const labels = filtered.map(t => t.title);
  const durationsInMinutes = filtered.map(t => (t.duration / 60).toFixed(1));

  window.taskChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Minutes',
        data: durationsInMinutes,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#AA66CC', '#99CC00'
        ],
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

/**
 * Build the tasks used table.
 * 
 * If you also want to skip "No Task Selected" here, 
 * uncomment the optional filter line.
 */
function buildTasksUsedTable(tasksUsed) {
  const container = document.getElementById('weekly-tasks');
  if (!container) return;

  // OPTIONAL: to skip "No Task Selected" in the table
  tasksUsed = tasksUsed.filter(t => t.title !== "No Task Selected");

  container.innerHTML = '';
  if (!tasksUsed || tasksUsed.length === 0) {
    container.innerHTML = '<p>No tasks logged this week</p>';
    return;
  }

  let html = `
    <h3 class="text-xl mb-2">All Tasks This Week</h3>
    <table class="min-w-full text-sm text-left">
      <thead class="bg-gray-700">
        <tr>
          <th class="px-2 py-1">Task</th>
          <th class="px-2 py-1">Time (minutes)</th>
        </tr>
      </thead>
      <tbody class="bg-gray-800">
  `;
  tasksUsed.forEach(t => {
    const minutes = (t.duration / 60).toFixed(1);
    html += `
      <tr>
        <td class="border-b border-gray-600 px-2 py-1">${t.title}</td>
        <td class="border-b border-gray-600 px-2 py-1">${minutes} min</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}
