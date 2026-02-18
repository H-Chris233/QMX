// 简化版后端服务器 - 用于快速测试
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// 中间件
app.use(cors({
  origin: 'http://localhost:1420',
  credentials: true,
}));
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'QMX Backend API is running',
  });
});

// API路由
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'QMX Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      students: '/api/v1/students',
      transactions: '/api/v1/transactions',
      dashboard: '/api/v1/dashboard',
    },
  });
});

// 模拟学员数据
app.get('/api/v1/students', (req, res) => {
  const mockStudents = [
    {
      uid: 1,
      name: '张三',
      age: 18,
      class: 'Month',
      subject: 'Shooting',
      phone: '13800138001',
      rings: [8.5, 9.0, 8.8],
      note: '进步很快',
      lesson_left: 10,
      membership_start_date: '2025-01-01',
      membership_end_date: '2025-01-31',
      is_membership_active: true,
      membership_days_remaining: 30,
      cash: 1500,
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      uid: 2,
      name: '李四',
      age: 20,
      class: 'TenTry',
      subject: 'Archery',
      phone: '13800138002',
      rings: [7.5, 8.0],
      note: '需要练习稳定性',
      lesson_left: 5,
      membership_start_date: null,
      membership_end_date: null,
      is_membership_active: false,
      membership_days_remaining: null,
      cash: 500,
      created_at: '2025-01-02T00:00:00Z',
    },
  ];

  res.json({
    success: true,
    data: {
      data: mockStudents,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
      },
    },
  });
});

// 模拟仪表板统计
app.get('/api/v1/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      total_students: 2,
      total_revenue: 2000,
      total_expense: 100,
      average_score: 8.3,
      max_score: 9.0,
      active_courses: 2,
    },
  });
});

// 模拟添加学员
app.post('/api/v1/students', (req, res) => {
  const { name, age, class: classType, phone, note, subject } = req.body;
  
  const newStudent = {
    uid: Date.now(), // 临时使用时间戳作为ID
    name: name || '新学员',
    age: age || null,
    class: classType || 'Others',
    subject: subject || 'Others',
    phone: phone || '未填写',
    rings: [],
    note: note || '',
    lesson_left: null,
    membership_start_date: null,
    membership_end_date: null,
    is_membership_active: false,
    membership_days_remaining: null,
    cash: 0,
    created_at: new Date().toISOString(),
  };

  console.log('创建新学员:', newStudent);

  res.status(201).json({
    success: true,
    data: newStudent,
    message: '学员创建成功',
  });
});

// 模拟添加成绩
app.post('/api/v1/students/:id/scores', (req, res) => {
  const { id } = req.params;
  const { score } = req.body;

  console.log(`为学员 ${id} 添加成绩: ${score}`);

  res.status(201).json({
    success: true,
    data: {
      student_uid: parseInt(id),
      rings: [score],
      message: `成功为学员添加成绩 ${score}`,
    },
    message: '成绩添加成功',
  });
});

// 错误处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 QMX后端服务启动成功！');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
  console.log(`📚 API文档: http://localhost:${PORT}/api/v1`);
  console.log('✅ 服务已就绪，等待前端连接...');
});