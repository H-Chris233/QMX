// src-tauri/src/main.rs
use tauri::WindowBuilder;
use qmx_backend_lib::{database, student, cash};
use qmx_backend_lib::init::init;
use qmx_backend_lib::save::save;
use student::{Person, Class, Student};
use cash::Cash;
use std::collections::HashMap;

// 全局数据库实例
static mut DB: Option<database::Database> = None;

// 初始化数据库
fn init_database() -> Result<(), String> {
    unsafe {
        if DB.is_none() {
            let db_instance = init().map_err(|e| format!("初始化后端失败: {}", e))?;
            DB = Some(db_instance);
        }
        Ok(())
    }
}

fn get_db() -> &'static mut database::Database {
    unsafe {
        DB.as_mut().expect("数据库未初始化")
    }
}

// 窗口管理命令
#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) {
    let _ = WindowBuilder::new(&app, "settings")
        .title("设置")
        .build();
}

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
fn add_student(name: String, age: u8, class_type: String, phone: String) -> Result<HashMap<String, serde_json::Value>, String> {
    init_database()?;
    
    let class = match class_type.as_str() {
        "TenTry" => Class::TenTry,
        "Month" => Class::Month,
        "Year" => Class::Year,
        _ => Class::Others,
    };
    
    let mut person = Person::new();
    person.set_name(name).set_age(age).set_class(class);
    
    // 添加电话信息到备注字段
    let note = format!("电话: {}", phone);
    person.set_note(note);
    
    let db = get_db();
    db.student.insert(person.clone());
    
    save(db.clone()).map_err(|e| format!("保存失败: {}", e))?;
    
    let mut result = HashMap::new();
    result.insert("uid".to_string(), serde_json::Value::Number(serde_json::Number::from(person.uid())));
    result.insert("name".to_string(), serde_json::Value::String(person.name().to_string()));
    result.insert("age".to_string(), serde_json::Value::Number(serde_json::Number::from(person.age())));
    result.insert("class".to_string(), serde_json::Value::String(format!("{:?}", person.class())));
    result.insert("phone".to_string(), serde_json::Value::String(phone));
    result.insert("note".to_string(), serde_json::Value::String(person.note().to_string()));
    
    Ok(result)
}

#[tauri::command]
fn get_all_students() -> Result<Vec<HashMap<String, serde_json::Value>>, String> {
    init_database()?;
    
    let db = get_db();
    let mut students = Vec::new();
    
    for (uid, person) in db.student.iter() {
        let mut student_map = HashMap::new();
        student_map.insert("uid".to_string(), serde_json::Value::Number(serde_json::Number::from(*uid)));
        student_map.insert("name".to_string(), serde_json::Value::String(person.name().to_string()));
        student_map.insert("age".to_string(), serde_json::Value::Number(serde_json::Number::from(person.age())));
        student_map.insert("class".to_string(), serde_json::Value::String(format!("{:?}", person.class())));
        student_map.insert("rings".to_string(), serde_json::Value::Array(
            person.rings().iter().map(|&r| serde_json::Value::Number(serde_json::Number::from_f64(r).unwrap())).collect()
        ));
        student_map.insert("note".to_string(), serde_json::Value::String(person.note().to_string()));
        student_map.insert("cash".to_string(), serde_json::Value::String(format!("{:?}", person.cash())));
        
        // 从备注中提取电话
        let note = person.note();
        let phone = if note.starts_with("电话: ") {
            note["电话: ".len()..].to_string()
        } else {
            "".to_string()
        };
        student_map.insert("phone".to_string(), serde_json::Value::String(phone));
        
        students.push(student_map);
    }
    
    Ok(students)
}

#[tauri::command]
fn add_score(student_uid: u64, score: f64) -> Result<(), String> {
    init_database()?;
    
    let db = get_db();
    if let Some(person) = db.student.student_data.get_mut(&student_uid) {
        let mut person_clone = person.clone();
        person_clone.add_ring(score);
        *person = person_clone;
        
        save(db.clone()).map_err(|e| format!("保存分数失败: {}", e))?;
        Ok(())
    } else {
        Err("学员不存在".to_string())
    }
}

#[tauri::command]
fn get_student_scores(student_uid: u64) -> Result<Vec<f64>, String> {
    init_database()?;
    
    let db = get_db();
    if let Some(person) = db.student.get(&student_uid) {
        Ok(person.rings().clone())
    } else {
        Err("学员不存在".to_string())
    }
}

