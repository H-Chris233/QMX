// src-tauri/src/lib.rs
use tauri::{WindowBuilder};
use qmx_backend_lib::{database, student, cash};
use qmx_backend_lib::init::init;
use qmx_backend_lib::save::save;
use student::{Person, Class, Student};
use cash::Cash;
use std::sync::Mutex;
use serde::Serialize;
use std::sync::OnceLock;

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
#[tauri::command]
fn add_cash_transaction(student_uid: Option<u64>, amount: i32, note: String) -> Result<TransactionResponse, String> {
    init_database()?;
    
    let mut cash = Cash::new(student_uid);
    cash.add(amount);
    
    let mut db = get_db()?;
    db.cash.insert(cash.clone());
    
    save(db.clone()).map_err(|e| format!("保存交易记录失败: {}", e))?;
    save_db(db)?;
    
    Ok(TransactionResponse {
        uid: cash.uid,
        student_id: cash.student_id,
        amount: cash.cash,
        note: note,
        description: String::from("交易记录"), // 添加description字段
    })
}

#[tauri::command]
fn get_all_transactions() -> Result<Vec<TransactionResponse>, String> {
    init_database()?;
    
    let db = get_db()?;
    let mut transactions = Vec::new();
    
    for (uid, cash) in db.cash.iter() {
        transactions.push(TransactionResponse {
            uid: *uid,
            student_id: cash.student_id,
            amount: cash.cash,
            note: String::new(),
            description: String::from("交易记录"), // 添加description字段
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
            get_dashboard_stats
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
    pub amount: i32,
    pub note: String,
    pub description: String,
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

