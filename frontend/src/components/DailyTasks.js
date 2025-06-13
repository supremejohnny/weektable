import React from 'react';

export default function DailyTasks({ tasks, doneToday, weekly, onToggle }) {
  return (
    <div>
      <h3>今日打卡</h3>
      {tasks.length === 0 && <p>暂无任务，请先添加。</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map(t => {
          const checked = doneToday.includes(t.id);
          return (
            <li key={t.id} style={{ marginBottom: 6 }}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => onToggle(t.id, e.target.checked)}
                />
                {' '}{t.name}
              </label>
            </li>
          );
        })}
      </ul>

      <h3>本周汇总</h3>
      {weekly.length === 0 && <p>暂无本周数据。</p>}
      {weekly.length > 0 && (
        <table
          style={{ borderCollapse: 'collapse', width: '100%', marginTop: 10 }}
          border="1"
          cellPadding="6"
        >
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <th>星期</th>
              {tasks.map(t => <th key={t.id}>{t.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {weekly.map(row => (
              <tr key={row.date}>
                <td>{row.day}</td>
                {tasks.map(t => (
                  <td key={t.id} style={{ textAlign: 'center' }}>
                    {row[`task_${t.id}`] ? '✓' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
