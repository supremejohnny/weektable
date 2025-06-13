from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import date, timedelta, datetime
from sqlalchemy import func
from lunar_python import Solar

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

# --- 模型 ---
class Task(db.Model):
    __tablename__ = 'tasks'
    id   = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)

class DailyRecord(db.Model):
    __tablename__ = 'daily_records'
    id      = db.Column(db.Integer, primary_key=True)
    date    = db.Column(db.Date, nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    __table_args__ = (
        db.UniqueConstraint('date', 'task_id', name='_date_task_uc'),
    )

class WeeklyRecord(db.Model):
    __tablename__ = 'weekly_records'
    id              = db.Column(db.Integer, primary_key=True)
    week_start      = db.Column(db.Date, nullable=False, unique=True)
    tasks_total     = db.Column(db.Integer, nullable=False)
    tasks_completed = db.Column(db.Integer, nullable=False)

with app.app_context():
    db.create_all()

# --- Helpers ---
def get_lunar_str(dt: date) -> str:
    solar = Solar.fromYmd(dt.year, dt.month, dt.day)
    lunar = solar.getLunar()
    return str(lunar)

# --- 接口 ---
@app.route('/api/current_info', methods=['GET'])
def current_info():
    today = date.today()
    return jsonify({
        'date': today.isoformat(),
        'lunar': get_lunar_str(today),
        'weather': '晴，25°C',
        'fortune': '宜踏实努力，心想事成'
    })

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.order_by(Task.id).all()
    return jsonify({ 'tasks': [{'id': t.id, 'name': t.name} for t in tasks] })

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': '任务名称不能为空'}), 400

    # 重复校验：不区分大小写
    exists = Task.query.filter(db.func.lower(Task.name) == name.lower()).first()
    if exists:
        return jsonify({'error': f'任务“{name}”已存在，不能重复添加'}), 400

    t = Task(name=name)
    db.session.add(t)
    db.session.commit()
    return jsonify({'task': {'id': t.id, 'name': t.name}}), 201

# --- 删除任务及其所有打卡记录 ---
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task_by_id(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': '任务不存在'}), 404

    # 先删打卡记录
    from sqlalchemy import delete
    db.session.execute(
        delete(DailyRecord).where(DailyRecord.task_id == task_id)
    )
    # 再删任务本身
    db.session.delete(task)
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/daily_records', methods=['GET'])
def list_daily():
    ds = request.args.get('date')
    try:
        d = date.fromisoformat(ds)
    except:
        return jsonify({ 'error': '日期参数缺失或格式错误' }), 400
    recs = DailyRecord.query.filter_by(date=d).all()
    return jsonify({ 'done_tasks': [r.task_id for r in recs] })

@app.route('/api/daily_records', methods=['POST'])
def update_daily():
    data = request.get_json()
    try:
        d   = date.fromisoformat(data['date'])
        tid = int(data['task_id'])
        done= bool(data['done'])
    except:
        return jsonify({ 'error': '参数解析失败' }), 400
    rec = DailyRecord.query.filter_by(date=d, task_id=tid).first()
    if done:
        if not rec:
            db.session.add(DailyRecord(date=d, task_id=tid))
    else:
        if rec:
            db.session.delete(rec)
    db.session.commit()
    return jsonify({ 'ok': True })

@app.route('/api/weekly_records', methods=['GET'])
def get_weekly():
    # 不变，本周或指定 week_start
    ws = request.args.get('week_start')
    if ws:
        monday = date.fromisoformat(ws)
    else:
        today = date.today()
        monday= today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    tasks = Task.query.order_by(Task.id).all()
    recs  = DailyRecord.query.filter(
        DailyRecord.date>=monday, DailyRecord.date<=sunday
    ).all()
    done_set = {(r.date, r.task_id) for r in recs}

    week = []
    labels = ['周一','周二','周三','周四','周五','周六','周日']
    for i, lbl in enumerate(labels):
        d = monday + timedelta(days=i)
        row = {'day':lbl, 'date':d.isoformat()}
        for t in tasks:
            row[f'task_{t.id}'] = ((d, t.id) in done_set)
        week.append(row)

    # 存库
    total = len(tasks)*7
    comp  = len(done_set)
    wr = WeeklyRecord.query.filter_by(week_start=monday).first()
    if wr:
        wr.tasks_total, wr.tasks_completed = total, comp
    else:
        db.session.add(WeeklyRecord(
            week_start=monday,
            tasks_total=total,
            tasks_completed=comp
        ))
    db.session.commit()

    return jsonify({ 'weekly': week })

# 新增：月份档案列表
@app.route('/api/monthly/archives', methods=['GET'])
def monthly_archives():
    # 提取 distinct YYYY-MM
    rows = db.session.query(
        func.strftime('%Y-%m', DailyRecord.date).label('ym')
    ).distinct().all()
    months = sorted({r.ym for r in rows}, reverse=True)
    return jsonify({ 'archives': months })

# 新增：获取指定月的每日完成率与详情
@app.route('/api/monthly_records', methods=['GET'])
def monthly_records():
    ms = request.args.get('month')  # 格式 YYYY-MM
    try:
        dt = datetime.strptime(ms, '%Y-%m')
        first = date(dt.year, dt.month, 1)
    except:
        return jsonify({ 'error': 'month 参数缺失或格式错误' }), 400
    # 下个月第一天
    if dt.month == 12:
        nxt = date(dt.year+1, 1, 1)
    else:
        nxt = date(dt.year, dt.month+1, 1)

    tasks = Task.query.order_by(Task.id).all()
    recs  = DailyRecord.query.filter(
        DailyRecord.date>=first,
        DailyRecord.date< nxt
    ).all()
    # 按天聚合
    day_map = {}  # date -> set(task_id)
    for r in recs:
        day_map.setdefault(r.date, set()).add(r.task_id)

    # 总任务数
    total_tasks = len(tasks)
    days = []
    cur = first
    while cur < nxt:
        done_set = day_map.get(cur, set())
        statuses = {t.id: (t.id in done_set) for t in tasks}
        days.append({
            'date': cur.isoformat(),
            'done_count': len(done_set),
            'total_count': total_tasks,
            'statuses': statuses
        })
        cur += timedelta(days=1)
    return jsonify({ 'month': ms, 'days': days })

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': '任务不存在'}), 404
    # 先删除所有关联的打卡记录
    DailyRecord.query.filter_by(task_id=task_id).delete()
    # 再删除任务本身
    db.session.delete(task)
    db.session.commit()
    return jsonify({'ok': True})

# 2) 清空所有 Sample Data（所有每日和周度记录）
@app.route('/api/clear_data', methods=['DELETE'])
def clear_data():
    # 删除所有 daily 和 weekly 记录
    DailyRecord.query.delete()
    WeeklyRecord.query.delete()
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/daily_records/all', methods=['GET'])
def all_daily_records():
    recs = DailyRecord.query.all()
    return jsonify(
        [ {'date': r.date.isoformat(), 'task_id': r.task_id} for r in recs ]
    )

if __name__ == '__main__':
    app.run(debug=True)