export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/data' && request.method === 'GET') {
      try {
        const rawData = await env.BUTLER_DB.get('butler_data');
        const data = rawData ? JSON.parse(rawData) : null;
        return new Response(JSON.stringify(data || { tasks: [], history: {} }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (url.pathname === '/api/data' && request.method === 'POST') {
      try {
        const body = await request.json();
        await env.BUTLER_DB.put('butler_data', JSON.stringify(body));
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response(HTML_CONTENT, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>智能管家個人面板</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #f8fafc;
      --card-bg: #ffffff;
      --accent: #3b82f6;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: #e2e8f0;
      --radius: 20px;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
    html, body { width: 100vw; height: 100vh; overflow: hidden; background-color: var(--bg-primary); color: var(--text-main); }
    .app-frame { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; }
    .container { padding: 30px; flex: 1; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
    .butler-header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 24px 30px; border-radius: var(--radius); display: flex; justify-content: space-between; align-items: center; }
    .btn-speech { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 10px 18px; border-radius: 12px; cursor: pointer; font-size: 0.9rem; }
    .grid-hub { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .hub-card { background: var(--card-bg); border-radius: var(--radius); padding: 25px; box-shadow: var(--shadow); cursor: pointer; transition: 0.2s; }
    .hub-card:hover { transform: translateY(-3px); border: 1px solid var(--accent); }
    .card-icon { width: 45px; height: 45px; border-radius: 12px; background: #eff6ff; color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 12px; }
    .page-view { display: none; background: var(--card-bg); border-radius: var(--radius); padding: 30px; box-shadow: var(--shadow); }
    .page-view.active { display: block; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color); }
    .btn-back { background: #f1f5f9; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; }
    .task-layout { display: flex; gap: 20px; align-items: flex-start; }
    .task-main-col { flex: 1; }
    .history-frame { width: 0px; opacity: 0; overflow: hidden; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 16px; padding: 0px; transition: all 0.3s ease; }
    .history-frame.open { width: 380px; opacity: 1; padding: 20px; }
    .task-input-group { display: flex; gap: 10px; margin-bottom: 15px; }
    .task-input-group input { flex: 1; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 10px; outline: none; }
    .task-input-group button { background: var(--accent); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .task-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .task-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--border-color); }
    .task-item.completed span { text-decoration: line-through; color: var(--text-muted); }
    .task-actions { display: flex; align-items: center; gap: 12px; }
    .btn-delete { background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1rem; opacity: 0.7; transition: opacity 0.2s; }
    .btn-delete:hover { opacity: 1; }
    
    .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: 600; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; }
    .calendar-weekday { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; padding-bottom: 5px; }
    .calendar-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; font-size: 0.9rem; cursor: pointer; background: white; border: 1px solid var(--border-color); position: relative; }
    .calendar-day:hover { background: #eff6ff; border-color: var(--accent); }
    .calendar-day.selected { background: var(--accent); color: white; border-color: var(--accent); }
    .calendar-day.empty { background: transparent; border: none; cursor: default; }
    .dot { width: 5px; height: 5px; background: #10b981; border-radius: 50%; margin-top: 2px; }
    .calendar-day.selected .dot { background: #fff; }
    
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 15px; }
    .cat-media-card { aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: #e2e8f0; }
    .cat-media-card img { width: 100%; height: 100%; object-fit: cover; }
    
    .ambient-overlay { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: #090d16; color: #ffffff; z-index: 999; display: flex; flex-direction: column; justify-content: center; align-items: center; opacity: 0; pointer-events: none; transition: opacity 0.8s ease; padding: 40px; text-align: center; }
    .ambient-overlay.active { opacity: 1; pointer-events: auto; }
    .ambient-clock { font-size: 6rem; font-weight: 300; letter-spacing: -2px; margin-bottom: 10px; color: #fff; }
    .ambient-date { font-size: 1.5rem; color: #94a3b8; margin-bottom: 30px; }
  </style>
</head>
<body>
  <div class="app-frame">
    <div class="ambient-overlay" id="ambientOverlay" onclick="wakeUp()">
      <div class="ambient-clock" id="ambientClock">12:00:00</div>
      <div class="ambient-date" id="ambientDate">2026年10月26日</div>
      <div style="font-size: 0.9rem; color: #64748b;">點擊畫面任意處喚醒管家</div>
    </div>
    <div class="container">
      <div class="butler-header">
        <div>
          <h1 id="greetingText" style="font-size: 1.5rem; margin-bottom: 4px;">🤖 早安，主人</h1>
          <p id="butlerSummary" style="color: #94a3b8; font-size: 0.9rem;">載入雲端數據中...</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-speech" onclick="triggerIdleNow()">🌙 測試閒置</button>
          <button class="btn-speech" onclick="speakButlerSummary()">🔊 語音簡報</button>
        </div>
      </div>
      <div id="homePage">
        <div class="grid-hub">
          <div class="hub-card" onclick="showPage('taskPage')">
            <div class="card-icon">✅</div>
            <h3>每日 Task List</h3>
            <p>記錄運動、練琴等每日習慣進度與過往記錄</p>
          </div>
          <div class="hub-card" onclick="showPage('catPage')">
            <div class="card-icon">🐱</div>
            <h3>主子影音牆</h3>
            <p>記錄貓咪的日常照片與可愛影片</p>
          </div>
          <div class="hub-card" style="opacity: 0.5; cursor: default;">
            <div class="card-icon">📊</div>
            <h3>習慣數據統計</h3>
            <p>（預留模組）</p>
          </div>
          <div class="hub-card" style="opacity: 0.5; cursor: default;">
            <div class="card-icon">⚙️</div>
            <h3>管家系統設定</h3>
            <p>（預留模組）</p>
          </div>
        </div>
      </div>
      <div id="taskPage" class="page-view">
        <div class="page-header">
          <h2 id="taskPageTitle">✅ 每日任務 Task List (今天)</h2>
          <div style="display: flex; gap: 10px;">
            <button class="btn-back" onclick="toggleHistoryFrame()" style="background:#eff6ff; color:var(--accent);">📅 過往記錄</button>
            <button class="btn-back" onclick="showPage('homePage')">← 返回主頁</button>
          </div>
        </div>
        <div class="task-layout">
          <div class="task-main-col">
            <div class="task-input-group" id="taskInputGroup">
              <input type="text" id="newTaskInput" placeholder="輸入新的每日習慣...">
              <button onclick="addTask()">新增任務</button>
            </div>
            <ul class="task-list" id="taskListContainer"></ul>
          </div>
          <div class="history-frame" id="historyFrame">
            <div class="calendar-header">
              <button onclick="changeMonth(-1)" style="border:none; background:none; cursor:pointer; font-size:1rem;">◀</button>
              <span id="calendarTitle">2026年 10月</span>
              <button onclick="changeMonth(1)" style="border:none; background:none; cursor:pointer; font-size:1rem;">▶</button>
            </div>
            <div class="calendar-grid" id="calendarGrid"></div>
            <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
              <h4 id="selectedDateTitle" style="font-size: 0.95rem; margin-bottom: 8px; color: var(--text-main);">選擇日期檢視記錄</h4>
              <div id="selectedDateTasks" style="font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px;">請點擊上方日曆中的日期</div>
            </div>
          </div>
        </div>
      </div>
      <div id="catPage" class="page-view">
        <div class="page-header">
          <h2>🐱 貓咪照片 & 影片牆</h2>
          <button class="btn-back" onclick="showPage('homePage')">← 返回主頁</button>
        </div>
        <div class="cat-grid">
          <div class="cat-media-card"><img src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80"></div>
          <div class="cat-media-card"><img src="https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&q=80"></div>
          <div class="cat-media-card"><img src="https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80"></div>
        </div>
      </div>
    </div>
  </div>
  <script>
    let todayStr = getFormattedDate(new Date());
    let selectedDateStr = todayStr; // 目前檢視或操作的日子

    let tasks = [
      { id: 1, text: '今日運動打卡 🏋️', completed: false },
      { id: 2, text: '練琴 30 分鐘 🎹', completed: false },
      { id: 3, text: '閱讀 20 頁書 📚', completed: false }
    ];
    let historyRecords = {}; // 格式: { '2026-10-26': [...] }

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    const IDLE_TIMEOUT = 600000;
    let idleTimer;

    async function init() {
      await loadCloudData();
      
      // 確保今天的歷史紀錄初始化
      if (!historyRecords[todayStr]) {
        historyRecords[todayStr] = JSON.parse(JSON.stringify(tasks));
      } else {
        tasks = historyRecords[todayStr];
      }

      updateGreeting();
      renderTasks();
      renderCalendar();
      updateButlerSummary();
      startClockUpdates();
      resetIdleTimer();

      ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, true);
      });
    }

    async function loadCloudData() {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          if (data.history) historyRecords = data.history;
          if (data.tasks && data.tasks.length > 0) tasks = data.tasks;
        }
      } catch (err) { console.log(err); }
    }

    async function saveCloudData() {
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, history: historyRecords })
        });
      } catch (err) { console.log(err); }
    }

    function getFormattedDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        document.getElementById('ambientOverlay').classList.add('active');
      }, IDLE_TIMEOUT);
    }

    function triggerIdleNow() { document.getElementById('ambientOverlay').classList.add('active'); }
    function wakeUp() { document.getElementById('ambientOverlay').classList.remove('active'); resetIdleTimer(); }

    function startClockUpdates() {
      setInterval(() => {
        const now = new Date();
        document.getElementById('ambientClock').innerText = now.toTimeString().split(' ')[0];
        document.getElementById('ambientDate').innerText = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
      }, 1000);
    }

    function updateGreeting() {
      const hour = new Date().getHours();
      let greeting = '早安，主人 ☀️';
      if (hour >= 12 && hour < 18) greeting = '下午好，主人 ☕';
      else if (hour >= 18) greeting = '晚上好，主人 🌙';
      document.getElementById('greetingText').innerText = greeting;
    }

    function showPage(pageId) {
      document.getElementById('homePage').style.display = pageId === 'homePage' ? 'block' : 'none';
      document.getElementById('taskPage').classList.toggle('active', pageId === 'taskPage');
      document.getElementById('catPage').classList.toggle('active', pageId === 'catPage');
      
      if (pageId === 'taskPage') {
        // 回到任務頁面時自動回到今天
        selectCalendarDate(todayStr);
      }
    }

    function toggleHistoryFrame() {
      document.getElementById('historyFrame').classList.toggle('open');
    }

    function renderTasks() {
      const container = document.getElementById('taskListContainer');
      container.innerHTML = '';

      const isToday = (selectedDateStr === todayStr);

      tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item ' + (task.completed ? 'completed' : '');
        
        let checkboxHtml = `<input type="checkbox" style="width:20px;height:20px;cursor:pointer;" ${task.completed ? 'checked' : ''} ${!isToday ? 'disabled title="過往紀錄無法修改"' : ''} onchange="toggleTask(${task.id})">`;
        let deleteHtml = isToday ? `<button class="btn-delete" onclick="deleteTask(${task.id})" title="刪除活動">🗑️</button>` : '';

        li.innerHTML = `
          <span>${task.text}</span>
          <div class="task-actions">
            ${checkboxHtml}
            ${deleteHtml}
          </div>
        `;
        container.appendChild(li);
      });

      // 標題顯示目前是哪一天
      const titleEl = document.getElementById('taskPageTitle');
      const inputGroup = document.getElementById('taskInputGroup');
      if (isToday) {
        titleEl.innerText = '✅ 每日任務 Task List (今天)';
        inputGroup.style.display = 'flex';
      } else {
        titleEl.innerText = `📅 歷史紀錄 (${selectedDateStr})`;
        inputGroup.style.display = 'none'; // 歷史日不能新增任務
      }

      // 儲存當天狀態
      historyRecords[selectedDateStr] = JSON.parse(JSON.stringify(tasks));
      saveCloudData();
      renderCalendar();
      updateButlerSummary();
    }

    function toggleTask(id) {
      if (selectedDateStr !== todayStr) return; // 嚴格防護：不是今天就不准改
      tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      renderTasks();
    }

    function addTask() {
      if (selectedDateStr !== todayStr) return;
      const input = document.getElementById('newTaskInput');
      if (!input.value.trim()) return;
      tasks.push({ id: Date.now(), text: input.value.trim(), completed: false });
      input.value = '';
      renderTasks();
    }

    function deleteTask(id) {
      if (selectedDateStr !== todayStr) return;
      if (confirm('確定要刪除這個活動嗎？')) {
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
      }
    }

    function renderCalendar() {
      const grid = document.getElementById('calendarGrid');
      const title = document.getElementById('calendarTitle');
      grid.innerHTML = '';
      title.innerText = currentYear + '年 ' + (currentMonth + 1) + '月';

      ['日', '一', '二', '三', '四', '五', '六'].forEach(w => {
        grid.innerHTML += '<div class="calendar-weekday">' + w + '</div>';
      });

      const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
      const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

      for (let i = 0; i < firstDayIndex; i++) {
        grid.innerHTML += '<div class="calendar-day empty"></div>';
      }

      for (let day = 1; day <= totalDays; day++) {
        const mStr = String(currentMonth + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const dateStr = currentYear + '-' + mStr + '-' + dStr;

        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day ' + (dateStr === selectedDateStr ? 'selected' : '');
        dayDiv.innerHTML = '<span>' + day + '</span>';

        const dayRecord = historyRecords[dateStr];
        if (dayRecord && dayRecord.some(t => t.completed)) {
          dayDiv.innerHTML += '<div class="dot"></div>';
        }

        dayDiv.onclick = () => selectCalendarDate(dateStr);
        grid.appendChild(dayDiv);
      }
    }

    function changeMonth(direction) {
      currentMonth += direction;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar();
    }

    function selectCalendarDate(dateStr) {
      selectedDateStr = dateStr;
      renderCalendar();

      // 如果點選的日期在 historyRecords 裡沒有紀錄，給它一個預設空陣列或複製今天的模板
      if (!historyRecords[dateStr]) {
        if (dateStr === todayStr) {
          historyRecords[dateStr] = JSON.parse(JSON.stringify(tasks));
        } else {
          historyRecords[dateStr] = []; // 過去沒打卡過就是空的
        }
      }

      tasks = historyRecords[dateStr];
      renderTasks();
    }

    function updateButlerSummary() {
      const completed = tasks.filter(t => t.completed).length;
      document.getElementById('butlerSummary').innerText = `今日習慣完成進度：${completed} / ${tasks.length} 項。`;
    }

    function speakButlerSummary() {
      const text = document.getElementById('greetingText'].innerText + '。' + document.getElementById('butlerSummary').innerText;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW';
      window.speechSynthesis.speak(utterance);
    }

    window.onload = init;
  </script>
</body>
</html>