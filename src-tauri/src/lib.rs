// src-tauri/src/lib.rs
use tauri::{WindowBuilder};
use qmx_backend_lib::{database, student, cash};
use qmx_backend_lib::init::init;
use qmx_backend_lib::save::save;
use student::{Person, Class, Student};
use cash::{Cash, PaymentFrequency, InstallmentStatus};
use std::sync::Mutex;
use serde::Serialize;
use std::sync::OnceLock;
use chrono::{DateTime, Utc};

// 全局数据库实例 - 使用 Mutex 保证线程安全
static DB: OnceLock<Mutex<Option<database::Database>>> = OnceLock::new();

// 初始化数据库
fn init_database() -> Result<(), String> {
    // 仅初始化一次，后续调用直接返回
    if DB.get().is_none() {
        match init() {
            Ok(database) => {
                DB.get_or_init(|| Mutex::new(Some(database)));
                Ok(())
            },
            Err(e) => Err(format!("初始化后端失败: {}", e))
        }
    } else {
        Ok(())
    }
}

fn get_db() -> Result<database::Database, String> {
    // 获取 OnceLock 中的 Mutex
    let db_mutex = DB.get().ok_or("数据库未初始化")?;
    
    // 锁定 Mutex 并克隆数据库实例
    let db_guard = db_mutex.lock().map_err(|e| format!("获取数据库锁失败: {}", e))?;
    db_guard.clone().ok_or("数据库未初始化".to_string())
}

// 保存数据库到全局状态
fn save_db(db: database::Database) -> Result<(), String> {
    // 获取 OnceLock 中的 Mutex
    let db_mutex = DB.get().ok_or("数据库未初始化")?;
    
    // 锁定 Mutex 并更新数据库实例
    let mut db_guard = db_mutex.lock().map_err(|e| format!("获取数据库锁失败: {}", e))?;
    *db_guard = Some(db);
    Ok(())
}

// 窗口管理命令
#[tauri::command]
fn open_main_window(app: tauri::AppHandle) {
    let _ = WindowBuilder::new(&app, "main")
        .title("启明星管理系统")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .center()
        .build();
}

// 学员管理命令
#[tauri::command]
fn add_student(name: String, age: u8, class_type: String, phone: String, note: String) -> Result<StudentResponse, String> {
    init_database()?;
    
    let class = match class_type.as_str() {
        "TenTry" => Class::TenTry,
        "Month" => Class::Month,
        "Year" => Class::Year,
        _ => Class::Others,
    };
    
    let mut person = Person::new();
    person.set_name(name)
         .set_age(age)
         .set_class(class)
         .set_phone(phone.clone())
         .set_note(note.clone());
    
    let mut db = get_db()?;
    db.student.insert(person.clone());
    
    save(db.clone()).map_err(|e| format!("保存失败: {}", e))?;
    save_db(db)?;
    
    Ok(StudentResponse {
        uid: person.uid(),
        name: person.name().to_string(),
        age: person.age(),
        class: format!("{:?}", person.class()),
        phone: person.phone().to_string(),
        note: person.note().to_string(),
    })
}

#[tauri::command]
fn get_all_students() -> Result<Vec<StudentResponse>, String> {
    init_database()?;
    
    let db = get_db()?;
    let mut students = Vec::new();
    
    for (uid, person) in db.student.iter() {
        students.push(StudentResponse {
            uid: *uid,
            name: person.name().to_string(),
            age: person.age(),
            class: format!("{:?}", person.class()),
            phone: person.phone().to_string(),
            note: person.note().to_string(),
        });
    }
    
    Ok(students)
}

#[tauri::command]
fn add_score(student_uid: u64, score: f64) -> Result<(), String> {
    init_database()?;
    
    let mut db = get_db()?;
    if let Some(person) = db.student.student_data.get_mut(&student_uid) {
        person.add_ring(score);
        
        save(db.clone()).map_err(|e| format!("保存分数失败: {}", e))?;
        
        save_db(db)?;
        
        Ok(())
    } else {
        Err("学员不存在".to_string())
    }
}

