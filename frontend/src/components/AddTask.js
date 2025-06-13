import React, { useState } from 'react';
import axios from 'axios';

export default function AddTask({ tasks, onTasksReload }) {
  const [name, setName] = useState('');

  // 添加新任务
  const submit = async () => {
    if (!name.trim()) return;
    await axios.post('/api/tasks', { name: name.trim() });
    setName('');
    onTasksReload();
  };

  // 删除一个任务
  const handleDelete = async (id, taskName) => {
    if (!window.confirm(`确认删除任务「${taskName}」？`)) return;
    await axios.delete(`/api/tasks/${id}`);
    onTasksReload();
  };

  // 清空所有打卡数据
  const handleClearData = async () => {
    if (!window.confirm('确认清空所有 Sample Data？此操作不可逆！')) return;
    await axios.delete('/api/clear_data');
    onTasksReload();
    alert('已清空所有打卡记录。');
  };

  return (
    <div style={{ margin: '15px 0' }}>
      <button
        onClick={handleClearData}
        style={{ marginBottom: 12, color: 'white', background: 'red', padding: '6px 12px', border: 'none', cursor: 'pointer' }}
      >
        清空所有打卡数据
      </button>

      <h4>添加新任务</h4>
      <input
        type="text"
        placeholder="新任务名称"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ padding: '6px', width: 200, marginRight: 8 }}
      />
      <button onClick={submit} style={{ padding: '6px 12px' }}>
        添加任务
      </button>

      <h4 style={{ marginTop: 20 }}>当前任务列表</h4>
      {tasks.length === 0 && <p>暂无任务。</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map(t => (
          <li key={t.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{t.name}</span>
            <button
              onClick={() => handleDelete(t.id, t.name)}
              style={{ marginLeft: 8, color: 'white', background: '#d33', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
