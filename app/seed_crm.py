"""Seed script: Create standard CRM entities with default fields.

Usage: python -m app.seed_crm

Adds Account, Contact, Opportunity, Lead, Case, Product, Contract
entities with commonly used fields for a CRM system.
"""
import sys
from pathlib import Path

# Ensure project root is on sys.path
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from app.database import SessionLocal
from app.core.metadata import create_entity, create_field, MetaEntity


ENTITIES = [
    {
        "name": "Account",
        "label": "客户",
        "comments": "企业/组织客户信息",
        "fields": [
            ("name", "客户名称", "TEXT", {"nullable": False, "queryable": True}),
            ("phone", "联系电话", "PHONE", {}),
            ("website", "网站", "URL", {}),
            ("email", "邮箱", "EMAIL", {}),
            ("industry", "行业", "PICKLIST", {}),
            ("source", "客户来源", "PICKLIST", {}),
            ("address", "地址", "TEXT", {}),
            ("description", "描述", "TEXT", {"display_type": "TEXTAREA"}),
            ("rating", "客户等级", "PICKLIST", {}),
        ],
    },
    {
        "name": "Contact",
        "label": "联系人",
        "comments": "个人联系人信息",
        "fields": [
            ("name", "姓名", "TEXT", {"nullable": False, "queryable": True}),
            ("phone", "手机", "PHONE", {"queryable": True}),
            ("email", "邮箱", "EMAIL", {}),
            ("position", "职位", "TEXT", {}),
            ("department", "部门", "TEXT", {}),
            ("account_id", "所属客户", "REFERENCE", {"ref_entity": "Account"}),
            ("birthday", "生日", "DATE", {}),
            ("address", "地址", "TEXT", {}),
            ("description", "备注", "TEXT", {"display_type": "TEXTAREA"}),
        ],
    },
    {
        "name": "Opportunity",
        "label": "商机",
        "comments": "销售商机/潜在交易",
        "fields": [
            ("name", "商机名称", "TEXT", {"nullable": False, "queryable": True}),
            ("account_id", "客户", "REFERENCE", {"ref_entity": "Account"}),
            ("contact_id", "联系人", "REFERENCE", {"ref_entity": "Contact"}),
            ("amount", "金额", "DECIMAL", {}),
            ("stage", "阶段", "PICKLIST", {"default_value": "1"}),
            ("probability", "赢率(%)", "INTEGER", {"default_value": "0"}),
            ("expected_close_date", "预计成交日", "DATE", {}),
            ("source", "来源", "PICKLIST", {}),
            ("description", "描述", "TEXT", {"display_type": "TEXTAREA"}),
        ],
    },
    {
        "name": "Lead",
        "label": "线索",
        "comments": "潜在客户线索",
        "fields": [
            ("name", "线索名称", "TEXT", {"nullable": False, "queryable": True}),
            ("phone", "电话", "PHONE", {}),
            ("email", "邮箱", "EMAIL", {}),
            ("company", "公司", "TEXT", {}),
            ("source", "来源", "PICKLIST", {}),
            ("status", "状态", "PICKLIST", {"default_value": "1"}),
            ("description", "描述", "TEXT", {"display_type": "TEXTAREA"}),
        ],
    },
    {
        "name": "Case",
        "label": "工单",
        "comments": "客户服务请求/问题反馈",
        "fields": [
            ("subject", "主题", "TEXT", {"nullable": False, "queryable": True}),
            ("account_id", "客户", "REFERENCE", {"ref_entity": "Account"}),
            ("contact_id", "联系人", "REFERENCE", {"ref_entity": "Contact"}),
            ("priority", "优先级", "PICKLIST", {"default_value": "2"}),
            ("status", "状态", "PICKLIST", {"default_value": "1"}),
            ("category", "分类", "PICKLIST", {}),
            ("description", "描述", "TEXT", {"display_type": "TEXTAREA"}),
            ("resolution", "解决方案", "TEXT", {"display_type": "TEXTAREA"}),
        ],
    },
    {
        "name": "Product",
        "label": "产品",
        "comments": "产品目录/服务项目",
        "fields": [
            ("name", "产品名称", "TEXT", {"nullable": False, "queryable": True}),
            ("code", "产品编码", "TEXT", {"queryable": True}),
            ("category", "产品分类", "PICKLIST", {}),
            ("unit", "单位", "PICKLIST", {}),
            ("price", "单价", "DECIMAL", {}),
            ("cost", "成本价", "DECIMAL", {}),
            ("description", "描述", "TEXT", {"display_type": "TEXTAREA"}),
            ("status", "状态", "PICKLIST", {"default_value": "1"}),
        ],
    },
    {
        "name": "Contract",
        "label": "合同",
        "comments": "销售合同/协议",
        "fields": [
            ("name", "合同名称", "TEXT", {"nullable": False, "queryable": True}),
            ("contract_no", "合同编号", "TEXT", {"queryable": True}),
            ("account_id", "客户", "REFERENCE", {"ref_entity": "Account"}),
            ("amount", "合同金额", "DECIMAL", {}),
            ("start_date", "开始日期", "DATE", {}),
            ("end_date", "结束日期", "DATE", {}),
            ("status", "状态", "PICKLIST", {"default_value": "1"}),
            ("description", "描述", "TEXT", {"display_type": "TEXTAREA"}),
        ],
    },
]


def seed_crm():
    """Create CRM entities and their default fields."""
    db = SessionLocal()

    # Check what entities already exist
    existing = {e.entity_name for e in db.query(MetaEntity).all()}
    created_count = 0

    for ent_def in ENTITIES:
        name = ent_def["name"]
        if name in existing:
            print(f"  ⏭️  {name} ({ent_def['label']}) — 已存在，跳过")
            continue

        print(f"  📦 创建 {name} ({ent_def['label']})...")
        try:
            entity = create_entity(
                db,
                entity_name=name,
                entity_label=ent_def["label"],
                comments=ent_def.get("comments"),
            )
            print(f"     实体创建成功: {entity.entity_name}")

            # Create default fields
            for field_name, field_label, field_type, kwargs in ent_def["fields"]:
                try:
                    create_field(
                        db,
                        entity_name=name,
                        field_name=field_name,
                        field_label=field_label,
                        field_type=field_type,
                        **kwargs,
                    )
                except Exception as fe:
                    print(f"     ⚠️  字段 {field_name} 创建失败: {fe}")

            created_count += 1

        except Exception as e:
            print(f"     ❌ 创建失败: {e}")

    db.close()

    total = len(ENTITIES)
    print(f"\n✅ 完成: {created_count}/{total} 个实体已创建 (已有 {len(existing)} 个)")
    return created_count


if __name__ == "__main__":
    print("=" * 50)
    print("  初始化 CRM 实体...")
    print("=" * 50)
    seed_crm()