#[tauri::command]
fn get_student_scores(student_uid: u64) -> Result<StudentScoresResponse, String> {
    init_database()?;
    
    let db = get_db()?;
    if let Some(person) = db.student.get(&student_uid) {
        Ok(StudentScoresResponse {
            rings: person.rings().clone(),
        })
    } else {
        Err("学员不存在".to_string())
    }
}

#[tauri::command]
fn update_student_info(student_uid: u64, name: Option<String>, age: Option<u8>, class_type: Option<String>, phone: Option<String>, note: Option<String>) -> Result<(), String> {
    init_database()?;
    
    let mut db = get_db()?;
    if let Some(person) = db.student.student_data.get_mut(&student_uid) {
        if let Some(name) = name {
            person.set_name(name);
        }
        if let Some(age) = age {
            person.set_age(age);
        }
        if let Some(class_type) = class_type {
            let class = match class_type.as_str() {
                "TenTry" => Class::TenTry,
                "Month" => Class::Month,
                "Year" => Class::Year,
                _ => Class::Others,
            };
            person.set_class(class);
        }
        if let Some(phone) = phone {
            person.set_phone(phone);
        }
        
        if let Some(note) = note {
            person.set_note(note);
        }
        
        save(db.clone()).map_err(|e| format!("更新学员信息失败: {}", e))?;
        save_db(db)?;
        
        Ok(())
    } else {
        Err("学员不存在".to_string())
    }
}

#[tauri::command]
fn delete_student(student_uid: u64) -> Result<(), String> {
    init_database()?;
    
    let mut db = get_db()?;
    if db.student.student_data.remove(&student_uid).is_some() {
        save(db.clone()).map_err(|e| format!("删除学员失败: {}", e))?;
        
        save_db(db)?;
        
        Ok(())
    } else {
        Err("学员不存在".to_string())
    }
}

// 财务管理命令
[tauri::command]
fn add_cash_transaction(
    student_uid: Option<u64>,
    amount: i64,
    note: Option<String>,
    is_installment: Option<bool>,
    total_amount: Option<i64>,
    total_installments: Option<u32>,
    frequency: Option<String>,
    due_date: Option<String>,
    current_installment: Option<u32>,
    plan_id: Option<u64>,
) -> Result<TransactionResponse, String> {
    init_database()?;
    
    let mut db = get_db()?;
    
    let cash = if is_installment.unwrap_or(false) {
        // 创建分期付款
        let total_amount = total_amount.ok_or("分期付款需要指定总金额")?;
        let total_installments = total_installments.ok_or("分期付款需要指定总期数")?;
        let current_installment = current_installment.unwrap_or(1);
        let due_date_str = due_date.ok_or("分期付款需要指定到期日期")?;
        
        // 解析日期字符串
        let due_date = DateTime::parse_from_rfc3339(&due_date_str)
            .map_err(|e| format!("日期格式错误: {}", e))?
            .with_timezone(&Utc);
        
        // 解析付款频率
        let frequency_enum = match frequency.as_deref() {
            Some("Weekly") => PaymentFrequency::Weekly,
            Some("Monthly") => PaymentFrequency::Monthly,
            Some("Quarterly") => PaymentFrequency::Quarterly,
            Some(custom) if custom.starts_with("Custom") => {
                let days = custom.trim_start_matches("Custom")
                    .parse()
                    .map_err(|_| "自定义频率格式错误，应为Custom<天数>")?;
                PaymentFrequency::Custom(days)
            },
            _ => PaymentFrequency::Monthly, // 默认月度
        };
        
        Cash::new_installment(
            student_uid,
            total_amount,
            total_installments,
            frequency_enum,
            due_date,
            current_installment,
            plan_id,
        )
    } else {
        // 创建普通付款
        let mut cash = Cash::new(student_uid);
        cash.set_cash(amount);
        cash.set_note(note.clone());
        cash
    };
    
    db.cash.insert(cash.clone());
    
    save(db.clone()).map_err(|e| format!("保存交易记录失败: {}", e))?;
    save_db(db)?;
    
    // 构建响应
    let (is_installment, plan_id, current, total, due_date_str, status_str) = 
        if let Some(installment) = &cash.installment {
            (
                true,
                Some(installment.plan_id),
                Some(installment.current_installment),
                Some(installment.total_installments),
                Some(installment.due_date.to_rfc3339()),
                Some(format!("{:?}", installment.status)),
            )
        } else {
            (false, None, None, None, None, None)
        };
    
    Ok(TransactionResponse {
        uid: cash.uid,
        student_id: cash.student_id,
        amount: cash.cash,
        note: cash.note.clone(),
        description: if is_installment {
            format!("分期付款 {}/{}", current.unwrap(), total.unwrap())
        } else {
            "普通付款".to_string()
        },
        is_installment,
        installment_plan_id: plan_id,
        installment_current: current,
        installment_total: total,
        installment_due_date: due_date_str,
        installment_status: status_str,
    })
}

