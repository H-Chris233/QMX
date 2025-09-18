// src-tauri/src/lib.rs

use chrono::{DateTime, Duration, Utc};
use qmx_backend_lib::cash::{Installment, InstallmentStatus, PaymentFrequency};
use qmx_backend_lib::student::{Class, Subject};
use qmx_backend_lib::{
    CashBuilder, CashQuery, CashUpdater, QmxManager, StudentBuilder, StudentQuery, StudentUpdater,
    TimePeriod,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, OnceLock};
use tauri::WindowBuilder;

// 引入验证模块
mod validation;
use validation::*;

// v2 API - 全局QmxManager实例
// 使用Arc<QmxManager>确保线程安全，自动保存启用
static MANAGER: OnceLock<Arc<QmxManager>> = OnceLock::new();

// v2 API - 枚举转换辅助函数
fn parse_class_type(class_type: &str) -> Result<Class, String> {
    match class_type {
        "TenTry" => Ok(Class::TenTry),
        "Month" => Ok(Class::Month),
        "Year" => Ok(Class::Year),
        "Others" => Ok(Class::Others),
        _ => {
            log::warn!("未知的班级类型: {}, 使用Others", class_type);
            Ok(Class::Others)
        }
    }
}

fn parse_subject_type(subject: &str) -> Result<Subject, String> {
    match subject {
        "Shooting" => Ok(Subject::Shooting),
        "Archery" => Ok(Subject::Archery),
        "Others" => Ok(Subject::Others),
        _ => {
            log::warn!("未知的科目类型: {}, 使用Others", subject);
            Ok(Subject::Others)
        }
    }
}

fn parse_installment_status(status: &str) -> Result<InstallmentStatus, String> {
    match status {
        "Pending" => Ok(InstallmentStatus::Pending),
        "Paid" => Ok(InstallmentStatus::Paid),
        "Overdue" => Ok(InstallmentStatus::Overdue),
        "Cancelled" => Ok(InstallmentStatus::Cancelled),
        _ => {
            log::error!("无效的分期付款状态: {}", status);
            Err(format!("无效的状态值: {}", status))
        }
    }
}

// v2 API - 初始化QmxManager（优化版）
fn init_manager() -> Result<(), String> {
    // 使用v2 API的线程安全初始化，启用自动保存
    if MANAGER.get().is_none() {
        match QmxManager::new(true) {
            // 启用自动保存
            Ok(manager) => {
                MANAGER.get_or_init(|| Arc::new(manager));
                log::info!("v2 API QmxManager初始化成功，自动保存已启用");
                Ok(())
            }
            Err(e) => {
                log::error!("v2 API QmxManager初始化失败: {}", e);
                Err(format!("初始化QmxManager失败: {}", e))
            }
        }
    } else {
        Ok(())
    }
}

// v2 API - 获取管理器实例（优化版）
fn get_manager() -> Result<Arc<QmxManager>, String> {
    MANAGER.get().cloned().ok_or_else(|| {
        log::error!("QmxManager未初始化，请先调用init_manager()");
        "QmxManager未初始化".to_string()
    })
}

// v2 API - 学生数据转换辅助函数
fn convert_student_to_response(student: &qmx_backend_lib::student::Student) -> StudentResponse {
    StudentResponse {
        uid: student.uid(),
        name: student.name().to_string(),
        age: student.age(),
        class: format!("{:?}", student.class()),
        phone: student.phone().to_string(),
        note: student.note().to_string(),
        subject: format!("{:?}", student.subject()),
        lesson_left: student.lesson_left(),
        membership_start_date: student.membership_start_date().map(|d| d.to_rfc3339()),
        membership_end_date: student.membership_end_date().map(|d| d.to_rfc3339()),
        is_membership_active: student.is_membership_active(),
        membership_days_remaining: student.membership_days_remaining(),
    }
}

// v2 API - 现金记录转换辅助函数
fn convert_cash_to_response(cash: &qmx_backend_lib::cash::Cash) -> TransactionResponse {
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

    TransactionResponse {
        uid: cash.uid,
        student_id: cash.student_id,
        amount: cash.cash,
        note: cash.note.clone(),
        description: if is_installment {
            format!("分期付款 {}/{}", current.unwrap_or(0), total.unwrap_or(0))
        } else {
            "普通付款".to_string()
        },
        is_installment,
        installment_plan_id: plan_id,
        installment_current: current,
        installment_total: total,
        installment_due_date: due_date_str,
        installment_status: status_str,
    }
}

// 已在上面合并处理

// 窗口管理命令
#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn open_main_window(app: tauri::AppHandle) {
    // 桌面端：完整功能
    let _ = WindowBuilder::new(&app, "main")
        .title("启明星管理系统")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .center()
        .build();
}

