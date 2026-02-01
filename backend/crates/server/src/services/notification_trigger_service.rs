/**
 * Notification Trigger Service
 * 
 * Handles triggering email notifications for various events:
 * - Low stock alerts
 * - Appointment reminders
 * - Invoice notifications
 * - Work order completion
 * - Payment receipts
 */

use sqlx::SqlitePool;
use std::collections::HashMap;
use crate::services::email_service::{EmailService, EmailMessage, EmailProvider};

pub struct NotificationTriggerService {
    pool: SqlitePool,
    email_service: EmailService,
}

impl NotificationTriggerService {
    pub fn new(pool: SqlitePool, email_provider: EmailProvider) -> Self {
        let email_service = EmailService::new(pool.clone(), email_provider);
        Self {
            pool,
            email_service,
        }
    }

    /// Trigger low stock alert for a product
    pub async fn trigger_low_stock_alert(
        &self,
        tenant_id: &str,
        product_id: i64,
    ) -> Result<(), Vec<String>> {
        // Get product details
        let product = sqlx::query_as::<_, (String, String, i32, i32)>(
            r#"
            SELECT name, sku, quantity, reorder_point
            FROM products
            WHERE id = ? AND tenant_id = ?
            "#
        )
        .bind(product_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch product: {}", e)])?;

        let (product_name, sku, quantity, reorder_point) = match product {
            Some(p) => p,
            None => return Err(vec!["Product not found".to_string()]),
        };

        // Check if quantity is below reorder point
        if quantity >= reorder_point {
            return Ok(()); // No alert needed
        }

        // Get users with low stock alerts enabled
        let users = sqlx::query_as::<_, (String, Option<String>)>(
            r#"
            SELECT u.id, np.email_address
            FROM users u
            LEFT JOIN notification_preferences np ON u.id = np.user_id AND u.tenant_id = np.tenant_id
            WHERE u.tenant_id = ? 
            AND (np.low_stock_alerts = 1 OR np.low_stock_alerts IS NULL)
            AND np.email_address IS NOT NULL
            AND np.email_verified = 1
            "#
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch users: {}", e)])?;

        // Calculate recommended order quantity
        let recommended_quantity = (reorder_point * 2) - quantity;

        // Send email to each user
        for (_user_id, email_opt) in users {
            if let Some(email) = email_opt {
                let html_body = self.build_low_stock_email(
                    &product_name,
                    &sku,
                    quantity,
                    reorder_point,
                    recommended_quantity,
                );

                let plain_body = format!(
                    "Low Stock Alert\n\nProduct: {}\nSKU: {}\nCurrent Quantity: {}\nReorder Point: {}\nRecommended Order: {}\n\nPlease reorder this product to avoid stockouts.",
                    product_name, sku, quantity, reorder_point, recommended_quantity
                );

                let message = EmailMessage {
                    to: email,
                    subject: format!("Low Stock Alert: {}", product_name),
                    body_html: html_body,
                    body_text: Some(plain_body),
                    template_name: Some("low_stock_alert".to_string()),
                    template_data: None,
                };

                // Queue email for delivery
                self.email_service.queue_email(tenant_id, message, None).await?;
            }
        }

        Ok(())
    }

    /// Trigger appointment reminder
    pub async fn trigger_appointment_reminder(
        &self,
        tenant_id: &str,
        appointment_id: i64,
    ) -> Result<(), Vec<String>> {
        // Get appointment details
        let appointment = sqlx::query_as::<_, (String, String, String, String, String, String, String)>(
            r#"
            SELECT 
                c.name as customer_name,
                c.email as customer_email,
                a.scheduled_at,
                a.service_name,
                a.duration_minutes,
                u.display_name as staff_name,
                s.name as location
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN users u ON a.staff_id = u.id
            LEFT JOIN stores s ON a.store_id = s.id
            WHERE a.id = ? AND a.tenant_id = ?
            "#
        )
        .bind(appointment_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch appointment: {}", e)])?;

        let (customer_name, customer_email, scheduled_at, service_name, duration_minutes, staff_name, location) = match appointment {
            Some(a) => a,
            None => return Err(vec!["Appointment not found".to_string()]),
        };

        // Check if customer has appointment reminders enabled
        let preferences = self.email_service.get_preferences(&customer_email, tenant_id).await?;
        if !preferences.appointment_reminders {
            return Ok(()); // User has disabled reminders
        }

        let html_body = self.build_appointment_reminder_email(
            &customer_name,
            &scheduled_at,
            &service_name,
            &duration_minutes,
            &staff_name,
            &location,
        );

        let plain_body = format!(
            "Appointment Reminder\n\nHello {},\n\nDate & Time: {}\nService: {}\nDuration: {} minutes\nStaff: {}\nLocation: {}\n\nWe look forward to seeing you!",
            customer_name, scheduled_at, service_name, duration_minutes, staff_name, location
        );

        let message = EmailMessage {
            to: customer_email,
            subject: format!("Appointment Reminder: {}", scheduled_at),
            body_html: html_body,
            body_text: Some(plain_body),
            template_name: Some("appointment_reminder".to_string()),
            template_data: None,
        };

        // Schedule email for 24 hours before appointment
        let scheduled_time = chrono::DateTime::parse_from_rfc3339(&scheduled_at)
            .map_err(|e| vec![format!("Invalid appointment time: {}", e)])?;
        let reminder_time = scheduled_time - chrono::Duration::hours(24);

        self.email_service.queue_email(tenant_id, message, Some(reminder_time.with_timezone(&chrono::Utc))).await?;

        Ok(())
    }

    /// Trigger invoice notification
    pub async fn trigger_invoice_notification(
        &self,
        tenant_id: &str,
        invoice_id: i64,
    ) -> Result<(), Vec<String>> {
        // Get invoice details
        let invoice = sqlx::query_as::<_, (String, String, String, String, Option<String>, String, String, String)>(
            r#"
            SELECT 
                c.name as customer_name,
                c.email as customer_email,
                i.invoice_number,
                i.invoice_date,
                i.due_date,
                i.subtotal,
                i.tax_amount,
                i.total_amount
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.id = ? AND i.tenant_id = ?
            "#
        )
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch invoice: {}", e)])?;

        let (customer_name, customer_email, invoice_number, invoice_date, due_date, subtotal, tax_amount, total_amount) = match invoice {
            Some(i) => i,
            None => return Err(vec!["Invoice not found".to_string()]),
        };

        // Check if customer has invoice notifications enabled
        let preferences = self.email_service.get_preferences(&customer_email, tenant_id).await?;
        if !preferences.invoice_notifications {
            return Ok(()); // User has disabled notifications
        }

        // Get line items
        let line_items = sqlx::query_as::<_, (String, String, String)>(
            r#"
            SELECT description, quantity, line_total
            FROM invoice_line_items
            WHERE invoice_id = ?
            "#
        )
        .bind(invoice_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch line items: {}", e)])?;

        let html_body = self.build_invoice_notification_email(
            &customer_name,
            &invoice_number,
            &invoice_date,
            &due_date.as_deref().unwrap_or("N/A"),
            &subtotal,
            &tax_amount,
            &total_amount,
            &line_items,
        );

        let plain_body = format!(
            "Invoice\n\nHello {},\n\nInvoice Number: {}\nInvoice Date: {}\nDue Date: {}\nSubtotal: {}\nTax: {}\nTotal: {}\n\nThank you for your business!",
            customer_name, invoice_number, invoice_date, due_date.as_deref().unwrap_or("N/A"), subtotal, tax_amount, total_amount
        );

        let message = EmailMessage {
            to: customer_email,
            subject: format!("Invoice #{}", invoice_number),
            body_html: html_body,
            body_text: Some(plain_body),
            template_name: Some("invoice_notification".to_string()),
            template_data: None,
        };

        self.email_service.queue_email(tenant_id, message, None).await?;

        Ok(())
    }

    /// Trigger work order completion notification
    pub async fn trigger_work_order_completion(
        &self,
        tenant_id: &str,
        work_order_id: i64,
    ) -> Result<(), Vec<String>> {
        // Get work order details
        let work_order = sqlx::query_as::<_, (String, String, String, String)>(
            r#"
            SELECT 
                c.name as customer_name,
                c.email as customer_email,
                wo.work_order_number,
                wo.description
            FROM work_orders wo
            JOIN customers c ON wo.customer_id = c.id
            WHERE wo.id = ? AND wo.tenant_id = ?
            "#
        )
        .bind(work_order_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch work order: {}", e)])?;

        let (customer_name, customer_email, work_order_number, description) = match work_order {
            Some(wo) => wo,
            None => return Err(vec!["Work order not found".to_string()]),
        };

        // Check if customer has work order notifications enabled
        let preferences = self.email_service.get_preferences(&customer_email, tenant_id).await?;
        if !preferences.work_order_completion {
            return Ok(()); // User has disabled notifications
        }

        let html_body = format!(
            r#"
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Work Order Completed</h2>
                <p>Hello {},</p>
                <p>Your work order has been completed:</p>
                <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0;">
                    <p><strong>Work Order:</strong> {}</p>
                    <p><strong>Description:</strong> {}</p>
                </div>
                <p>Thank you for your business!</p>
                <p style="color: #666; font-size: 12px;">This is an automated notification from EasySale POS.</p>
            </body>
            </html>
            "#,
            customer_name, work_order_number, description
        );

        let plain_body = format!(
            "Work Order Completed\n\nHello {},\n\nWork Order: {}\nDescription: {}\n\nThank you for your business!",
            customer_name, work_order_number, description
        );

        let message = EmailMessage {
            to: customer_email,
            subject: format!("Work Order {} Completed", work_order_number),
            body_html: html_body,
            body_text: Some(plain_body),
            template_name: Some("work_order_completion".to_string()),
            template_data: None,
        };

        self.email_service.queue_email(tenant_id, message, None).await?;

        Ok(())
    }

    // Private helper methods for building email HTML

    fn build_low_stock_email(
        &self,
        product_name: &str,
        sku: &str,
        quantity: i32,
        reorder_point: i32,
        recommended_quantity: i32,
    ) -> String {
        // Load template from file
        let template = include_str!("../templates/email/low_stock_alert.html");
        
        // Replace placeholders
        template
            .replace("{{product_name}}", product_name)
            .replace("{{sku}}", sku)
            .replace("{{current_quantity}}", &quantity.to_string())
            .replace("{{reorder_point}}", &reorder_point.to_string())
            .replace("{{recommended_quantity}}", &recommended_quantity.to_string())
    }

    fn build_appointment_reminder_email(
        &self,
        customer_name: &str,
        appointment_datetime: &str,
        service_name: &str,
        duration: &str,
        staff_name: &str,
        location: &str,
    ) -> String {
        let template = include_str!("../templates/email/appointment_reminder.html");
        
        template
            .replace("{{customer_name}}", customer_name)
            .replace("{{appointment_datetime}}", appointment_datetime)
            .replace("{{service_name}}", service_name)
            .replace("{{duration}}", &format!("{} minutes", duration))
            .replace("{{staff_name}}", staff_name)
            .replace("{{location}}", location)
            .replace("{{confirm_url}}", "#") // TODO: Add actual confirmation URL
            .replace("{{business_phone}}", "555-0100") // TODO: Get from tenant config
            .replace("{{business_email}}", "info@easysale.local") // TODO: Get from tenant config
    }

    fn build_invoice_notification_email(
        &self,
        customer_name: &str,
        invoice_number: &str,
        invoice_date: &str,
        due_date: &str,
        subtotal: &str,
        tax_amount: &str,
        total_amount: &str,
        line_items: &[(String, String, String)],
    ) -> String {
        let template = include_str!("../templates/email/invoice_notification.html");
        
        // Build line items HTML
        let line_items_html = line_items
            .iter()
            .map(|(desc, qty, total)| {
                format!(
                    r#"<tr style="border-top: 1px solid #eeeeee;">
                        <td style="padding: 12px; color: #333333;">{}</td>
                        <td style="text-align: right; padding: 12px; color: #666666;">{}</td>
                        <td style="text-align: right; padding: 12px; color: #666666;">{}</td>
                    </tr>"#,
                    desc, qty, total
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        template
            .replace("{{customer_name}}", customer_name)
            .replace("{{invoice_number}}", invoice_number)
            .replace("{{invoice_date}}", invoice_date)
            .replace("{{due_date}}", due_date)
            .replace("{{subtotal}}", subtotal)
            .replace("{{tax_amount}}", tax_amount)
            .replace("{{total_amount}}", total_amount)
            .replace("{{#each line_items}}", "")
            .replace("{{/each}}", "")
            .replace("{{line_items}}", &line_items_html)
            .replace("{{invoice_url}}", "#") // TODO: Add actual invoice URL
            .replace("{{payment_url}}", "#") // TODO: Add actual payment URL
            .replace("{{business_name}}", "EasySale") // TODO: Get from tenant config
            .replace("{{business_address}}", "123 Main St") // TODO: Get from tenant config
            .replace("{{business_phone}}", "555-0100") // TODO: Get from tenant config
            .replace("{{business_email}}", "info@easysale.local") // TODO: Get from tenant config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_build_low_stock_email() {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        let service = NotificationTriggerService::new(pool, EmailProvider::Mock);
        
        let html = service.build_low_stock_email("Test Product", "SKU-123", 5, 10, 15);
        
        assert!(html.contains("Test Product"));
        assert!(html.contains("SKU-123"));
        assert!(html.contains("5"));
        assert!(html.contains("10"));
        assert!(html.contains("15"));
    }
}
