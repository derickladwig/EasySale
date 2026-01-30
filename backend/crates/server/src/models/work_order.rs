use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum WorkOrderStatus {
    Created,
    Estimate,
    Approved,
    InProgress,
    Completed,
    Invoiced,
    Cancelled,
}

impl WorkOrderStatus {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "Created" => Ok(WorkOrderStatus::Created),
            "Estimate" => Ok(WorkOrderStatus::Estimate),
            "Approved" => Ok(WorkOrderStatus::Approved),
            "InProgress" => Ok(WorkOrderStatus::InProgress),
            "Completed" => Ok(WorkOrderStatus::Completed),
            "Invoiced" => Ok(WorkOrderStatus::Invoiced),
            "Cancelled" => Ok(WorkOrderStatus::Cancelled),
            _ => Err(format!("Invalid work order status: {}", s)),
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            WorkOrderStatus::Created => "Created",
            WorkOrderStatus::Estimate => "Estimate",
            WorkOrderStatus::Approved => "Approved",
            WorkOrderStatus::InProgress => "InProgress",
            WorkOrderStatus::Completed => "Completed",
            WorkOrderStatus::Invoiced => "Invoiced",
            WorkOrderStatus::Cancelled => "Cancelled",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum WorkOrderLineType {
    Labor,
    Part,
    Miscellaneous,
}

impl WorkOrderLineType {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "Labor" => Ok(WorkOrderLineType::Labor),
            "Part" => Ok(WorkOrderLineType::Part),
            "Miscellaneous" => Ok(WorkOrderLineType::Miscellaneous),
            _ => Err(format!("Invalid work order line type: {}", s)),
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            WorkOrderLineType::Labor => "Labor",
            WorkOrderLineType::Part => "Part",
            WorkOrderLineType::Miscellaneous => "Miscellaneous",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkOrder {
    pub id: String,
    pub tenant_id: String,
    pub work_order_number: String,
    pub customer_id: String,
    pub vehicle_id: Option<String>,
    #[sqlx(rename = "status")]
    status_str: String,
    pub description: String,
    pub estimated_total: Option<f64>,
    pub actual_total: Option<f64>,
    pub labor_total: f64,
    pub parts_total: f64,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub invoiced_at: Option<String>,
    pub assigned_technician_id: Option<String>,
    pub is_warranty: bool,
    pub sync_version: i64,
    pub store_id: String,
}

impl WorkOrder {
    pub fn status(&self) -> WorkOrderStatus {
        WorkOrderStatus::from_str(&self.status_str).unwrap_or(WorkOrderStatus::Created)
    }

    pub fn set_status(&mut self, status: WorkOrderStatus) {
        self.status_str = status.as_str().to_string();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkOrderLine {
    pub id: String,
    pub tenant_id: String,
    pub work_order_id: String,
    #[sqlx(rename = "line_type")]
    line_type_str: String,
    pub product_id: Option<String>,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
    pub is_warranty: bool,
}

impl WorkOrderLine {
    pub fn line_type(&self) -> WorkOrderLineType {
        WorkOrderLineType::from_str(&self.line_type_str).unwrap_or(WorkOrderLineType::Miscellaneous)
    }

    pub fn set_line_type(&mut self, line_type: WorkOrderLineType) {
        self.line_type_str = line_type.as_str().to_string();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkOrderRequest {
    pub customer_id: String,
    pub vehicle_id: Option<String>,
    pub description: String,
    pub estimated_total: Option<f64>,
    pub assigned_technician_id: Option<String>,
    pub is_warranty: bool,
    pub store_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkOrderLineRequest {
    pub line_type: WorkOrderLineType,
    pub product_id: Option<String>,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub is_warranty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkOrderRequest {
    pub description: Option<String>,
    pub estimated_total: Option<f64>,
    pub assigned_technician_id: Option<String>,
    pub status: Option<WorkOrderStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkOrderResponse {
    pub id: String,
    pub work_order_number: String,
    pub customer_id: String,
    pub vehicle_id: Option<String>,
    pub status: String,
    pub description: String,
    pub estimated_total: Option<f64>,
    pub actual_total: Option<f64>,
    pub labor_total: f64,
    pub parts_total: f64,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub invoiced_at: Option<String>,
    pub assigned_technician_id: Option<String>,
    pub is_warranty: bool,
    pub lines: Vec<WorkOrderLine>,
}

impl From<WorkOrder> for WorkOrderResponse {
    fn from(work_order: WorkOrder) -> Self {
        Self {
            id: work_order.id,
            work_order_number: work_order.work_order_number,
            customer_id: work_order.customer_id,
            vehicle_id: work_order.vehicle_id,
            status: work_order.status_str,
            description: work_order.description,
            estimated_total: work_order.estimated_total,
            actual_total: work_order.actual_total,
            labor_total: work_order.labor_total,
            parts_total: work_order.parts_total,
            created_at: work_order.created_at,
            updated_at: work_order.updated_at,
            completed_at: work_order.completed_at,
            invoiced_at: work_order.invoiced_at,
            assigned_technician_id: work_order.assigned_technician_id,
            is_warranty: work_order.is_warranty,
            lines: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_work_order_status_from_str() {
        assert_eq!(
            WorkOrderStatus::from_str("Created").unwrap(),
            WorkOrderStatus::Created
        );
        assert_eq!(
            WorkOrderStatus::from_str("Completed").unwrap(),
            WorkOrderStatus::Completed
        );
        assert!(WorkOrderStatus::from_str("Invalid").is_err());
    }

    #[test]
    fn test_work_order_line_type_from_str() {
        assert_eq!(
            WorkOrderLineType::from_str("Labor").unwrap(),
            WorkOrderLineType::Labor
        );
        assert_eq!(
            WorkOrderLineType::from_str("Part").unwrap(),
            WorkOrderLineType::Part
        );
        assert!(WorkOrderLineType::from_str("Invalid").is_err());
    }
}
