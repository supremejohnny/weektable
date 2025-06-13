# sample_data.py

import requests
from datetime import date, timedelta
import random

API = 'http://localhost:5000'

def main():
    # 1. 添加三个任务
    names = ['学英语', '跑步', '吃水果']
    task_ids = []
    # 先清理已有同名任务（可选）
    # 再创建
    for name in names:
        r = requests.post(f"{API}/api/tasks", json={'name': name})
        if r.status_code == 201:
            task_ids.append(r.json()['task']['id'])
    # 如果已经存在则从列表中拷贝
    if len(task_ids) < 3:
        r = requests.get(f"{API}/api/tasks")
        for t in r.json()['tasks']:
            if t['name'] in names and t['id'] not in task_ids:
                task_ids.append(t['id'])

    # 2. 生成最近30天的随机打卡记录
    today = date.today()
    start = today - timedelta(days=29)
    for i in range(30):
        d = start + timedelta(days=i)
        for tid in task_ids:
            done = random.choice([True, False])
            requests.post(
                f"{API}/api/daily_records",
                json={'date': d.isoformat(), 'task_id': tid, 'done': done}
            )
    print("✅ Sample data 插入完成！")

if __name__ == '__main__':
    main()