#[tauri::command]
fn get_all_transactions() -> Result<Vec<TransactionResponse>, String> {
    init_database()?;
    
    let db = get_db()?;
    let mut transactions = Vec::new();
    
    for (_, cash) in db.cash.iter() {
        let (is_installment, plan_id, current, total, due_date_str, status_str) = 
            if let Some(installment) = &cash.installment {
                (
                    true,
                    Some(installment.plan_id),
                    Some(installment.current_installment),
                    Some(installment.total_installments),
                    Some(installment.due_date.to_rfc3339()),
                    Some(format!("{:?}", installment.status)),
                )
            } else {
                (false, None, None, None, None, None)
            };
        
        transactions.push(TransactionResponse {
            uid: cash.uid,
            student_id: cash.student_id,
            amount: cash.cash,
            note: cash.note.clone(),
            description: if is_installment {
                format!("分期付款 {}/{}", current.unwrap(), total.unwrap())
            } else {
                "普通付款".to_string()
            },
            is_installment,
            installment_plan_id: plan_id,
            installment_current: current,
            installment_total: total,
            installment_due_date: due_date_str,
            installment_status: status_str,
        });
    }
    
    Ok(transactions)
}

#[tauri::command]
fn delete_cash_transaction(transaction_uid: u64) -> Result<(), String> {
    init_database()?;
    
    let mut db = get_db()?;
    if db.cash.cash_data.remove(&transaction_uid).is_some() {
        save(db.clone()).map_err(|e| format!("删除交易记录失败: {}", e))?;
        
        save_db(db)?;
        
        Ok(())
    } else {
        Err("交易记录不存在".to_string())
    }
}

// 统计命令
#[tauri::command]
fn get_dashboard_stats() -> Result<DashboardStatsResponse, String> {
    init_database()?;
    
    let db = get_db()?;
    let dashboard_stats = qmx_backend_lib::get_dashboard_stats(&db.student, &db.cash)
        .map_err(|e| format!("获取仪表盘统计失败: {}", e))?;
    
    Ok(DashboardStatsResponse {
        total_students: dashboard_stats.total_students,
        total_revenue: dashboard_stats.total_revenue,
        total_expense: dashboard_stats.total_expense,
        average_score: dashboard_stats.average_score,
        max_score: dashboard_stats.max_score,
        active_courses: dashboard_stats.active_courses,
    })
}

#[tauri::command]
fn update_installment_status(transaction_uid: u64, status: String) -> Result<(), String> {
    init_database()?;
    
    let mut db = get_db()?;
    let status_enum = match status.as_str() {
        "Pending" => InstallmentStatus::Pending,
        "Paid" => InstallmentStatus::Paid,
        "Overdue" => InstallmentStatus::Overdue,
        "Cancelled" => InstallmentStatus::Cancelled,
        _ => return Err("无效的状态值".to_string()),
    };
    
    if let Some(cash) = db.cash.cash_data.get_mut(&transaction_uid) {
        cash.set_installment_status(status_enum);
        
        save(db.clone()).map_err(|e| format!("更新分期状态失败: {}", e))?;
        save_db(db)?;
        
        Ok(())
    } else {
        Err("交易记录不存在".to_string())
    }
}

