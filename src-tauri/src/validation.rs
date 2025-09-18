//! 验证模块 - 包含所有输入验证函数

use chrono::{DateTime, Utc};

/// 验证学生姓名
pub fn validate_student_name(name: &str) -> Result<(), String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("姓名不能为空".to_string());
    }
    if name.len() > 50 {
        return Err("姓名长度不能超过50个字符".to_string());
    }
    if name
        .chars()
        .any(|c| c.is_control() || c == '<' || c == '>' || c == '&')
    {
        return Err("姓名包含非法字符".to_string());
    }
    Ok(())
}

/// 验证电话号码
pub fn validate_phone_number(phone: &str) -> Result<(), String> {
    let phone = phone.trim();
    if phone.is_empty() {
        return Err("电话号码不能为空".to_string());
    }
    if phone.len() > 20 {
        return Err("电话号码长度不能超过20个字符".to_string());
    }
    // 可以添加更多电话号码格式验证
    Ok(())
}

/// 验证备注
pub fn validate_note(note: &str) -> Result<(), String> {
    if note.len() > 1000 {
        return Err("备注长度不能超过1000个字符".to_string());
    }
    if note
        .chars()
        .any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t')
    {
        return Err("备注包含非法字符".to_string());
    }
    Ok(())
}

/// 验证年龄
pub fn validate_age(age: u8) -> Result<(), String> {
    if age < 3 || age > 120 {
        return Err("年龄必须在3-120岁之间".to_string());
    }
    Ok(())
}

/// 验证金额
pub fn validate_amount(amount: i64) -> Result<(), String> {
    if amount.abs() > 1_000_000_00 {
        return Err("金额不能超过100万".to_string());
    }
    Ok(())
}

/// 验证课程类型
pub fn validate_class_type(class_type: &str) -> Result<(), String> {
    match class_type {
        "TenTry" | "Month" | "Year" | "Others" => Ok(()),
        _ => Err(format!("无效的课程类型: {}", class_type)),
    }
}

/// 验证科目类型
pub fn validate_subject_type(subject: &str) -> Result<(), String> {
    match subject {
        "Shooting" | "Archery" | "Others" => Ok(()),
        _ => Err(format!("无效的科目类型: {}", subject)),
    }
}

/// 验证成绩
pub fn validate_score(score: f64) -> Result<(), String> {
    if score < 0.0 || score > 1000.0 {
        return Err("成绩必须在0-1000范围内".to_string());
    }
    if !score.is_finite() {
        return Err("成绩必须是有效数字".to_string());
    }
    Ok(())
}



/// 验证学生UID
pub fn validate_student_uid(uid: u64) -> Result<(), String> {
    if uid == 0 {
        return Err("学生UID无效".to_string());
    }
    Ok(())
}

/// 验证交易UID
pub fn validate_transaction_uid(uid: u64) -> Result<(), String> {
    if uid == 0 {
        return Err("交易UID无效".to_string());
    }
    Ok(())
}

/// 验证计划ID
pub fn validate_plan_id(plan_id: u64) -> Result<(), String> {
    if plan_id == 0 {
        return Err("计划ID无效".to_string());
    }
    Ok(())
}

/// 验证分期数量
pub fn validate_installment_count(count: u32) -> Result<(), String> {
    if count == 0 || count > 360 {
        return Err("分期数必须在1-360之间".to_string());
    }
    Ok(())
}

/// 验证付款频率
pub fn validate_frequency(frequency: &str) -> Result<(), String> {
    match frequency {
        "Weekly" | "Monthly" | "Quarterly" => Ok(()),
        custom if custom.starts_with("Custom") => {
            let days_str = custom.trim_start_matches("Custom");
            match days_str.parse::<u32>() {
                Ok(days) if days > 0 && days <= 365 => Ok(()),
                _ => Err("自定义频率格式错误，应为Custom<1-365天数>".to_string()),
            }
        }
        _ => Err(format!("无效的付款频率: {}", frequency)),
    }
}

/// 验证日期范围
pub fn validate_date_range(start: &DateTime<Utc>, end: &DateTime<Utc>) -> Result<(), String> {
    if start > end {
        return Err("开始日期不能晚于结束日期".to_string());
    }
    Ok(())
}

/// 验证金额范围
pub fn validate_amount_range(min: i64, max: i64) -> Result<(), String> {
    if min > max {
        return Err("最小金额不能大于最大金额".to_string());
    }
    Ok(())
}

/// 验证年龄范围
pub fn validate_age_range(min: u8, max: u8) -> Result<(), String> {
    if min > max {
        return Err("最小年龄不能大于最大年龄".to_string());
    }
    Ok(())
}

/// 验证天数
pub fn validate_days(days: i64) -> Result<(), String> {
    if days <= 0 {
        return Err("天数必须大于0".to_string());
    }
    Ok(())
}