#[tauri::command]
fn update_student_info(student_uid: u64, name: Option<String>, age: Option<u8>, class_type: Option<String>, phone: Option<String>) -> Result<(), String> {
    init_database()?;
    
    let db = get_db();
    if let Some(person) = db.student.student_data.get_mut(&student_uid) {
        let mut person_clone = person.clone();
        
        if let Some(name) = name {
            person_clone.set_name(name);
        }
        if let Some(age) = age {
            person_clone.set_age(age);
        }
        if let Some(class_type) = class_type {
            let class = match class_type.as_str() {
                "TenTry" => Class::TenTry,
                "Month" => Class::Month,
                "Year" => Class::Year,
                _ => Class::Others,
            };
            person_clone.set_class(class);
        }
        if let Some(phone) = phone {
            let note = format!("电话: {}", phone);
            person_clone.set_note(note);
        }
        
        *person = person_clone;
        
        save(db.clone()).map_err(|e| format!("更新学员信息失败: {}", e))?;
        Ok(())
    } else {
        Err("学员不存在".to_string())
    }
}

#[tauri::command]
fn delete_student(student_uid: u64) -> Result<(), String> {
    init_database()?;
    
    let db = get_db();
    if db.student.student_data.remove(&student_uid).is_some() {
        save(db.clone()).map_err(|e| format!("删除学员失败: {}", e))?;
        Ok(())
    } else {
        Err("学员不存在".to_string())
    }
}

// 财务管理命令
#[tauri::command]
fn add_cash_transaction(student_uid: Option<u64>, amount: i32, description: String) -> Result<HashMap<String, serde_json::Value>, String> {
    init_database()?;
    
    let mut cash = Cash::new(student_uid);
    cash.add(amount);
    
    let db = get_db();
    db.cash.insert(cash.clone());
    
    save(db.clone()).map_err(|e| format!("保存交易记录失败: {}", e))?;
    
    let mut result = HashMap::new();
    result.insert("uid".to_string(), serde_json::Value::Number(serde_json::Number::from(cash.uid)));
    result.insert("student_id".to_string(), serde_json::Value::String(format!("{:?}", student_uid)));
    result.insert("amount".to_string(), serde_json::Value::Number(serde_json::Number::from(amount)));
    result.insert("description".to_string(), serde_json::Value::String(description));
    
    Ok(result)
}

#[tauri::command]
fn get_all_transactions() -> Result<Vec<HashMap<String, serde_json::Value>>, String> {
    init_database()?;
    
    let db = get_db();
    let mut transactions = Vec::new();
    
    for (uid, cash) in db.cash.iter() {
        let mut transaction = HashMap::new();
        transaction.insert("uid".to_string(), serde_json::Value::Number(serde_json::Number::from(*uid)));
        transaction.insert("student_id".to_string(), serde_json::Value::String(format!("{:?}", cash.student_id)));
        transaction.insert("amount".to_string(), serde_json::Value::Number(serde_json::Number::from(cash.cash)));
        transactions.push(transaction);
    }
    
    Ok(transactions)
}

#[tauri::command]
fn delete_cash_transaction(transaction_uid: u64) -> Result<(), String> {
    init_database()?;
    
    let db = get_db();
    if db.cash.cash_data.remove(&transaction_uid).is_some() {
        save(db.clone()).map_err(|e| format!("删除交易记录失败: {}", e))?;
        Ok(())
    } else {
        Err("交易记录不存在".to_string())
    }
}

// 统计命令
#[tauri::command]
fn get_dashboard_stats() -> Result<HashMap<String, serde_json::Value>, String> {
    init_database()?;
    
    let db = get_db();
    let mut stats = HashMap::new();
    
    // 学员总数
    let total_students = db.student.len();
    stats.insert("total_students".to_string(), serde_json::Value::Number(serde_json::Number::from(total_students)));
    
    // 总收入
    let total_revenue: i32 = db.cash.iter().filter(|(_, cash)| cash.cash > 0).map(|(_, cash)| cash.cash).sum();
    stats.insert("total_revenue".to_string(), serde_json::Value::Number(serde_json::Number::from(total_revenue)));
    
    // 总支出
    let total_expense: i32 = db.cash.iter().filter(|(_, cash)| cash.cash < 0).map(|(_, cash)| cash.cash.abs()).sum();
    stats.insert("total_expense".to_string(), serde_json::Value::Number(serde_json::Number::from(total_expense)));
    
    // 平均分数
    let all_scores: Vec<f64> = db.student.iter().flat_map(|(_, person)| person.rings().clone()).collect();
    let avg_score = if all_scores.is_empty() {
        0.0
    } else {
        all_scores.iter().sum::<f64>() / all_scores.len() as f64
    };
    stats.insert("average_score".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(avg_score).unwrap()));
    
    // 最高分数
    let max_score = all_scores.iter().fold(0.0_f64, |acc, &score| acc.max(score));
    stats.insert("max_score".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(max_score).unwrap()));
    
    Ok(stats)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_settings_window, 
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
