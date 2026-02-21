import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

// Prisma v7 — dùng PG adapter để kết nối trực tiếp DB
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;


const TEMPLATES = [
  {
    name: "Master System Prompt",
    category: "system-prompt",
    type: "system-prompt",
    content: `# System Prompt cho {{agent_name}}

## Vai tro
Ban la {{agent_role}}, lam viec cho {{company_name}} trong linh vuc {{industry}}.

[AI_FILL: Mo ta chi tiet vai tro va trach nhiem cua agent]

## Phong cach giao tiep
- Giong dieu: {{tone}}
- Kenh: {{channels}}

[AI_FILL: Huong dan cu the ve cach giao tiep, xu ly tinh huong]

## Kien thuc nen tang
[AI_FILL: Cac kien thuc cot loi agent can nam vung]

## Gioi han va rang buoc
[AI_FILL: Nhung dieu agent KHONG duoc lam]

## Quy trinh xu ly
[AI_FILL: Workflow xu ly cac tinh huong pho bien]`,
    variables: {
      agent_name: "Ten agent",
      agent_role: "Vai tro agent",
      company_name: "Ten cong ty",
      industry: "Nganh nghe",
      tone: "Giong dieu",
      channels: "Kenh trien khai",
    },
  },
  {
    name: "Agent Ontology",
    category: "system-prompt",
    type: "system-prompt",
    content: `# Ontology - {{agent_name}}

## Thuc the (Entities)
[AI_FILL: Danh sach cac doi tuong chinh agent can biet: san pham, dich vu, quy trinh...]

## Quan he (Relations)
[AI_FILL: Moi quan he giua cac thuc the]

## Thuoc tinh (Attributes)
[AI_FILL: Thuoc tinh quan trong cua tung thuc the]

## Taxonomy
### Phan loai y dinh khach hang (Intent Classification)
[AI_FILL: Cac loai intent pho bien va cach xu ly]

### Phan loai san pham/dich vu
[AI_FILL: Phan loai theo {{industry}}]

## Tu khoa va thuat ngu chuyen nganh
[AI_FILL: Glossary cac thuat ngu quan trong trong {{industry}}]`,
    variables: {
      agent_name: "Ten agent",
      industry: "Nganh nghe",
    },
  },
  {
    name: "Knowledge Base",
    category: "faq",
    type: "response",
    content: `# Knowledge Base - {{company_name}}

## Thong tin cong ty
- Ten: {{company_name}}
- Nganh: {{industry}}
- Chuc nang chinh: {{function}}

[AI_FILL: Mo ta chi tiet ve cong ty, su menh, gia tri cot loi]

## San pham / Dich vu
[AI_FILL: Danh sach va mo ta chi tiet san pham/dich vu]

## FAQ - Cau hoi thuong gap
[AI_FILL: 15-20 cau hoi thuong gap va cau tra loi mau]

## Chinh sach
### Chinh sach doi tra
[AI_FILL: Chinh sach doi tra hang]

### Chinh sach bao hanh
[AI_FILL: Chinh sach bao hanh]

### Chinh sach giao hang
[AI_FILL: Chinh sach giao hang va thoi gian]

## Thong tin lien he
[AI_FILL: Cac kenh lien he, gio lam viec, dia chi]`,
    variables: {
      company_name: "Ten cong ty",
      industry: "Nganh nghe",
      function: "Chuc nang chinh",
    },
  },
  {
    name: "Guardrails & Safety",
    category: "escalation",
    type: "workflow",
    content: `# Guardrails & Safety - {{agent_name}}

## Nguyen tac an toan
1. KHONG bao gio chia se thong tin noi bo cong ty
2. KHONG dua ra loi khuyen y te, phap ly, tai chinh cu the
3. KHONG xu ly thong tin ca nhan nhay cam

[AI_FILL: Cac nguyen tac an toan cu the cho {{industry}}]

## Quy trinh chuyen tiep (Escalation)
### Khi nao can chuyen cho nguoi that
[AI_FILL: Cac trigger chuyen tiep]

### Cach chuyen tiep
[AI_FILL: Quy trinh chuyen tiep cu the]

## Xu ly tinh huong khac thuong
### Khach hang buc xuc
[AI_FILL: Quy trinh xu ly khach hang khong hai long]

### Yeu cau ngoai pham vi
[AI_FILL: Cach tu choi lich su va huong dan dung]

### Phat hien spam/abuse
[AI_FILL: Cach nhan dien va xu ly]

## Content Filtering
### Noi dung cam
[AI_FILL: Danh sach noi dung agent khong duoc tao]

### Gioi han tra loi
- Do dai toi da: {{max_response_length}} ky tu
- Ngon ngu: {{languages}}

[AI_FILL: Cac gioi han khac]`,
    variables: {
      agent_name: "Ten agent",
      industry: "Nganh nghe",
      max_response_length: "Do dai toi da cau tra loi",
      languages: "Ngon ngu ho tro",
    },
  },
  {
    name: "Test Plan",
    category: "faq",
    type: "evaluation",
    content: `# Test Plan - {{agent_name}}

## Muc tieu test
- Dam bao agent tra loi dung vai tro {{agent_role}}
- Kiem tra do chinh xac thong tin
- Danh gia chat luong giao tiep

## Test Cases

### 1. Happy Path - Cac tinh huong co ban
[AI_FILL: 5-10 test case cho luong chinh, moi case gom: input, expected output, tieu chi danh gia]

### 2. Edge Cases - Tinh huong ranh gioi
[AI_FILL: 5 test case cho tinh huong bat thuong]

### 3. Adversarial - Tinh huong thu thach
[AI_FILL: 5 test case thu tan cong/lua agent]

### 4. Domain-Specific - Chuyen nganh {{industry}}
[AI_FILL: 5 test case dac thu nganh]

## Tieu chi danh gia
| Tieu chi | Trong so | Mo ta |
|----------|----------|-------|
| Do chinh xac | 30% | Thong tin dung va day du |
| Giong dieu | 20% | Phu hop voi {{tone}} |
| An toan | 25% | Khong vi pham guardrails |
| Huu ich | 25% | Giai quyet duoc van de |

## Diem chuan
- Pass: >= 70/100
- Good: >= 80/100
- Excellent: >= 90/100`,
    variables: {
      agent_name: "Ten agent",
      agent_role: "Vai tro agent",
      industry: "Nganh nghe",
      tone: "Giong dieu",
    },
  },
];

async function main() {
  console.log("Seeding templates...");

  for (const template of TEMPLATES) {
    await prisma.template.upsert({
      where: { name: template.name },
      update: {
        category: template.category,
        type: template.type,
        content: template.content,
        variables: template.variables,
      },
      create: {
        name: template.name,
        category: template.category,
        type: template.type,
        content: template.content,
        variables: template.variables,
      },
    });
    console.log(`  Upserted: ${template.name}`);
  }

  console.log("Seeding complete!");

  // Seed default admin user
  console.log("Seeding default admin user...");
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@forge.local" },
    update: {},
    create: {
      email: "admin@forge.local",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });
  console.log("  Admin user: admin@forge.local / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
