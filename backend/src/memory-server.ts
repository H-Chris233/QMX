// 快速启动版 - 使用内存数据库的简化后端
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

// 数据存储（内存中）
const students: any[] = [
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

const transactions: any[] = [
  {
    uid: 1,
    student_id: 1,
    amount: 1500,
    description: '收入',
    note: '月卡费用',
    is_installment: false,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    uid: 2,
    student_id: 2,
    amount: 500,
    description: '收入',
    note: '体验课费用',
    is_installment: false,
    created_at: '2025-01-02T00:00:00Z',
  },
];

let nextStudentId = 3;
let nextTransactionId = 3;

// 中间件
app.use(cors({
  origin: 'http://localhost:1420',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'QMX Backend API is running (Memory Mode)',
  });
});

// API信息
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'QMX Backend API',
    version: '1.0.0',
    status: 'running',
    mode: 'memory',
    endpoints: {
      health: '/health',
      students: '/api/v1/students',
      transactions: '/api/v1/transactions',
      dashboard: '/api/v1/dashboard',
    },
  });
});

// 学员相关接口
app.get('/api/v1/students', (req, res) => {
  const { page = 1, limit = 20, name_contains } = req.query;
  
  let filteredStudents = students;
  if (name_contains) {
    filteredStudents = students.filter(s => 
      s.name.toLowerCase().includes(String(name_contains).toLowerCase()),
    );
  }

  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      data: paginatedStudents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredStudents.length,
        total_pages: Math.ceil(filteredStudents.length / Number(limit)),
      },
    },
  });
});

app.get('/api/v1/students/search', (req, res) => {
  const { name_contains, min_age, max_age } = req.query;
  
  let filteredStudents = students;
  
  if (name_contains) {
    filteredStudents = filteredStudents.filter(s => 
      s.name.toLowerCase().includes(String(name_contains).toLowerCase()),
    );
  }
  
  if (min_age) {
    filteredStudents = filteredStudents.filter(s => s.age >= Number(min_age));
  }
  
  if (max_age) {
    filteredStudents = filteredStudents.filter(s => s.age <= Number(max_age));
  }

  res.json({
    success: true,
    data: filteredStudents,
  });
});

app.get('/api/v1/students/:id', (req, res): void => {
  const { id } = req.params;
  const student = students.find(s => s.uid === Number(id));
  
  if (!student) {
    res.status(404).json({
      success: false,
      error: '学员不存在',
    });
    return;
  }

  res.json({
    success: true,
    data: student,
  });
});

app.post('/api/v1/students', (req, res): void => {
  const { name, age, class: classType, phone, note, subject } = req.body;
  
  const newStudent = {
    uid: nextStudentId++,
    name: name || '新学员',
    age: age ? Number(age) : null,
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

  students.push(newStudent);

  console.log(`✅ 创建新学员: ${newStudent.name} (UID: ${newStudent.uid})`);

  res.status(201).json({
    success: true,
    data: newStudent,
    message: '学员创建成功',
  });
});

app.put('/api/v1/students/:id', (req, res): void => {
  const { id } = req.params;
  const studentIndex = students.findIndex(s => s.uid === Number(id));
  
  if (studentIndex === -1) {
    res.status(404).json({
      success: false,
      error: '学员不存在',
    });
    return;
  }

  const updates = req.body;
  students[studentIndex] = { ...students[studentIndex], ...updates };

  console.log(`✅ 更新学员信息: UID ${id}`);

  res.json({
    success: true,
    data: students[studentIndex],
    message: '学员信息更新成功',
  });
});

app.delete('/api/v1/students/:id', (req, res): void => {
  const { id } = req.params;
  const studentIndex = students.findIndex(s => s.uid === Number(id));
  
  if (studentIndex === -1) {
    res.status(404).json({
      success: false,
      error: '学员不存在',
    });
    return;
  }

  const deletedStudent = students.splice(studentIndex, 1)[0];

  console.log(`✅ 删除学员: ${deletedStudent.name} (UID: ${id})`);

  res.json({
    success: true,
    message: '学员删除成功',
  });
});

// 成绩管理接口
app.post('/api/v1/students/:id/scores', (req, res): void => {
  const { id } = req.params;
  const { score } = req.body;
  
  const studentIndex = students.findIndex(s => s.uid === Number(id));
  if (studentIndex === -1) {
    res.status(404).json({
      success: false,
      error: '学员不存在',
    });
    return;
  }

  students[studentIndex].rings.push(Number(score));

  console.log(`✅ 添加成绩: 学员 ${id}, 成绩 ${score}`);

  res.status(201).json({
    success: true,
    data: {
      student_uid: Number(id),
      rings: students[studentIndex].rings,
    },
    message: '成绩添加成功',
  });
});

app.get('/api/v1/students/:id/scores', (req, res): void => {
  const { id } = req.params;
  const student = students.find(s => s.uid === Number(id));
  
  if (!student) {
    res.status(404).json({
      success: false,
      error: '学员不存在',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      student_uid: Number(id),
      student_name: student.name,
      rings: student.rings,
      total_scores: student.rings.length,
      average_score: student.rings.length > 0 ? 
        Number((student.rings.reduce((sum: number, score: number) => sum + score, 0) / student.rings.length).toFixed(1)) : 0,
      max_score: student.rings.length > 0 ? Math.max(...student.rings) : 0,
      min_score: student.rings.length > 0 ? Math.min(...student.rings) : 0,
    },
  });
});

// 交易记录接口
app.get('/api/v1/transactions', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      data: paginatedTransactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: transactions.length,
        total_pages: Math.ceil(transactions.length / Number(limit)),
      },
    },
  });
});

