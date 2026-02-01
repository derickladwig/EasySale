//! PDF Service
//!
//! Handles PDF generation for estimates with tenant branding.
//!
//! Requirements:
//! - 2.5: Estimate Generation - PDF Export
//! - Generate professional PDF layout
//! - Include company branding (logo, colors)
//! - Include line item details, totals, terms

use serde::{Deserialize, Serialize};
use tracing::{info, warn};

use crate::services::estimate_service::{Estimate, EstimateLineItem};

#[derive(Debug, thiserror::Error)]
pub enum PdfError {
    #[error("PDF generation error: {0}")]
    Generation(String),
    
    #[error("Template error: {0}")]
    Template(String),
    
    #[error("Branding asset not found: {0}")]
    AssetNotFound(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TenantBranding {
    pub company_name: String,
    pub logo_url: Option<String>,
    pub primary_color: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
}

pub struct PdfService {
    // In a real implementation, this would use a PDF library like printpdf or wkhtmltopdf
    // For now, we'll generate HTML that can be converted to PDF
}

impl PdfService {
    pub fn new() -> Self {
        Self {}
    }
    
    /// Generate estimate PDF as HTML (can be converted to PDF by frontend or external service)
    pub async fn generate_estimate_html(
        &self,
        estimate: &Estimate,
        line_items: &[EstimateLineItem],
        branding: &TenantBranding,
        customer_name: &str,
        customer_address: Option<&str>,
    ) -> Result<String, PdfError> {
        info!(
            estimate_id = %estimate.id,
            estimate_number = %estimate.estimate_number,
            "Generating estimate PDF HTML"
        );
        
        let primary_color = branding.primary_color.as_deref().unwrap_or("#2563eb");
        
        let html = format!(
            r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estimate {}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #1f2937;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }}
        
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid {};
        }}
        
        .company-info {{
            flex: 1;
        }}
        
        .company-name {{
            font-size: 24px;
            font-weight: bold;
            color: {};
            margin-bottom: 8px;
        }}
        
        .company-details {{
            font-size: 11px;
            color: #6b7280;
            line-height: 1.6;
        }}
        
        .estimate-info {{
            text-align: right;
        }}
        
        .estimate-title {{
            font-size: 28px;
            font-weight: bold;
            color: {};
            margin-bottom: 8px;
        }}
        
        .estimate-number {{
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 4px;
        }}
        
        .estimate-date {{
            font-size: 11px;
            color: #6b7280;
        }}
        
        .customer-section {{
            margin-bottom: 30px;
        }}
        
        .section-title {{
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }}
        
        .customer-name {{
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }}
        
        .customer-address {{
            font-size: 11px;
            color: #6b7280;
            line-height: 1.6;
        }}
        
        .line-items {{
            margin-bottom: 30px;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        thead {{
            background-color: {};
        }}
        
        thead th {{
            padding: 12px 8px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        thead th:last-child,
        tbody td:last-child {{
            text-align: right;
        }}
        
        tbody tr {{
            border-bottom: 1px solid #e5e7eb;
        }}
        
        tbody tr:last-child {{
            border-bottom: none;
        }}
        
        tbody td {{
            padding: 12px 8px;
            font-size: 11px;
            color: #1f2937;
        }}
        
        .description {{
            font-weight: 500;
        }}
        
        .totals {{
            margin-left: auto;
            width: 300px;
            margin-bottom: 30px;
        }}
        
        .total-row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 12px;
        }}
        
        .total-row.subtotal {{
            border-top: 1px solid #e5e7eb;
        }}
        
        .total-row.grand-total {{
            border-top: 2px solid {};
            padding-top: 12px;
            margin-top: 8px;
            font-size: 16px;
            font-weight: bold;
            color: {};
        }}
        
        .total-label {{
            color: #6b7280;
        }}
        
        .total-value {{
            font-weight: 600;
            color: #1f2937;
        }}
        
        .grand-total .total-label,
        .grand-total .total-value {{
            color: {};
        }}
        
        .terms-section {{
            margin-bottom: 20px;
        }}
        
        .terms-content {{
            font-size: 11px;
            color: #6b7280;
            line-height: 1.6;
            white-space: pre-wrap;
        }}
        
        .notes-section {{
            margin-bottom: 20px;
        }}
        
        .notes-content {{
            font-size: 11px;
            color: #6b7280;
            line-height: 1.6;
            white-space: pre-wrap;
        }}
        
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
        }}
        
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .status-draft {{
            background-color: #f3f4f6;
            color: #6b7280;
        }}
        
        .status-sent {{
            background-color: #dbeafe;
            color: #1e40af;
        }}
        
        .status-accepted {{
            background-color: #d1fae5;
            color: #065f46;
        }}
        
        .status-rejected {{
            background-color: #fee2e2;
            color: #991b1b;
        }}
        
        .status-expired {{
            background-color: #fef3c7;
            color: #92400e;
        }}
        
        @media print {{
            body {{
                padding: 20px;
            }}
            
            .no-print {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <div class="company-name">{}</div>
            <div class="company-details">
                {}
                {}
                {}
                {}
            </div>
        </div>
        <div class="estimate-info">
            <div class="estimate-title">ESTIMATE</div>
            <div class="estimate-number">{}</div>
            <div class="estimate-date">Date: {}</div>
            {}
            <div style="margin-top: 8px;">
                <span class="status-badge status-{}">{}</span>
            </div>
        </div>
    </div>
    
    <div class="customer-section">
        <div class="section-title">Bill To</div>
        <div class="customer-name">{}</div>
        {}
    </div>
    
    <div class="line-items">
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {}
            </tbody>
        </table>
    </div>
    
    <div class="totals">
        <div class="total-row subtotal">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">${:.2}</span>
        </div>
        {}
        {}
        <div class="total-row grand-total">
            <span class="total-label">Total:</span>
            <span class="total-value">${:.2}</span>
        </div>
    </div>
    
    {}
    
    {}
    
    <div class="footer">
        <p>This estimate is valid until {}</p>
        <p style="margin-top: 4px;">Thank you for your business!</p>
    </div>
</body>
</html>"#,
            estimate.estimate_number,
            primary_color,
            primary_color,
            primary_color,
            primary_color,
            primary_color,
            primary_color,
            primary_color,
            branding.company_name,
            branding.address.as_deref().map(|a| format!("{}<br>", a)).unwrap_or_default(),
            branding.phone.as_deref().map(|p| format!("Phone: {}<br>", p)).unwrap_or_default(),
            branding.email.as_deref().map(|e| format!("Email: {}<br>", e)).unwrap_or_default(),
            branding.website.as_deref().map(|w| format!("Website: {}", w)).unwrap_or_default(),
            estimate.estimate_number,
            estimate.estimate_date,
            estimate.expiration_date.as_ref().map(|d| format!("<div class=\"estimate-date\">Valid Until: {}</div>", d)).unwrap_or_default(),
            estimate.status,
            estimate.status.to_uppercase(),
            customer_name,
            customer_address.map(|a| format!("<div class=\"customer-address\">{}</div>", a)).unwrap_or_default(),
            self.generate_line_items_html(line_items),
            estimate.subtotal,
            if estimate.discount_amount > rust_decimal::Decimal::ZERO {
                format!(
                    "<div class=\"total-row\"><span class=\"total-label\">Discount:</span><span class=\"total-value\">-${:.2}</span></div>",
                    estimate.discount_amount
                )
            } else {
                String::new()
            },
            if estimate.tax_amount > rust_decimal::Decimal::ZERO {
                format!(
                    "<div class=\"total-row\"><span class=\"total-label\">Tax:</span><span class=\"total-value\">${:.2}</span></div>",
                    estimate.tax_amount
                )
            } else {
                String::new()
            },
            estimate.total_amount,
            estimate.terms.as_ref().map(|t| format!(
                "<div class=\"terms-section\"><div class=\"section-title\">Terms & Conditions</div><div class=\"terms-content\">{}</div></div>",
                t
            )).unwrap_or_default(),
            estimate.notes.as_ref().map(|n| format!(
                "<div class=\"notes-section\"><div class=\"section-title\">Notes</div><div class=\"notes-content\">{}</div></div>",
                n
            )).unwrap_or_default(),
            estimate.expiration_date.as_deref().unwrap_or("N/A"),
        );
        
        Ok(html)
    }
    
    fn generate_line_items_html(&self, line_items: &[EstimateLineItem]) -> String {
        line_items
            .iter()
            .map(|item| {
                format!(
                    "<tr><td class=\"description\">{}</td><td style=\"text-align: center;\">{:.2}</td><td style=\"text-align: right;\">${:.2}</td><td style=\"text-align: right;\">${:.2}</td></tr>",
                    item.description,
                    item.quantity,
                    item.unit_price,
                    item.line_total
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}

impl Default for PdfService {
    fn default() -> Self {
        Self::new()
    }
}