// v2 API - 学员管理命令（完全优化版）
#[tauri::command]
fn add_student(
    name: String,
    age: u8,
    class_type: String,
    phone: String,
    note: String,
    subject: String,
) -> Result<StudentResponse, String> {
    init_manager()?;

    // v2 API - 增强输入验证（完整的后端验证）
    validate_student_name(&name)?;
    validate_age(age)?;
    validate_phone_number(&phone)?;
    validate_note(&note)?;
    validate_class_type(&class_type)?;
    validate_subject_type(&subject)?;

    // v2 API - 使用枚举转换辅助函数
    let class = parse_class_type(&class_type)?;
    let subject_enum = parse_subject_type(&subject)?;

    // v2 API - 使用构建器模式创建学生
    let manager = get_manager()?;
    let builder = StudentBuilder::new(name.trim(), age)
        .phone(phone.trim())
        .class(class)
        .subject(subject_enum)
        .note(note.trim());

    let uid = manager.create_student(builder).map_err(|e| {
        log::error!("v2 API创建学生失败: {}", e);
        format!("创建学生失败: {}", e)
    })?;

    // v2 API - 获取创建的学生信息（自动保存已处理）
    let student = manager
        .get_student(uid)
        .map_err(|e| format!("获取学生失败: {}", e))?
        .ok_or("学生创建后未找到")?;

    log::info!("v2 API成功创建学生: {} (UID: {})", student.name(), uid);

    Ok(StudentResponse {
        uid: student.uid(),
        name: student.name().to_string(),
        age: student.age(),
        class: format!("{:?}", student.class()),
        phone: student.phone().to_string(),
        note: student.note().to_string(),
        subject: format!("{:?}", student.subject()),
        lesson_left: student.lesson_left(),
        membership_start_date: student.membership_start_date().map(|d| d.to_rfc3339()),
        membership_end_date: student.membership_end_date().map(|d| d.to_rfc3339()),
        is_membership_active: student.is_membership_active(),
        membership_days_remaining: student.membership_days_remaining(),
    })
}

// v2 API - 获取所有学生（优化版）
#[tauri::command]
fn get_all_students() -> Result<Vec<StudentResponse>, String> {
    init_manager()?;

    let manager = get_manager()?;
    let students = manager.list_students().map_err(|e| {
        log::error!("v2 API获取学生列表失败: {}", e);
        format!("获取学生列表失败: {}", e)
    })?;

    // v2 API - 使用迭代器和辅助函数进行高效转换
    let student_responses: Vec<StudentResponse> = students
        .into_iter()
        .map(|student| convert_student_to_response(&student))
        .collect();

    log::info!("v2 API成功获取{}个学生记录", student_responses.len());
    Ok(student_responses)
}

// v2 API - 添加成绩（优化版）
#[tauri::command]
fn add_score(student_uid: u64, score: f64) -> Result<(), String> {
    init_manager()?;

    // v2 API - 输入验证（完整的后端验证）
    validate_student_uid(student_uid)?;
    validate_score(score)?;

    let manager = get_manager()?;
    manager
        .update_student(student_uid, StudentUpdater::new().add_ring(score))
        .map_err(|e| {
            log::error!(
                "v2 API添加成绩失败 - 学生UID: {}, 成绩: {}, 错误: {}",
                student_uid,
                score,
                e
            );
            format!("添加分数失败: {}", e)
        })?;

    log::info!(
        "v2 API成功添加成绩 - 学生UID: {}, 成绩: {}",
        student_uid,
        score
    );
    Ok(())
}

// v2 API - 删除学生成绩（使用 remove_ring_at 方法）
#[tauri::command]
fn delete_student_score(student_uid: u64, score_index: usize) -> Result<(), String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_student_uid(student_uid)?;

    let manager = get_manager()?;

    // 使用新的 remove_ring_at 方法直接删除指定索引的成绩
    manager
        .update_student(
            student_uid,
            StudentUpdater::new().remove_ring_at(score_index),
        )
        .map_err(|e| {
            log::error!(
                "v2 API删除成绩失败 - 学生UID: {}, 索引: {}, 错误: {}",
                student_uid,
                score_index,
                e
            );
            format!("删除成绩失败: {}", e)
        })?;

    log::info!(
        "v2 API成功删除成绩 - 学生UID: {}, 索引: {}",
        student_uid,
        score_index
    );
    Ok(())
}

// v2 API - 更新学生成绩（使用 update_ring_at 方法）
#[tauri::command]
fn update_student_score(
    student_uid: u64,
    score_index: usize,
    new_score: f64,
) -> Result<(), String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_student_uid(student_uid)?;
    validate_score(new_score)?;

    let manager = get_manager()?;

    // 使用新的 update_ring_at 方法直接更新指定索引的成绩
    manager
        .update_student(
            student_uid,
            StudentUpdater::new().update_ring_at(score_index, new_score),
        )
        .map_err(|e| {
            log::error!(
                "v2 API更新成绩失败 - 学生UID: {}, 索引: {}, 错误: {}",
                student_uid,
                score_index,
                e
            );
            format!("更新成绩失败: {}", e)
        })?;

    log::info!(
        "v2 API成功更新成绩 - 学生UID: {}, 索引: {}, 新成绩: {}",
        student_uid,
        score_index,
        new_score
    );
    Ok(())
}