app.post('/api/v1/transactions', (req, res): void => {
  const { student_id, amount, note, is_installment = false } = req.body;
  
  const newTransaction = {
    uid: nextTransactionId++,
    student_id: student_id ? Number(student_id) : null,
    amount: Number(amount),
    description: amount > 0 ? '收入' : '支出',
    note: note || '',
    is_installment,
    created_at: new Date().toISOString(),
  };

  transactions.push(newTransaction);

  console.log(`✅ 添加交易记录: 金额 ¥${amount}`);

  res.status(201).json({
    success: true,
    data: newTransaction,
    message: '交易记录添加成功',
  });
});

app.delete('/api/v1/transactions/:id', (req, res) => {
  const { id } = req.params;
  const transactionIndex = transactions.findIndex(t => t.uid === Number(id));
  
  if (transactionIndex === -1) {
    res.status(404).json({
      success: false,
      error: '交易记录不存在',
    });
    return;
  }

  transactions.splice(transactionIndex, 1);

  console.log(`✅ 删除交易记录: UID ${id}`);

  res.json({
    success: true,
    message: '交易记录删除成功',
  });
});

// 仪表板统计接口
app.get('/api/v1/dashboard/stats', (req, res) => {
  const totalStudents = students.length;
  const totalRevenue = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = Math.abs(
    transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0),
  );

  let totalScore = 0;
  let scoreCount = 0;
  let maxScore = 0;

  students.forEach(student => {
    if (student.rings && student.rings.length > 0) {
      student.rings.forEach((score: number) => {
        totalScore += score;
        scoreCount++;
        maxScore = Math.max(maxScore, score);
      });
    }
  });

  const averageScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;
  const activeCourses = students.filter(s => s.lesson_left && s.lesson_left > 0).length;

  res.json({
    success: true,
    data: {
      total_students: totalStudents,
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      average_score: averageScore,
      max_score: maxScore,
      active_courses: activeCourses,
    },
  });
});

// 会员管理接口
app.post('/api/v1/membership/students/:id/membership', (req, res): void => {
  const { id } = req.params;
  const { startDate, endDate } = req.body;
  
  const studentIndex = students.findIndex(s => s.uid === Number(id));
  if (studentIndex === -1) {
    res.status(404).json({
      success: false,
      error: '学员不存在',
    });
    return;
  }

  students[studentIndex].membership_start_date = startDate;
  students[studentIndex].membership_end_date = endDate;
  students[studentIndex].is_membership_active = true;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    if (now >= start && now <= end) {
      const diffTime = end.getTime() - now.getTime();
      students[studentIndex].membership_days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  console.log(`✅ 设置会员信息: 学员 ${id}`);

  res.json({
    success: true,
    data: students[studentIndex],
    message: '会员信息设置成功',
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
  console.log('📍 服务地址: http://localhost:3001');
  console.log('🔗 健康检查: http://localhost:3001/health');
  console.log('📚 API文档: http://localhost:3001/api/v1');
  console.log('✅ 内存模式已启用，数据重启后会清空');
  console.log('✅ 服务已就绪，等待前端连接...');
});