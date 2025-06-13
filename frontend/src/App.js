import React, { useEffect, useState } from 'react';
import axios from 'axios';

import DailyTasks from './components/DailyTasks';
import AddTask    from './components/AddTask';
import Stats      from './components/Stats';
import Archive    from './components/Archive';

function App() {
  const [tasks, setTasks]         = useState([]);
  const [doneToday, setDoneToday] = useState([]);
  const [weekly, setWeekly]       = useState([]);
  const [info, setInfo]           = useState({ date:'', lunar:'', weather:'', fortune:'' });
  const [page, setPage]           = useState('daily');

  // 加载所有必要数据
  const loadAll = async () => {
    try {
      const infoRes  = await axios.get('/api/current_info');
      const tasksRes = await axios.get('/api/tasks');
      const today    = infoRes.data.date;
      const dailyRes = await axios.get(`/api/daily_records?date=${today}`);
      const weekRes  = await axios.get('/api/weekly_records');

      setInfo(infoRes.data);
      setTasks(tasksRes.data.tasks);
      setDoneToday(dailyRes.data.done_tasks);
      setWeekly(weekRes.data.weekly);
    } catch (err) {
      console.error('加载数据失败', err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // 切换打卡状态
  const toggleTask = async (taskId, done) => {
    await axios.post('/api/daily_records', { date: info.date, task_id: taskId, done });
    setDoneToday(dt => done ? [...dt, taskId] : dt.filter(id=>id!==taskId));
    const weekRes = await axios.get('/api/weekly_records');
    setWeekly(weekRes.data.weekly);
  };

  // 添加任务后重载
  const addTask = async name => {
    await axios.post('/api/tasks', { name });
    loadAll();
  };

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'sans-serif' }}>
      {/* 侧边栏，顺序：每日打卡 → 记录 → 任务管理 → 档案 */}
      <nav style={{
        width: 120,
        borderRight: '1px solid #ddd',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        {[
          ['daily',   '每日打卡'],
          ['stats',   '记录'],
          ['add',     '任务管理'],
          ['archive','档案']
        ].map(([key,label]) => (
          <div
            key={key}
            onClick={() => setPage(key)}
            style={{
              marginBottom: 12,
              cursor: 'pointer',
              color: page===key ? 'blue' : 'black'
            }}
          >{label}</div>
        ))}
      </nav>

      {/* 主区 */}
      <main style={{ flex:1, padding:'20px', overflowY:'auto' }}>
        <h2>每日任务打卡 MVP</h2>
        <div style={{ marginBottom:16, borderBottom:'1px solid #ccc', paddingBottom:8 }}>
          <div><strong>日期：</strong>{info.date}</div>
          <div><strong>农历：</strong>{info.lunar}</div>
          <div><strong>天气：</strong>{info.weather}</div>
          <div><strong>运势：</strong>{info.fortune}</div>
        </div>

        {page === 'daily'   && <DailyTasks tasks={tasks} doneToday={doneToday} weekly={weekly} onToggle={toggleTask} />}
        {page === 'stats'   && <Stats     weekly={weekly}    tasks={tasks} />}
        {page === 'add'     && <AddTask   tasks={tasks}      onTasksReload={loadAll} />}
        {page === 'archive' && <Archive />}
      </main>
    </div>
  );
}

export default App;
