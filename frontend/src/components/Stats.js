// src/components/Stats.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Stats({ weekly, tasks }) {
  const [allRecords, setAllRecords] = useState([]);

  // 拉取所有打卡记录
  useEffect(() => {
    axios.get('/api/daily_records/all')
      .then(res => setAllRecords(res.data))
      .catch(err => console.error('获取全部记录失败', err));
  }, []);

  // 全局坚持天数：去重后的日期数
  const uniqueDays = new Set(allRecords.map(r => r.date)).size;
  // 全局完成总项：总记录条目数
  const totalDoneGlobal = allRecords.length;

  // 本周坚持天数 & 本周完成总数，复用 weekly prop
  const daysThisWeek = weekly.filter(day =>
    tasks.some(t => day[`task_${t.id}`])
  ).length;
  const totalThisWeek = weekly.reduce((sum, day) =>
    sum + tasks.reduce((s,t) =>
      s + (day[`task_${t.id}`] ? 1 : 0)
    ,0)
  ,0);

  return (
    <div>
      <h3>记录</h3>
      <p>
        从开始到现在，你坚持了 <strong>{uniqueDays}</strong> 天，完成了 <strong>{totalDoneGlobal}</strong> 项任务。
      </p>
      <p>
        本周你坚持了 <strong>{daysThisWeek}</strong> 天，完成了 <strong>{totalThisWeek}</strong> 项任务。
      </p>
    </div>
  );
}