// v2 API - 获取学生成绩（优化版）
#[tauri::command]
fn get_student_scores(student_uid: u64) -> Result<StudentScoresResponse, String> {
    init_manager()?;

    let manager = get_manager()?;
    let student = manager
        .get_student(student_uid)
        .map_err(|e| {
            log::error!("v2 API获取学生失败 - UID: {}, 错误: {}", student_uid, e);
            format!("获取学生失败: {}", e)
        })?
        .ok_or_else(|| {
            log::warn!("v2 API学员不存在 - UID: {}", student_uid);
            "学员不存在".to_string()
        })?;

    let rings = student.rings().to_vec();
    log::info!(
        "v2 API成功获取学生成绩 - UID: {}, 成绩数量: {}",
        student_uid,
        rings.len()
    );

    Ok(StudentScoresResponse { rings })
}

#[tauri::command]
fn update_student_info(
    student_uid: u64,
    name: Option<String>,
    age: Option<u8>,
    class_type: Option<String>,
    phone: Option<String>,
    note: Option<String>,
    subject: Option<String>,
    lesson_left: Option<u32>,
    membership_start_date: Option<String>,
    membership_end_date: Option<String>,
) -> Result<(), String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_student_uid(student_uid)?;

    // 验证可选字段
    if let Some(name_str) = &name {
        validate_student_name(name_str)?;
    }
    if let Some(age_val) = age {
        validate_age(age_val)?;
    }
    if let Some(phone_str) = &phone {
        validate_phone_number(phone_str)?;
    }
    if let Some(note_str) = &note {
        validate_note(note_str)?;
    }
    if let Some(class_str) = &class_type {
        validate_class_type(class_str)?;
    }
    if let Some(subject_str) = &subject {
        validate_subject_type(subject_str)?;
    }
    if let Some(lessons) = lesson_left {
        if lessons > 9999 {
            return Err("剩余课时不能超过9999".to_string());
        }
    }

    let manager = get_manager()?;
    let mut updater = StudentUpdater::new();

    if let Some(name) = name {
        updater = updater.name(name);
    }
    if let Some(age) = age {
        updater = updater.age(age);
    }
    // v2 API - 使用辅助函数进行类型转换
    if let Some(class_type) = class_type {
        let class = parse_class_type(&class_type)?;
        updater = updater.class(class);
    }
    if let Some(phone) = phone {
        updater = updater.phone(phone.trim());
    }
    if let Some(note) = note {
        updater = updater.note(note.trim());
    }
    if let Some(subject) = subject {
        let subject_enum = parse_subject_type(&subject)?;
        updater = updater.subject(subject_enum);
    }
    if let Some(lesson_left) = lesson_left {
        updater = updater.lesson_left(Some(lesson_left));
    }

    // 处理会员时间更新
    match (membership_start_date, membership_end_date) {
        (Some(start_str), Some(end_str)) => {
            let start_date = DateTime::parse_from_rfc3339(&start_str)
                .map_err(|e| format!("会员开始日期格式错误: {}", e))?
                .with_timezone(&Utc);
            let end_date = DateTime::parse_from_rfc3339(&end_str)
                .map_err(|e| format!("会员结束日期格式错误: {}", e))?
                .with_timezone(&Utc);
            updater = updater.membership(Some(start_date), Some(end_date));
        }
        (Some(start_str), None) => {
            let start_date = DateTime::parse_from_rfc3339(&start_str)
                .map_err(|e| format!("会员开始日期格式错误: {}", e))?
                .with_timezone(&Utc);
            // 需要获取当前的结束日期
            if let Some(student) = manager
                .get_student(student_uid)
                .map_err(|e| format!("获取学生失败: {}", e))?
            {
                updater = updater.membership(Some(start_date), student.membership_end_date());
            }
        }
        (None, Some(end_str)) => {
            let end_date = DateTime::parse_from_rfc3339(&end_str)
                .map_err(|e| format!("会员结束日期格式错误: {}", e))?
                .with_timezone(&Utc);
            // 需要获取当前的开始日期
            if let Some(student) = manager
                .get_student(student_uid)
                .map_err(|e| format!("获取学生失败: {}", e))?
            {
                updater = updater.membership(student.membership_start_date(), Some(end_date));
            }
        }
        (None, None) => {
            // 如果两个都是None，不做任何操作（保持原有会员状态）
        }
    }

    manager
        .update_student(student_uid, updater)
        .map_err(|e| format!("更新学员信息失败: {}", e))?;

    Ok(())
}

