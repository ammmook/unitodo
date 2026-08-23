# Todolist — Frontend

Frontend ของแอปจัดการงานเรียน สร้างจากแบบใน `Todolist UI mockups/Todolist Mockups v2.dc.html`

**React + Vite + TypeScript + Tailwind CSS v4** · Frontend อย่างเดียว ยังไม่ต่อ backend / database / API

```bash
npm install
npm run dev
```

`npm run build` = typecheck + build · `npm run lint` = oxlint

## หน้าจอในแอป

| หน้า            | ไฟล์                                                   | สรุป                                                    |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| Login           | [LoginPage](src/pages/LoginPage.tsx)                    | ปุ่ม Google (จำลอง — กดแล้วเข้าแอปเลย)                   |
| Dashboard       | [DashboardPage](src/pages/DashboardPage.tsx)            | hero งานที่ใกล้ที่สุด + ไทม์ไลน์ + donut สถานะรวม        |
| งานทั้งหมด      | [AllWorksPage](src/pages/AllWorksPage.tsx)              | ค้นหา / กรอง / รายละเอียดงาน (drawer บน desktop, sheet บนมือถือ) |
| วิชาเรียน + Admin | [SubjectsPage](src/pages/SubjectsPage.tsx)             | การ์ดวิชาพร้อมความคืบหน้า และตารางผู้ใช้สำหรับ admin      |

## Flow หลัก

- **เพิ่มงาน** — ปุ่ม `+ Add Work` (desktop) / FAB (มือถือ) → [AddWorkModal](src/components/work/AddWorkModal.tsx) → ตรวจฟอร์ม → กำลังบันทึก → ปิด modal + toast "เพิ่มงานแล้ว" พร้อมปุ่ม "ดูงาน"
- **เพิ่มวิชา** — `+ Add Subject` → [AddSubjectModal](src/components/subject/AddSubjectModal.tsx) → เช็คชื่อซ้ำในเทอมเดียวกัน → toast
- **ออกจากระบบ** — กด avatar ขวาบน → [UserMenu](src/components/layout/UserMenu.tsx) แสดงชื่อ/อีเมล/สิทธิ์ → กด “ออกจากระบบ” → กลับหน้า Login พร้อมล้าง state ทั้งหมด
- **เลือกเทอม** — dropdown ปีการศึกษาและ dropdown เทอม แยกกันบนแถบนำทาง → วิชาและงานถูกกรองตามเทอมที่เลือก (เทอมที่ยังไม่มีข้อมูลจะขึ้น empty state)
- **เปลี่ยนสถานะ / ลบงาน** — เปิดรายละเอียดงาน → เปลี่ยนสถานะหรือกดลบ → ยืนยันใน [ConfirmDialog](src/components/common/ConfirmDialog.tsx) → toast พร้อมปุ่ม Undo

## โครงสร้าง

```
src/
├── types/todolist.ts        โดเมนทั้งหมด (Work, Subject, AppUser, …)
├── data/mockTodolist.ts     Mock data ที่เดียว — สลับไปต่อ API จริงได้โดยไม่แตะ UI
├── hooks/                   useTodolistData (state กลาง), useToasts, useMediaQuery
├── utils/workFormatting.ts  วันที่แบบไทย, นับวันคงเหลือ, สี/ป้ายของแต่ละสถานะ
├── assets/icon-nav/          ไอคอน bottom tab bar (import ผ่าน Vite จึงมี hash กัน cache)
├── components/              layout · common · dashboard · work · subject
└── pages/                   4 หน้าตาม design
```

## Responsive

Mobile กับ desktop ออกแบบแยกกัน ไม่ใช่แค่ย่อขนาด — มือถือใช้ bottom tab bar, การ์ดเรียงตั้ง, รายละเอียดเป็น bottom sheet,
ฟอร์มเป็น sheet ที่ปุ่มติดขอบล่าง ส่วน desktop ใช้แถบนำทางด้านบน, drawer ด้านขวา และ modal กลางจอ
ส่วนที่แชร์ DOM ชุดเดียวได้ใช้ Tailwind breakpoint (`lg:`) ส่วนที่โครงต่างกันจริง ๆ ใช้ `useMediaQuery` สลับ

## ยังไม่ได้ทำ (นอก scope)

- ไม่มี backend / database / API / authentication จริง — ข้อมูลอยู่ใน memory และหายเมื่อ refresh
- ปุ่ม 👁 ในตาราง Admin ยังไม่มี action — เตรียม UI ไว้รอหน้าดูข้อมูลผู้ใช้
- state "บันทึกไม่สำเร็จ / ลองอีกครั้ง" ใน mockup ยังไม่ได้ทำ เพราะยังไม่มี network จริงให้ล้มเหลว
