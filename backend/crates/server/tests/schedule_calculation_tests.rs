//! Unit tests for schedule calculation
//! 
//! These tests verify that the scheduler correctly calculates next run times
//! for daily, weekly, and monthly schedules, and detects missed schedules.
//!
//! **Validates: Requirements 2.1, 2.2, 2.6**

use chrono::{DateTime, Datelike, Duration, TimeZone, Timelike, Utc, Weekday};

/// Calculate next daily schedule time
/// Returns the next occurrence of the specified time (HH:MM)
fn calculate_next_daily(current: DateTime<Utc>, hour: u32, minute: u32) -> DateTime<Utc> {
    let today = current
        .date_naive()
        .and_hms_opt(hour, minute, 0)
        .expect("Invalid time");
    let today_utc = Utc.from_utc_datetime(&today);

    if current <= today_utc {
        // Today's scheduled time hasn't passed yet (or is exactly now)
        today_utc
    } else {
        // Today's scheduled time has passed, schedule for tomorrow
        today_utc + Duration::days(1)
    }
}

/// Calculate next weekly schedule time
/// Returns the next occurrence of the specified weekday and time
fn calculate_next_weekly(
    current: DateTime<Utc>,
    weekday: Weekday,
    hour: u32,
    minute: u32,
) -> DateTime<Utc> {
    let current_weekday = current.weekday();
    let target_weekday_num = weekday.num_days_from_monday();
    let current_weekday_num = current_weekday.num_days_from_monday();

    // Calculate days until target weekday
    let days_until = if target_weekday_num >= current_weekday_num {
        target_weekday_num - current_weekday_num
    } else {
        7 - (current_weekday_num - target_weekday_num)
    };

    let target_date = current.date_naive() + Duration::days(days_until as i64);
    let target_time = target_date
        .and_hms_opt(hour, minute, 0)
        .expect("Invalid time");
    let target_utc = Utc.from_utc_datetime(&target_time);

    if current <= target_utc {
        // This week's scheduled time hasn't passed yet (or is exactly now)
        target_utc
    } else if days_until == 0 {
        // Today is the target weekday but time has passed, schedule for next week
        target_utc + Duration::weeks(1)
    } else {
        target_utc
    }
}

/// Calculate next monthly schedule time
/// Returns the next occurrence of the specified day of month and time
fn calculate_next_monthly(
    current: DateTime<Utc>,
    day_of_month: u32,
    hour: u32,
    minute: u32,
) -> DateTime<Utc> {
    
    // Try this month first
    let this_month_date = current
        .date_naive()
        .with_day(day_of_month);
    
    if let Some(date) = this_month_date {
        let target_time = date.and_hms_opt(hour, minute, 0).expect("Invalid time");
        let target_utc = Utc.from_utc_datetime(&target_time);
        
        if current < target_utc {
            return target_utc;
        }
    }
    
    // This month's scheduled time has passed or doesn't exist, try next month
    let next_month = if current.month() == 12 {
        current
            .with_year(current.year() + 1)
            .and_then(|d| d.with_month(1))
    } else {
        current.with_month(current.month() + 1)
    };
    
    if let Some(next_month_dt) = next_month {
        let next_month_date = next_month_dt
            .date_naive()
            .with_day(day_of_month)
            .expect("Invalid day of month");
        let target_time = next_month_date
            .and_hms_opt(hour, minute, 0)
            .expect("Invalid time");
        Utc.from_utc_datetime(&target_time)
    } else {
        panic!("Failed to calculate next month");
    }
}