#[tauri::command]
fn generate_next_installment(plan_id: u64, due_date: String) -> Result<u64, String> {
    init_database()?;
    
    let mut db = get_db()?;
    
    // 解析日期字符串
    let due_date = DateTime::parse_from_rfc3339(&due_date)
        .map_err(|e| format!("日期格式错误: {}", e))?
        .with_timezone(&Utc);
    
    let next_uid = db.cash.generate_next_installment(plan_id, due_date)
        .map_err(|e| e.to_string())?;
    
    save(db.clone()).map_err(|e| format!("生成下一期分期失败: {}", e))?;
    save_db(db)?;
    
    Ok(next_uid)
}

#[tauri::command]
fn cancel_installment_plan(plan_id: u64) -> Result<usize, String> {
    init_database()?;
    
    let mut db = get_db()?;
    let cancelled_count = db.cash.cancel_installment_plan(plan_id);
    
    save(db.clone()).map_err(|e| format!("取消分期计划失败: {}", e))?;
    save_db(db)?;
    
    Ok(cancelled_count)
}

#[tauri::command]
fn get_installments_by_plan(plan_id: u64) -> Result<Vec<TransactionResponse>, String> {
    init_database()?;
    
    let db = get_db()?;
    let installments = db.cash.get_installments_by_plan(plan_id);
    let mut transactions = Vec::new();
    
    for cash in installments {
        let (is_installment, plan_id, current, total, due_date_str, status_str) = 
            if let Some(installment) = &cash.installment {
                (
                    true,
                    Some(installment.plan_id),
                    Some(installment.current_installment),
                    Some(installment.total_installments),
                    Some(installment.due_date.to_rfc3339()),
                    Some(format!("{:?}", installment.status)),
                )
            } else {
                (false, None, None, None, None, None)
            };
        
        transactions.push(TransactionResponse {
            uid: cash.uid,
            student_id: cash.student_id,
            amount: cash.cash,
            note: cash.note.clone(),
            description: if is_installment {
                format!("分期付款 {}/{}", current.unwrap(), total.unwrap())
            } else {
                "普通付款".to_string()
            },
            is_installment,
            installment_plan_id: plan_id,
            installment_current: current,
            installment_total: total,
            installment_due_date: due_date_str,
            installment_status: status_str,
        });
    }
    
    Ok(transactions)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_main_window,
            add_student,
            get_all_students,
            add_score,
            get_student_scores,
            update_student_info,
            delete_student,
            add_cash_transaction,
            get_all_transactions,
            delete_cash_transaction,
            get_dashboard_stats,
            // 新增的分期付款相关命令
            update_installment_status,
            generate_next_installment,
            cancel_installment_plan,
            get_installments_by_plan
        ])
        .run(tauri::generate_context!())
        .expect("Error running app");
}


#[derive(Serialize)]
pub struct StudentResponse {
    pub uid: u64,
    pub name: String,
    pub age: u8,
    pub class: String,
    pub phone: String,
    pub note: String,
}

#[derive(Serialize)]
pub struct StudentScoresResponse {
    pub rings: Vec<f64>,
}

#[derive(Serialize)]
pub struct TransactionResponse {
    pub uid: u64,
    pub student_id: Option<u64>,
    pub amount: i64,
    pub note: Option<String>,
    pub description: String,
    pub is_installment: bool,
    pub installment_plan_id: Option<u64>,
    pub installment_current: Option<u32>,
    pub installment_total: Option<u32>,
    pub installment_due_date: Option<String>,
    pub installment_status: Option<String>,
}

#[derive(Serialize)]
pub struct DashboardStatsResponse {
    pub total_students: usize,
    pub total_revenue: i32,
    pub total_expense: i32,
    pub average_score: f64,
    pub max_score: f64,
    pub active_courses: usize,
}