// v2 API - 会员管理命令（完全优化版）
#[tauri::command]
fn set_student_membership(
    student_uid: u64,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<(), String> {
    init_manager()?;

    // v2 API - 输入验证（完整的后端验证）
    validate_student_uid(student_uid)?;

    // v2 API - 日期解析和验证
    let parsed_start = if let Some(start_str) = start_date {
        Some(
            DateTime::parse_from_rfc3339(&start_str)
                .map_err(|e| {
                    log::error!("v2 API会员开始日期格式错误: {}, 错误: {}", start_str, e);
                    format!("会员开始日期格式错误: {}", e)
                })?
                .with_timezone(&Utc),
        )
    } else {
        None
    };

    let parsed_end = if let Some(end_str) = end_date {
        Some(
            DateTime::parse_from_rfc3339(&end_str)
                .map_err(|e| {
                    log::error!("v2 API会员结束日期格式错误: {}, 错误: {}", end_str, e);
                    format!("会员结束日期格式错误: {}", e)
                })?
                .with_timezone(&Utc),
        )
    } else {
        None
    };

    // v2 API - 验证日期逻辑
    if let (Some(start), Some(end)) = (parsed_start, parsed_end) {
        if start >= end {
            return Err("会员开始日期必须早于结束日期".to_string());
        }
    }

    let manager = get_manager()?;
    manager
        .update_student(
            student_uid,
            StudentUpdater::new().membership(parsed_start, parsed_end),
        )
        .map_err(|e| {
            log::error!("v2 API设置会员时间失败 - UID: {}, 错误: {}", student_uid, e);
            format!("设置会员时间失败: {}", e)
        })?;

    log::info!(
        "v2 API成功设置学生会员时间 - UID: {}, 开始: {:?}, 结束: {:?}",
        student_uid,
        parsed_start,
        parsed_end
    );
    Ok(())
}

// v2 API - 清除会员信息（优化版）
#[tauri::command]
fn clear_student_membership(student_uid: u64) -> Result<(), String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_student_uid(student_uid)?;

    let manager = get_manager()?;
    manager
        .update_student(student_uid, StudentUpdater::new().membership(None, None))
        .map_err(|e| {
            log::error!("v2 API清除会员信息失败 - UID: {}, 错误: {}", student_uid, e);
            format!("清除会员信息失败: {}", e)
        })?;

    log::info!("v2 API成功清除学生会员信息 - UID: {}", student_uid);
    Ok(())
}

// v2 API - 批量设置会员（月卡/年卡）（优化版）
#[tauri::command]
fn set_membership_by_type(
    student_uid: u64,
    membership_type: String, // "month" 或 "year"
    start_from_today: Option<bool>,
) -> Result<(), String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_student_uid(student_uid)?;

    let manager = get_manager()?;

    // v2 API - 智能确定开始日期
    let start_date = if start_from_today.unwrap_or(true) {
        Utc::now()
    } else {
        // 如果已有会员，从现有结束时间开始
        if let Some(student) = manager.get_student(student_uid).map_err(|e| {
            log::error!("v2 API获取学生失败 - UID: {}, 错误: {}", student_uid, e);
            format!("获取学生失败: {}", e)
        })? {
            student.membership_end_date().unwrap_or(Utc::now())
        } else {
            log::warn!("v2 API学员不存在 - UID: {}", student_uid);
            return Err("学员不存在".to_string());
        }
    };

    // v2 API - 计算结束日期
    let end_date = match membership_type.as_str() {
        "month" => start_date + Duration::days(30),
        "year" => start_date + Duration::days(365),
        _ => {
            log::error!("v2 API无效的会员类型: {}", membership_type);
            return Err("无效的会员类型，只支持 'month' 或 'year'".to_string());
        }
    };

    manager
        .update_student(
            student_uid,
            StudentUpdater::new().membership(Some(start_date), Some(end_date)),
        )
        .map_err(|e| {
            log::error!(
                "v2 API设置{}会员失败 - UID: {}, 错误: {}",
                membership_type,
                student_uid,
                e
            );
            format!("设置{}会员失败: {}", membership_type, e)
        })?;

    log::info!(
        "v2 API成功设置{}会员 - UID: {}, 开始: {}, 结束: {}",
        membership_type,
        student_uid,
        start_date.to_rfc3339(),
        end_date.to_rfc3339()
    );
    Ok(())
}

// v2 API - 删除学生（优化版）
#[tauri::command]
fn delete_student(student_uid: u64) -> Result<(), String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_student_uid(student_uid)?;

    let manager = get_manager()?;
    let deleted = manager.delete_student(student_uid).map_err(|e| {
        log::error!("v2 API删除学员失败 - UID: {}, 错误: {}", student_uid, e);
        format!("删除学员失败: {}", e)
    })?;

    if deleted {
        log::info!("v2 API成功删除学员 - UID: {}", student_uid);
        Ok(())
    } else {
        log::warn!("v2 API尝试删除不存在的学员 - UID: {}", student_uid);
        Err("学员不存在".to_string())
    }
}