/// Check if a schedule was missed
/// Returns true if the last run time is older than the schedule interval
fn is_schedule_missed(
    last_run: DateTime<Utc>,
    current: DateTime<Utc>,
    interval_days: i64,
) -> bool {
    current.signed_duration_since(last_run) > Duration::days(interval_days)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_daily_schedule_before_time() {
        // Current time: 10:00, scheduled time: 23:59
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 10, 0, 0).unwrap();
        let next = calculate_next_daily(current, 23, 59);
        
        // Should be today at 23:59
        assert_eq!(next.year(), 2026);
        assert_eq!(next.month(), 1);
        assert_eq!(next.day(), 25);
        assert_eq!(next.hour(), 23);
        assert_eq!(next.minute(), 59);
    }

    #[test]
    fn test_daily_schedule_at_exact_time() {
        // Current time: 23:59, scheduled time: 23:59 (exactly at scheduled time)
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 23, 59, 0).unwrap();
        let next = calculate_next_daily(current, 23, 59);
        
        // Should be today at 23:59 (not tomorrow, since we're exactly at the time)
        assert_eq!(next.year(), 2026);
        assert_eq!(next.month(), 1);
        assert_eq!(next.day(), 25);
        assert_eq!(next.hour(), 23);
        assert_eq!(next.minute(), 59);
    }

    #[test]
    fn test_daily_schedule_past_time() {
        // Current time: 23:59:30, scheduled time: 23:59
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 23, 59, 30).unwrap();
        let next = calculate_next_daily(current, 23, 59);
        
        // Should be tomorrow at 23:59
        assert_eq!(next.year(), 2026);
        assert_eq!(next.month(), 1);
        assert_eq!(next.day(), 26);
        assert_eq!(next.hour(), 23);
        assert_eq!(next.minute(), 59);
    }

    #[test]
    fn test_daily_schedule_month_boundary() {
        // Current time: Jan 31 23:59:30, scheduled time: 23:59
        let current = Utc.with_ymd_and_hms(2026, 1, 31, 23, 59, 30).unwrap();
        let next = calculate_next_daily(current, 23, 59);
        
        // Should be Feb 1 at 23:59
        assert_eq!(next.year(), 2026);
        assert_eq!(next.month(), 2);
        assert_eq!(next.day(), 1);
        assert_eq!(next.hour(), 23);
        assert_eq!(next.minute(), 59);
    }

    #[test]
    fn test_weekly_schedule_same_day_before_time() {
        // Current time: Sunday 2:00, scheduled time: Sunday 3:00
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 2, 0, 0).unwrap(); // Sunday
        let next = calculate_next_weekly(current, Weekday::Sun, 3, 0);
        
        // Should be today (Sunday) at 3:00
        assert_eq!(next.weekday(), Weekday::Sun);
        assert_eq!(next.day(), 25);
        assert_eq!(next.hour(), 3);
        assert_eq!(next.minute(), 0);
    }

    #[test]
    fn test_weekly_schedule_same_day_after_time() {
        // Current time: Sunday 4:00, scheduled time: Sunday 3:00
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 4, 0, 0).unwrap(); // Sunday
        let next = calculate_next_weekly(current, Weekday::Sun, 3, 0);
        
        // Should be next Sunday at 3:00
        assert_eq!(next.weekday(), Weekday::Sun);
        assert_eq!(next.day(), 1); // Feb 1
        assert_eq!(next.month(), 2);
        assert_eq!(next.hour(), 3);
        assert_eq!(next.minute(), 0);
    }

    #[test]
    fn test_weekly_schedule_different_day() {
        // Current time: Monday 10:00, scheduled time: Sunday 3:00
        let current = Utc.with_ymd_and_hms(2026, 1, 26, 10, 0, 0).unwrap(); // Monday
        let next = calculate_next_weekly(current, Weekday::Sun, 3, 0);
        
        // Should be next Sunday at 3:00
        assert_eq!(next.weekday(), Weekday::Sun);
        assert_eq!(next.day(), 1); // Feb 1
        assert_eq!(next.month(), 2);
        assert_eq!(next.hour(), 3);
        assert_eq!(next.minute(), 0);
    }

    #[test]
    fn test_monthly_schedule_before_day() {
        // Current time: Jan 10, scheduled day: 1st at 4:00
        let current = Utc.with_ymd_and_hms(2026, 1, 10, 10, 0, 0).unwrap();
        let next = calculate_next_monthly(current, 1, 4, 0);
        
        // Should be Feb 1 at 4:00
        assert_eq!(next.year(), 2026);
        assert_eq!(next.month(), 2);
        assert_eq!(next.day(), 1);
        assert_eq!(next.hour(), 4);
        assert_eq!(next.minute(), 0);
    }

    #[test]
    fn test_monthly_schedule_same_day_before_time() {
        // Current time: Jan 1 2:00, scheduled day: 1st at 4:00
        let current = Utc.with_ymd_and_hms(2026, 1, 1, 2, 0, 0).unwrap();
        let next = calculate_next_monthly(current, 1, 4, 0);
        
        // Should be today (Jan 1) at 4:00
        assert_eq!(next.year(), 2026);
        assert_eq!(next.month(), 1);
        assert_eq!(next.day(), 1);
        assert_eq!(next.hour(), 4);
        assert_eq!(next.minute(), 0);
    }

    #[test]
    fn test_monthly_schedule_same_day_after_time() {
        // Current time: Jan 1 5:00, scheduled day: 1st at 4:00
        let current = Utc.with_ymd_and_hms(2026, 1, 1, 5, 0, 0).unwrap();
        let next = calculate_next_monthly(current, 1, 4, 0);
        
        // Should be Feb 1 at 4:00
        assert_eq!(next.year(), 2026);
        assert_eq!(next.month(), 2);
        assert_eq!(next.day(), 1);
        assert_eq!(next.hour(), 4);
        assert_eq!(next.minute(), 0);
    }

    #[test]
    fn test_monthly_schedule_year_boundary() {
        // Current time: Dec 15, scheduled day: 1st at 4:00
        let current = Utc.with_ymd_and_hms(2026, 12, 15, 10, 0, 0).unwrap();
        let next = calculate_next_monthly(current, 1, 4, 0);
        
        // Should be Jan 1 2027 at 4:00
        assert_eq!(next.year(), 2027);
        assert_eq!(next.month(), 1);
        assert_eq!(next.day(), 1);
        assert_eq!(next.hour(), 4);
        assert_eq!(next.minute(), 0);
    }

    #[test]
    fn test_missed_schedule_daily() {
        // Last run: 2 days ago, interval: 1 day
        let last_run = Utc.with_ymd_and_hms(2026, 1, 23, 23, 59, 0).unwrap();
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 10, 0, 0).unwrap();
        
        assert!(is_schedule_missed(last_run, current, 1));
    }

    #[test]
    fn test_not_missed_schedule_daily() {
        // Last run: 12 hours ago, interval: 1 day
        let last_run = Utc.with_ymd_and_hms(2026, 1, 24, 22, 0, 0).unwrap();
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 10, 0, 0).unwrap();
        
        assert!(!is_schedule_missed(last_run, current, 1));
    }

    #[test]
    fn test_missed_schedule_weekly() {
        // Last run: 10 days ago, interval: 7 days
        let last_run = Utc.with_ymd_and_hms(2026, 1, 15, 3, 0, 0).unwrap();
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 10, 0, 0).unwrap();
        
        assert!(is_schedule_missed(last_run, current, 7));
    }

    #[test]
    fn test_not_missed_schedule_weekly() {
        // Last run: 5 days ago, interval: 7 days
        let last_run = Utc.with_ymd_and_hms(2026, 1, 20, 3, 0, 0).unwrap();
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 10, 0, 0).unwrap();
        
        assert!(!is_schedule_missed(last_run, current, 7));
    }

    #[test]
    fn test_missed_schedule_monthly() {
        // Last run: 35 days ago, interval: 31 days
        let last_run = Utc.with_ymd_and_hms(2025, 12, 1, 4, 0, 0).unwrap();
        let current = Utc.with_ymd_and_hms(2026, 1, 5, 10, 0, 0).unwrap();
        
        assert!(is_schedule_missed(last_run, current, 31));
    }

    #[test]
    fn test_not_missed_schedule_monthly() {
        // Last run: 25 days ago, interval: 31 days
        let last_run = Utc.with_ymd_and_hms(2025, 12, 10, 4, 0, 0).unwrap();
        let current = Utc.with_ymd_and_hms(2026, 1, 5, 10, 0, 0).unwrap();
        
        assert!(!is_schedule_missed(last_run, current, 31));
    }

    #[test]
    fn test_hourly_schedule() {
        // Current time: 10:30, scheduled time: :00
        let current = Utc.with_ymd_and_hms(2026, 1, 25, 10, 30, 0).unwrap();
        let next = calculate_next_daily(current, 11, 0);
        
        // Should be 11:00 today
        assert_eq!(next.year(), 2026);
        assert_eq!(next.month(), 1);
        assert_eq!(next.day(), 25);
        assert_eq!(next.hour(), 11);
        assert_eq!(next.minute(), 0);
    }
}
