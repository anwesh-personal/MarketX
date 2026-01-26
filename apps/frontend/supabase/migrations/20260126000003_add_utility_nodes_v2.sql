-- ============================================================
-- V2 UTILITY NODES MIGRATION
-- Adds flow control and utility nodes for complete workflow capabilities
-- ============================================================

-- ============================================================
-- CATEGORY: UTILITY (New Category)
-- Flow control, branching, and utility nodes
-- ============================================================

INSERT INTO node_palette (id, node_type, category, name, description, icon, color, features, capabilities, default_config, config_schema, is_active)
VALUES

-- Condition Node (If/Else branching)
(
    'nd-condition-if-else',
    'condition-if-else',
    'utility',
    'If/Else Condition',
    'Branch workflow based on condition evaluation',
    'GitBranch',
    '#8B5CF6',
    '["Boolean Logic", "Expression Eval", "Multi-Branch"]',
    '["Evaluates conditions", "Supports AND/OR/NOT", "Multiple output paths"]',
    '{"condition": {"field": "", "operator": "equals", "value": ""}}',
    '[
        {"key": "condition.field", "label": "Field to Check", "type": "text", "required": true},
        {"key": "condition.operator", "label": "Operator", "type": "select", "options": [
            {"label": "Equals", "value": "equals"},
            {"label": "Not Equals", "value": "not_equals"},
            {"label": "Contains", "value": "contains"},
            {"label": "Greater Than", "value": "greater_than"},
            {"label": "Less Than", "value": "less_than"},
            {"label": "Is Empty", "value": "is_empty"},
            {"label": "Is Not Empty", "value": "is_not_empty"}
        ]},
        {"key": "condition.value", "label": "Compare Value", "type": "text"}
    ]',
    true
),

-- Switch/Router Node (Multi-way branching)
(
    'nd-condition-switch',
    'condition-switch',
    'utility',
    'Switch Router',
    'Route to different paths based on value matching',
    'Workflow',
    '#8B5CF6',
    '["Multi-Route", "Pattern Match", "Default Path"]',
    '["Value-based routing", "Regex support", "Fallback handling"]',
    '{"field": "", "cases": [], "defaultPath": true}',
    '[
        {"key": "field", "label": "Field to Route On", "type": "text", "required": true},
        {"key": "cases", "label": "Cases", "type": "array", "description": "Add case values and their target paths"}
    ]',
    true
),

-- Loop Node (Iteration)
(
    'nd-loop-foreach',
    'loop-foreach',
    'utility',
    'For Each Loop',
    'Iterate over array and process each item',
    'Repeat',
    '#06B6D4',
    '["Array Iteration", "Parallel Option", "Index Access"]',
    '["Iterates over arrays", "Parallel or sequential", "Break/continue support"]',
    '{"arrayField": "", "itemVariable": "item", "parallelExecution": false, "maxParallel": 5}',
    '[
        {"key": "arrayField", "label": "Array Field", "type": "text", "required": true, "description": "Path to array in input data"},
        {"key": "itemVariable", "label": "Item Variable Name", "type": "text", "default": "item"},
        {"key": "parallelExecution", "label": "Run in Parallel", "type": "boolean", "default": false},
        {"key": "maxParallel", "label": "Max Parallel", "type": "number", "default": 5}
    ]',
    true
),

-- Merge Node (Combine branches)
(
    'nd-merge-combine',
    'merge-combine',
    'utility',
    'Merge Branches',
    'Combine outputs from multiple parallel branches',
    'Merge',
    '#06B6D4',
    '["Wait All", "Wait Any", "Combine Results"]',
    '["Waits for branches", "Merges outputs", "Conflict resolution"]',
    '{"waitMode": "all", "mergeStrategy": "combine", "timeout": 300000}',
    '[
        {"key": "waitMode", "label": "Wait Mode", "type": "select", "options": [
            {"label": "Wait for All", "value": "all"},
            {"label": "Wait for Any", "value": "any"},
            {"label": "Wait for N", "value": "n"}
        ]},
        {"key": "mergeStrategy", "label": "Merge Strategy", "type": "select", "options": [
            {"label": "Combine All", "value": "combine"},
            {"label": "First Non-Empty", "value": "first"},
            {"label": "Custom", "value": "custom"}
        ]},
        {"key": "timeout", "label": "Timeout (ms)", "type": "number", "default": 300000}
    ]',
    true
),

