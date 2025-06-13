import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Archive() {
  const [months, setMonths] = useState([]);
  const [sel, setSel]      = useState(null);
  const [days, setDays]     = useState([]);
  const [tasks, setTasks]   = useState([]);

  // 加载月份档案列表 & 任务
  useEffect(() => {
    axios.get('/api/monthly/archives')
      .then(res => {
        setMonths(res.data.archives);
        if (res.data.archives.length) setSel(res.data.archives[0]);
      });
    axios.get('/api/tasks')
      .then(res => setTasks(res.data.tasks));
  }, []);

  // 加载所选月份数据
  useEffect(() => {
    if (!sel) return;
    axios.get(`/api/monthly_records?month=${sel}`)
      .then(res => setDays(res.data.days));
  }, [sel]);

  // 生成日历格子二维数组 (周一~周日)
  const weeks = [];
  if (days.length) {
    // 确定第一天星期几 (0=Sun,1=Mon…)
    const firstDow = new Date(days[0].date).getDay();
    let week = Array(7).fill(null);
    // 从 Monday=1 映射
    let idx = firstDow === 0 ? 6 : firstDow - 1;
    days.forEach(d => {
      week[idx] = d;
      idx++;
      if (idx === 7) {
        weeks.push(week);
        week = Array(7).fill(null);
        idx = 0;
      }
    });
    if (week.some(x=>x!==null)) weeks.push(week);
  }

  return (
    <div>
      <h3>历史签到档案（按月）</h3>
      <div style={{ marginBottom:16 }}>
        {months.map(m => (
          <button key={m}
                  onClick={()=>setSel(m)}
                  style={{
                    marginRight:8, padding:'4px 10px',
                    background: m===sel?'#1890ff':'#eee',
                    color:    m===sel?'#fff':'#000',
                    border:'none', cursor:'pointer'
                  }}
          >{m}</button>
        ))}
      </div>

      {weeks.length>0 && (
        <table style={{ borderCollapse:'collapse', width:'100%' }} border="1">
          <thead>
            <tr style={{ background:'#f4f4f4' }}>
              {['一','二','三','四','五','六','日'].map(d => (
                <th key={d} style={{ padding:6 }}>周{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell, ci) => (
                  <td key={ci} style={{ height:80, verticalAlign:'top', padding:4 }}
                      title={
                        cell
                          ? tasks.map(t => `${t.name} ${cell.statuses[t.id]? '√':'×'}`).join('\n')
                          : ''
                      }
                  >
                    {cell
                      ? `${cell.done_count}/${cell.total_count}`
                      : ''
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {weeks.length===0 && <p>该月暂无数据。</p>}
    </div>
  );
}