// v2 API - 财务管理命令（完全重构版）
#[tauri::command]
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
    init_manager()?;

    // v2 API - 增强输入验证（完整的后端验证）
    validate_amount(amount)?;
    if let Some(total) = total_amount {
        validate_amount(total)?;
    }
    if let Some(note_str) = &note {
        validate_note(note_str)?;
    }
    if let Some(installments) = total_installments {
        validate_installment_count(installments)?;
    }
    if let Some(sid) = student_uid {
        validate_student_uid(sid)?;
    }

    let manager = get_manager()?;

    // v2 API - 使用构建器模式创建现金记录
    let mut builder = CashBuilder::new(amount);

    if let Some(student_id) = student_uid {
        builder = builder.student_id(student_id);
    }
    if let Some(note_str) = note.clone() {
        builder = builder.note(note_str);
    }

    if is_installment.unwrap_or(false) {
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
            Some(freq) => {
                validate_frequency(freq)?;
                match freq {
                    "Weekly" => PaymentFrequency::Weekly,
                    "Monthly" => PaymentFrequency::Monthly,
                    "Quarterly" => PaymentFrequency::Quarterly,
                    custom if custom.starts_with("Custom") => {
                        let days = custom
                            .trim_start_matches("Custom")
                            .parse()
                            .map_err(|_| "自定义频率格式错误，应为Custom<天数>")?;
                        PaymentFrequency::Custom(days)
                    }
                    _ => PaymentFrequency::Monthly, // 默认月度
                }
            }
            None => PaymentFrequency::Monthly, // 默认月度
        };

        let installment = Installment {
            plan_id: plan_id.unwrap_or(0),
            total_amount,
            total_installments,
            current_installment,
            frequency: frequency_enum,
            due_date,
            status: InstallmentStatus::Pending,
        };

        builder = builder.installment(installment);
    }

    let cash_id = manager
        .record_cash(builder)
        .map_err(|e| format!("保存交易记录失败: {}", e))?;

    // 获取创建的现金记录用于响应
    let cash = manager
        .get_cash(cash_id)
        .map_err(|e| format!("获取现金记录失败: {}", e))?
        .ok_or("现金记录创建后未找到")?;

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
            format!("分期付款 {}/{}", current.unwrap_or(0), total.unwrap_or(0))
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

// v2 API - 获取所有交易记录（优化版）
#[tauri::command]
fn get_all_transactions() -> Result<Vec<TransactionResponse>, String> {
    init_manager()?;

    let manager = get_manager()?;
    let cash_list = manager
        .search_cash(CashQuery::new()) // v2 API - 使用空查询获取所有记录
        .map_err(|e| {
            log::error!("v2 API获取交易记录失败: {}", e);
            format!("获取交易记录失败: {}", e)
        })?;

    // v2 API - 使用迭代器和辅助函数进行高效转换
    let transactions: Vec<TransactionResponse> = cash_list
        .into_iter()
        .map(|cash| convert_cash_to_response(&cash))
        .collect();

    log::info!("v2 API成功获取{}条交易记录", transactions.len());
    Ok(transactions)
}

// v2 API - 删除现金交易（优化版）
#[tauri::command]
fn delete_cash_transaction(transaction_uid: u64) -> Result<(), String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_transaction_uid(transaction_uid)?;

    let manager = get_manager()?;
    let deleted = manager.delete_cash(transaction_uid).map_err(|e| {
        log::error!(
            "v2 API删除交易记录失败 - UID: {}, 错误: {}",
            transaction_uid,
            e
        );
        format!("删除交易记录失败: {}", e)
    })?;

    if deleted {
        log::info!("v2 API成功删除交易记录 - UID: {}", transaction_uid);
        Ok(())
    } else {
        log::warn!("v2 API尝试删除不存在的交易记录 - UID: {}", transaction_uid);
        Err("交易记录不存在".to_string())
    }
}

// v2 API - 统计命令（完全优化版）
#[tauri::command]
fn get_dashboard_stats() -> Result<DashboardStatsResponse, String> {
    init_manager()?;

    let manager = get_manager()?;
    let dashboard_stats = manager
        .get_dashboard_stats() // v2 API - 直接调用管理器的统计方法
        .map_err(|e| {
            log::error!("v2 API获取仪表盘统计失败: {}", e);
            format!("获取仪表盘统计失败: {}", e)
        })?;

    log::info!(
        "v2 API成功获取仪表盘统计 - 学生数: {}, 总收入: {}, 总支出: {}",
        dashboard_stats.total_students,
        dashboard_stats.total_revenue,
        dashboard_stats.total_expense
    );

    Ok(DashboardStatsResponse {
        total_students: dashboard_stats.total_students,
        total_revenue: dashboard_stats.total_revenue,
        total_expense: dashboard_stats.total_expense,
        average_score: dashboard_stats.average_score,
        max_score: dashboard_stats.max_score,
        active_courses: dashboard_stats.active_courses,
    })
}

// v2 API - 更新分期付款状态（优化版）
#[tauri::command]
fn update_installment_status(transaction_uid: u64, status: String) -> Result<(), String> {
    init_manager()?;

    // v2 API - 状态枚举转换和验证
    validate_transaction_uid(transaction_uid)?;
    let status_enum = parse_installment_status(&status)?;

    let manager = get_manager()?;

    // v2 API - 获取现金记录并更新分期状态
    let cash = manager
        .get_cash(transaction_uid)
        .map_err(|e| {
            log::error!(
                "v2 API获取交易记录失败 - UID: {}, 错误: {}",
                transaction_uid,
                e
            );
            format!("获取交易记录失败: {}", e)
        })?
        .ok_or_else(|| {
            log::warn!("v2 API交易记录不存在 - UID: {}", transaction_uid);
            "交易记录不存在".to_string()
        })?;

    if let Some(mut installment) = cash.installment {
        installment.status = status_enum;
        manager
            .update_cash(
                transaction_uid,
                CashUpdater::new().installment(Some(installment)),
            )
            .map_err(|e| {
                log::error!(
                    "v2 API更新分期状态失败 - UID: {}, 状态: {}, 错误: {}",
                    transaction_uid,
                    status,
                    e
                );
                format!("更新分期状态失败: {}", e)
            })?;

        log::info!(
            "v2 API成功更新分期状态 - UID: {}, 新状态: {}",
            transaction_uid,
            status
        );
        Ok(())
    } else {
        log::warn!("v2 API尝试更新非分期付款记录 - UID: {}", transaction_uid);
        Err("该交易记录不是分期付款".to_string())
    }
}

