import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

export default function Archive() {
  const [years, setYears] = useState([]);
  const [year, setYear] = useState('');
  const [monthData, setMonthData] = useState({});
  const [tasks, setTasks] = useState([]);
  const [popup, setPopup] = useState(null);
  const hideTimer = useRef(null);

  // 加载年列表与任务
  useEffect(() => {
    axios.get('/api/monthly/archives')
      .then(res => {
        const months = res.data.archives;
        const ys = Array.from(new Set(months.map(m => m.slice(0,4)))).sort((a,b)=>b-a);
        if (ys.length === 0) ys.push(String(new Date().getFullYear()));
        setYears(ys);
        if (ys.length) setYear(ys[0]);
      });
    axios.get('/api/tasks')
      .then(res => setTasks(res.data.tasks));
  }, []);

  // 加载指定年份的12个月数据
  useEffect(() => {
    if (!year) return;
    const months = Array.from({length:12}, (_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
    Promise.all(
      months.map(m =>
        axios.get(`/api/monthly_records?month=${m}`)
          .then(res => [m, res.data.days])
      )
    ).then(arr => {
      const data = {};
      arr.forEach(([m,days]) => { data[m] = days; });
      setMonthData(data);
    });
  }, [year]);

  // 根据 days 数组生成周视图
  const buildWeeks = days => {
    const weeks = [];
    if (days.length) {
      const firstDow = new Date(days[0].date).getDay();
      let week = Array(7).fill(null);
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
      if (week.some(x => x !== null)) weeks.push(week);
    }
    return weeks;
  };

  const getEmoji = cell => {
    if (!cell) return '';
    if (cell.done_count === 0) return '😠';
    if (cell.done_count === cell.total_count) return '😇';
    return '😄';
  };

  return (
    <div>
      <h3>历史签到档案（按年）</h3>
      <div style={{ marginBottom:16 }}>
        {years.map(y => (
          <button
            key={y}
            onClick={() => setYear(y)}
            style={{
              marginRight:8,
              padding:'4px 10px',
              background: y===year ? '#1890ff' : '#eee',
              color: y===year ? '#fff' : '#000',
              border:'none',
              cursor:'pointer'
            }}
          >{y}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
        {Array.from({length:12}, (_,i)=>{
          const m = `${year}-${String(i+1).padStart(2,'0')}`;
          const days = monthData[m] || [];
          const weeks = buildWeeks(days);
          return (
            <div key={m} style={{ border:'1px solid #ccc', padding:4 }}>
              <div style={{ textAlign:'center', fontWeight:'bold', marginBottom:4 }}>{m}</div>
              <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
                <thead>
                  <tr>
                    {['一','二','三','四','五','六','日'].map(d => (
                      <th key={d} style={{ padding:2 }}>周{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week,wi)=>(
                    <tr key={wi}>
                      {week.map((cell,ci)=>(
                        <td
                          key={ci}
                          style={{ width:20, height:20, textAlign:'center', cursor: cell ? 'pointer' : 'default', border:'1px solid #eee' }}
                          title={cell ? tasks.map(t => `${t.name} ${cell.statuses[t.id] ? '√' : '×'}`).join('\n') : ''}
                          onClick={e => {
                            if (!cell) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setPopup({
                              cell,
                              x: rect.left + window.scrollX + rect.width/2,
                              y: rect.top + window.scrollY
                            });
                            if (hideTimer.current) clearTimeout(hideTimer.current);
                            hideTimer.current = setTimeout(() => setPopup(null), 2000);
                          }}
                        >
                          {getEmoji(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {popup && (
        <div style={{
          position:'absolute',
          left: popup.x - 140,
          top: popup.y + 40,
          transform:'translate(-50%, -100%)',
          background:'#fff',
          border:'1px solid #ccc',
          boxShadow:'0 2px 6px rgba(0,0,0,0.2)',
          padding:6,
          zIndex:1000,
          whiteSpace:'nowrap'
        }}>
          {popup.cell.done_count + '/' + popup.cell.total_count}
          {tasks.map(t => (
            <div key={t.id}>{t.name} {popup.cell.statuses[t.id] ? '√' : '×'}</div>
          ))}
        </div>
      )}
    </div>
  );
}