-- Delay Node (Wait/Pause)
(
    'nd-delay-wait',
    'delay-wait',
    'utility',
    'Delay / Wait',
    'Pause workflow execution for specified duration',
    'Clock',
    '#F59E0B',
    '["Fixed Delay", "Dynamic Delay", "Schedule Resume"]',
    '["Pauses execution", "Dynamic delay from variable", "Resume at specific time"]',
    '{"delayType": "fixed", "duration": 5000, "unit": "ms"}',
    '[
        {"key": "delayType", "label": "Delay Type", "type": "select", "options": [
            {"label": "Fixed Duration", "value": "fixed"},
            {"label": "From Variable", "value": "variable"},
            {"label": "Until Time", "value": "until"}
        ]},
        {"key": "duration", "label": "Duration", "type": "number", "default": 5000},
        {"key": "unit", "label": "Unit", "type": "select", "options": [
            {"label": "Milliseconds", "value": "ms"},
            {"label": "Seconds", "value": "s"},
            {"label": "Minutes", "value": "m"},
            {"label": "Hours", "value": "h"}
        ]}
    ]',
    true
),

-- Human Review Node (Approval step)
(
    'nd-human-review',
    'human-review',
    'utility',
    'Human Review',
    'Pause workflow and wait for human approval',
    'UserCheck',
    '#EC4899',
    '["Approval Flow", "Edit Option", "Timeout Action"]',
    '["Pauses for review", "Allows edits", "Auto-action on timeout"]',
    '{"reviewType": "approve_reject", "timeout": 86400000, "timeoutAction": "reject", "notifyUsers": [], "showFields": []}',
    '[
        {"key": "reviewType", "label": "Review Type", "type": "select", "options": [
            {"label": "Approve / Reject", "value": "approve_reject"},
            {"label": "Edit & Continue", "value": "edit_continue"},
            {"label": "Multi-choice", "value": "multi_choice"}
        ]},
        {"key": "timeout", "label": "Timeout (ms)", "type": "number", "default": 86400000, "description": "Default: 24 hours"},
        {"key": "timeoutAction", "label": "On Timeout", "type": "select", "options": [
            {"label": "Auto Reject", "value": "reject"},
            {"label": "Auto Approve", "value": "approve"},
            {"label": "Escalate", "value": "escalate"}
        ]},
        {"key": "notifyUsers", "label": "Notify Users", "type": "array", "description": "User IDs to notify"}
    ]',
    true
),

-- Error Handler Node
(
    'nd-error-handler',
    'error-handler',
    'utility',
    'Error Handler',
    'Catch and handle errors gracefully',
    'AlertTriangle',
    '#EF4444',
    '["Catch Errors", "Retry Logic", "Fallback Path"]',
    '["Catches exceptions", "Configurable retries", "Fallback execution"]',
    '{"catchAll": true, "retryCount": 0, "retryDelay": 1000, "fallbackValue": null}',
    '[
        {"key": "catchAll", "label": "Catch All Errors", "type": "boolean", "default": true},
        {"key": "retryCount", "label": "Retry Count", "type": "number", "default": 0},
        {"key": "retryDelay", "label": "Retry Delay (ms)", "type": "number", "default": 1000},
        {"key": "fallbackValue", "label": "Fallback Value", "type": "json", "description": "Value to use if all retries fail"}
    ]',
    true
),

-- Split Node (Create parallel branches)
(
    'nd-split-parallel',
    'split-parallel',
    'utility',
    'Split Parallel',
    'Split execution into parallel branches',
    'GitFork',
    '#06B6D4',
    '["Parallel Execution", "Clone Data", "Independent Paths"]',
    '["Creates parallel paths", "Clones input data", "Independent execution"]',
    '{"branchCount": 2, "cloneInput": true}',
    '[
        {"key": "branchCount", "label": "Number of Branches", "type": "number", "default": 2},
        {"key": "cloneInput", "label": "Clone Input to Each", "type": "boolean", "default": true}
    ]',
    true
)

ON CONFLICT (id) DO UPDATE SET
    node_type = EXCLUDED.node_type,
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    features = EXCLUDED.features,
    capabilities = EXCLUDED.capabilities,
    default_config = EXCLUDED.default_config,
    config_schema = EXCLUDED.config_schema,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Log the addition
DO $$
BEGIN
    RAISE NOTICE '✅ Added 8 utility nodes to node_palette (total V2 nodes: 36)';
END $$;