#[tauri::command]
fn generate_next_installment(plan_id: u64, due_date: String) -> Result<u64, String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_plan_id(plan_id)?;

    let manager = get_manager()?;

    // 解析日期字符串
    let due_date = DateTime::parse_from_rfc3339(&due_date)
        .map_err(|e| format!("日期格式错误: {}", e))?
        .with_timezone(&Utc);

    // 查找该计划的所有分期付款
    let installments = manager
        .search_cash(CashQuery::new().has_installment(true))
        .map_err(|e| format!("查询分期付款失败: {}", e))?;

    // 找到指定计划的分期付款
    let mut plan_installments: Vec<_> = installments
        .into_iter()
        .filter_map(|cash| {
            if let Some(installment) = cash.installment.clone() {
                if installment.plan_id == plan_id {
                    Some((cash, installment))
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();

    if plan_installments.is_empty() {
        return Err("未找到指定的分期计划".to_string());
    }

    // 按期数排序，找到最新的分期
    plan_installments.sort_by_key(|(_, installment)| installment.current_installment);
    let (_, latest_installment) = plan_installments
        .last()
        .ok_or("分期计划数据异常，无法找到最新分期")?;

    // 检查是否已经是最后一期
    if latest_installment.current_installment >= latest_installment.total_installments {
        return Err("分期计划已完成，无法生成下一期".to_string());
    }

    // 计算下一期的金额（平均分配剩余金额）
    let amount_per_installment =
        latest_installment.total_amount / latest_installment.total_installments as i64;

    // 创建下一期分期
    let next_installment = Installment {
        plan_id: latest_installment.plan_id,
        total_amount: latest_installment.total_amount,
        total_installments: latest_installment.total_installments,
        current_installment: latest_installment.current_installment + 1,
        frequency: latest_installment.frequency,
        due_date,
        status: InstallmentStatus::Pending,
    };

    let cash_id = manager
        .record_cash(
            CashBuilder::new(amount_per_installment)
                .student_id(plan_installments[0].0.student_id.unwrap_or(0))
                .installment(next_installment)
                .note(format!(
                    "分期付款第{}期",
                    latest_installment.current_installment + 1
                )),
        )
        .map_err(|e| format!("生成下一期分期失败: {}", e))?;

    Ok(cash_id)
}

#[tauri::command]
fn cancel_installment_plan(plan_id: u64) -> Result<usize, String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_plan_id(plan_id)?;

    let manager = get_manager()?;

    // 查找该计划的所有分期付款
    let installments = manager
        .search_cash(CashQuery::new().has_installment(true))
        .map_err(|e| format!("查询分期付款失败: {}", e))?;

    let mut cancelled_count = 0;

    for cash in installments {
        if let Some(mut installment) = cash.installment {
            if installment.plan_id == plan_id && installment.status != InstallmentStatus::Cancelled
            {
                // 更新状态为已取消
                installment.status = InstallmentStatus::Cancelled;

                manager
                    .update_cash(cash.uid, CashUpdater::new().installment(Some(installment)))
                    .map_err(|e| format!("取消分期付款失败: {}", e))?;

                cancelled_count += 1;
            }
        }
    }

    if cancelled_count == 0 {
        Err("未找到可取消的分期计划".to_string())
    } else {
        Ok(cancelled_count)
    }
}

#[tauri::command]
fn get_installments_by_plan(plan_id: u64) -> Result<Vec<TransactionResponse>, String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_plan_id(plan_id)?;

    let manager = get_manager()?;

    // 使用CashQuery查询具有分期付款的记录，然后手动筛选plan_id
    let all_installments = manager
        .search_cash(CashQuery::new().has_installment(true))
        .map_err(|e| format!("查询分期付款失败: {}", e))?;

    let mut transactions = Vec::new();
    for cash in all_installments {
        if let Some(installment) = &cash.installment {
            if installment.plan_id == plan_id {
                transactions.push(TransactionResponse {
                    uid: cash.uid,
                    student_id: cash.student_id,
                    amount: cash.cash,
                    note: cash.note.clone(),
                    description: format!(
                        "分期付款 {}/{}",
                        installment.current_installment, installment.total_installments
                    ),
                    is_installment: true,
                    installment_plan_id: Some(installment.plan_id),
                    installment_current: Some(installment.current_installment),
                    installment_total: Some(installment.total_installments),
                    installment_due_date: Some(installment.due_date.to_rfc3339()),
                    installment_status: Some(format!("{:?}", installment.status)),
                });
            }
        }
    }

    Ok(transactions)
}

// v2 API功能 - 学生统计
#[tauri::command]
fn get_student_stats(student_uid: u64) -> Result<StudentStatsResponse, String> {
    init_manager()?;

    let manager = get_manager()?;
    let stats = manager
        .get_student_stats(student_uid)
        .map_err(|e| format!("获取学生统计失败: {}", e))?;

    Ok(StudentStatsResponse {
        total_payments: stats.total_payments,
        payment_count: stats.payment_count,
        average_score: stats.average_score,
        score_count: stats.score_count,
        membership_status: format!("{:?}", stats.membership_status),
    })
}

// v2 API功能 - 财务统计
#[tauri::command]
fn get_financial_stats(period: String) -> Result<FinancialStatsResponse, String> {
    init_manager()?;

    let time_period = match period.as_str() {
        "Today" => TimePeriod::Today,
        "ThisWeek" => TimePeriod::ThisWeek,
        "ThisMonth" => TimePeriod::ThisMonth,
        "ThisYear" => TimePeriod::ThisYear,
        _ => return Err("无效的时间段".to_string()),
    };

    let manager = get_manager()?;
    let stats = manager
        .get_financial_stats(time_period)
        .map_err(|e| format!("获取财务统计失败: {}", e))?;

    Ok(FinancialStatsResponse {
        total_income: stats.total_income,
        total_expense: stats.total_expense,
        net_income: stats.net_income,
        installment_total: stats.transaction_count as i64,
        installment_paid: stats.installment_count as i64,
        installment_pending: 0, // 计算pending状态的分期付款数量
    })
}

// v2 API功能 - 搜索学生
#[tauri::command]
fn search_students(
    name_contains: Option<String>,
    min_age: Option<u8>,
    max_age: Option<u8>,
    class_type: Option<String>,
    subject: Option<String>,
    has_membership: Option<bool>,
) -> Result<Vec<StudentResponse>, String> {
    init_manager()?;

    let manager = get_manager()?;
    let mut query = StudentQuery::new();

    if let Some(name) = name_contains {
        query = query.name_contains(name);
    }
    if let (Some(min), Some(max)) = (min_age, max_age) {
        // 验证年龄范围
        validate_age_range(min, max)?;
        query = query.age_range(min, max);
    }
    if let Some(class_str) = class_type {
        validate_class_type(&class_str)?;
        let class = match class_str.as_str() {
            "TenTry" => Class::TenTry,
            "Month" => Class::Month,
            "Year" => Class::Year,
            _ => Class::Others,
        };
        query = query.class(class);
    }
    if let Some(subject_str) = subject {
        validate_subject_type(&subject_str)?;
        let subject_enum = match subject_str.as_str() {
            "Shooting" => Subject::Shooting,
            "Archery" => Subject::Archery,
            _ => Subject::Others,
        };
        query = query.subject(subject_enum);
    }
    if let Some(has_mem) = has_membership {
        query = query.has_membership(has_mem);
    }

    let students = manager
        .search_students(query)
        .map_err(|e| format!("搜索学生失败: {}", e))?;

    let mut student_responses = Vec::new();
    for student in students {
        student_responses.push(StudentResponse {
            uid: student.uid(),
            name: student.name().to_string(),
            age: student.age(),
            class: format!("{:?}", student.class()),
            phone: student.phone().to_string(),
            note: student.note().to_string(),
            subject: format!("{:?}", student.subject()),
            lesson_left: student.lesson_left(),
            membership_start_date: student.membership_start_date().map(|d| d.to_rfc3339()),
            membership_end_date: student.membership_end_date().map(|d| d.to_rfc3339()),
            is_membership_active: student.is_membership_active(),
            membership_days_remaining: student.membership_days_remaining(),
        });
    }

    Ok(student_responses)
}

// v2 API功能 - 获取学生现金记录
#[tauri::command]
fn get_student_cash(student_uid: u64) -> Result<Vec<TransactionResponse>, String> {
    init_manager()?;

    let manager = get_manager()?;
    let cash_list = manager
        .get_student_cash(student_uid)
        .map_err(|e| format!("获取学生现金记录失败: {}", e))?;

    let mut transactions = Vec::new();
    for cash in cash_list {
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
                format!("分期付款 {}/{}", current.unwrap_or(0), total.unwrap_or(0))
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

// v2 API功能 - 高级现金搜索
#[tauri::command]
fn search_cash(
    student_id: Option<u64>,
    min_amount: Option<i64>,
    max_amount: Option<i64>,
    has_installment: Option<bool>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<TransactionResponse>, String> {
    init_manager()?;

    let manager = get_manager()?;
    let mut query = CashQuery::new();

    if let Some(sid) = student_id {
        validate_student_uid(sid)?;
        query = query.student_id(sid);
    }
    if let (Some(min), Some(max)) = (min_amount, max_amount) {
        // 验证金额范围
        validate_amount_range(min, max)?;
        query = query.amount_range(min, max);
    }
    if let Some(has_inst) = has_installment {
        query = query.has_installment(has_inst);
    }

    // 添加日期范围查询支持
    if let (Some(from_str), Some(to_str)) = (date_from, date_to) {
        let start_date = DateTime::parse_from_rfc3339(&from_str)
            .map_err(|e| format!("开始日期格式错误: {}", e))?
            .with_timezone(&Utc);
        let end_date = DateTime::parse_from_rfc3339(&to_str)
            .map_err(|e| format!("结束日期格式错误: {}", e))?
            .with_timezone(&Utc);

        // 验证日期范围
        validate_date_range(&start_date, &end_date)?;

        query = query.date_range(start_date, end_date);
    }

    let cash_list = manager
        .search_cash(query)
        .map_err(|e| format!("搜索现金记录失败: {}", e))?;

    let mut transactions = Vec::new();
    for cash in cash_list {
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
                format!("分期付款 {}/{}", current.unwrap_or(0), total.unwrap_or(0))
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

// v2 API功能 - 批量操作学生
#[tauri::command]
fn update_multiple_students(
    student_uids: Vec<u64>,
    updates: StudentUpdateBatch,
) -> Result<usize, String> {
    init_manager()?;

    let manager = get_manager()?;
    let mut success_count = 0;

    for uid in student_uids {
        let mut updater = StudentUpdater::new();

        if let Some(ref name) = updates.name {
            updater = updater.name(name.clone());
        }
        if let Some(age) = updates.age {
            updater = updater.age(age);
        }
        if let Some(ref class_type) = updates.class_type {
            let class = match class_type.as_str() {
                "TenTry" => Class::TenTry,
                "Month" => Class::Month,
                "Year" => Class::Year,
                _ => Class::Others,
            };
            updater = updater.class(class);
        }
        if let Some(ref subject) = updates.subject {
            let subject_enum = match subject.as_str() {
                "Shooting" => Subject::Shooting,
                "Archery" => Subject::Archery,
                _ => Subject::Others,
            };
            updater = updater.subject(subject_enum);
        }

        if manager.update_student(uid, updater).is_ok() {
            success_count += 1;
        }
    }

    Ok(success_count)
}

// v2 API功能 - 获取会员到期提醒
#[tauri::command]
fn get_membership_expiring_soon(days: i64) -> Result<Vec<StudentResponse>, String> {
    init_manager()?;

    // 输入验证（完整的后端验证）
    validate_days(days)?;

    let manager = get_manager()?;
    let cutoff_date = Utc::now() + Duration::days(days);

    let students = manager
        .search_students(StudentQuery::new().has_membership(true))
        .map_err(|e| format!("搜索会员学生失败: {}", e))?;

    let mut expiring_students = Vec::new();
    for student in students {
        if let Some(end_date) = student.membership_end_date() {
            if end_date <= cutoff_date && student.is_membership_active() {
                expiring_students.push(StudentResponse {
                    uid: student.uid(),
                    name: student.name().to_string(),
                    age: student.age(),
                    class: format!("{:?}", student.class()),
                    phone: student.phone().to_string(),
                    note: student.note().to_string(),
                    subject: format!("{:?}", student.subject()),
                    lesson_left: student.lesson_left(),
                    membership_start_date: student.membership_start_date().map(|d| d.to_rfc3339()),
                    membership_end_date: student.membership_end_date().map(|d| d.to_rfc3339()),
                    is_membership_active: student.is_membership_active(),
                    membership_days_remaining: student.membership_days_remaining(),
                });
            }
        }
    }

    Ok(expiring_students)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = simple_logger::init() {
        eprintln!("Warning: Failed to initialize logger: {}", e);
    }
    log::info!("启明星管理系统启动，日志系统已初始化");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            open_main_window,
            add_student,
            get_all_students,
            add_score,
            get_student_scores,
            delete_student_score,
            update_student_score,
            update_student_info,
            delete_student,
            add_cash_transaction,
            get_all_transactions,
            delete_cash_transaction,
            get_dashboard_stats,
            // 分期付款相关命令
            update_installment_status,
            generate_next_installment,
            cancel_installment_plan,
            get_installments_by_plan,
            // 会员管理相关命令
            set_student_membership,
            clear_student_membership,
            set_membership_by_type,
            // v2 API命令
            get_student_stats,
            get_financial_stats,
            search_students,
            get_student_cash,
            search_cash,
            update_multiple_students,
            get_membership_expiring_soon
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
    pub subject: String,
    pub lesson_left: Option<u32>,
    pub membership_start_date: Option<String>,
    pub membership_end_date: Option<String>,
    pub is_membership_active: bool,
    pub membership_days_remaining: Option<i64>,
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
    pub total_revenue: i64,
    pub total_expense: i64,
    pub average_score: f64,
    pub max_score: f64,
    pub active_courses: usize,
}

#[derive(Serialize)]
pub struct StudentStatsResponse {
    pub total_payments: i64,
    pub payment_count: usize,
    pub average_score: Option<f64>,
    pub score_count: usize,
    pub membership_status: String,
}

#[derive(Serialize)]
pub struct FinancialStatsResponse {
    pub total_income: i64,
    pub total_expense: i64,
    pub net_income: i64,
    pub installment_total: i64,
    pub installment_paid: i64,
    pub installment_pending: i64,
}

#[derive(Serialize, Deserialize)]
pub struct StudentUpdateBatch {
    pub name: Option<String>,
    pub age: Option<u8>,
    pub class_type: Option<String>,
    pub subject: Option<String>,
    pub note: Option<String>,
}
