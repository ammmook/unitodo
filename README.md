# Todolist

แอปจัดการงานเรียน — **React + Vite + TypeScript + Tailwind CSS v4** ต่อกับ **Google Sheet** ผ่าน Google Apps Script
เข้าใช้ได้ต่อเมื่อล็อกอินด้วย Google เท่านั้น

```bash
npm install
npm run dev
```

`npm run build` = typecheck + build · `npm run lint` = oxlint

## ตั้งค่าก่อนใช้งาน (ทำครั้งเดียว)

**1. OAuth Client ID** — Google Cloud Console > APIs & Services > Credentials > Create OAuth client ID
ชนิด **Web application** แล้วใส่ *Authorized JavaScript origins* ให้ครบทุก origin ที่จะเปิดเว็บ
เช่น `http://localhost:5173` และโดเมนจริงตอน deploy

**2. Backend** — เปิด Google Sheet ที่จะใช้เป็นฐานข้อมูล > Extensions > Apps Script

1. วาง [code.gs](google-app-script/code.gs) ทับ `Code.gs` แล้วแก้ `GOOGLE_CLIENT_ID` ให้ตรงกับข้อ 1
2. Project Settings > ติ๊ก **Show "appsscript.json" manifest file in editor**
   แล้ววาง [appsscript.json](google-app-script/appsscript.json) ทับของเดิม — ตรงนี้เป็นตัวประกาศสิทธิ์ที่สคริปต์ต้องใช้
3. เลือกฟังก์ชัน **`setupAutomation`** ในแถบด้านบนของ editor แล้วกด **Run** หนึ่งครั้ง จากนั้นกด **Allow** ให้ครบ
4. **Deploy > New deployment > Web app** ตั้ง *Execute as* = Me และ *Who has access* = Anyone

> ข้อ 3 ข้ามไม่ได้ ถ้าข้ามจะเจอ *"คุณไม่ได้รับอนุญาตให้เรียกใช้ UrlFetchApp.fetch"*
> เพราะสคริปต์ต้องยิงออกไปตรวจ ID token กับ Google และการอนุญาตครั้งก่อน ๆ ไม่ครอบคลุมสิทธิ์ใหม่
>
> `setupAutomation` ทำ 4 อย่างในทีเดียว — ขอสิทธิ์ · ปรับหัวคอลัมน์ชีต `Works` ให้ตรงรูปแบบล่าสุด ·
> ติดตั้ง trigger รายวัน · คำนวณ priority ให้ทุกงานทันที · รันซ้ำได้ปลอดภัย ไม่เกิด trigger ซ้อน

> แก้โค้ดฝั่ง Apps Script เมื่อไหร่ ต้อง **Deploy > Manage deployments > Edit > New version** ทุกครั้ง
> ไม่งั้น URL เดิมจะยังเสิร์ฟโค้ดเวอร์ชันเก่าอยู่ · เช็คได้ด้วย action `ping` ซึ่งไม่ต้องใช้ token

**3. Frontend** — ก๊อป `.env.example` เป็น `.env.local` แล้วเติมค่า

```
VITE_GOOGLE_SHEET_API_URL=<Web app URL จากข้อ 2>
VITE_GOOGLE_CLIENT_ID=<Client ID จากข้อ 1>
```

ชีต `Users` / `Sessions` / `Subjects` / `Works` จะถูกสร้างให้เองตอนมีคนเข้าใช้ครั้งแรก
**ผู้ใช้คนแรกที่ล็อกอินจะได้สิทธิ์ admin อัตโนมัติ** (หรือกำหนดล่วงหน้าได้ที่ `BOOTSTRAP_ADMIN_EMAILS` ใน `code.gs`)

## หน้าจอในแอป

| หน้า              | ไฟล์                                         | สรุป                                                            |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------- |
| Login             | [LoginPage](src/pages/LoginPage.tsx)         | ปุ่ม Google ของจริง — ไม่ล็อกอินเข้าแอปไม่ได้                     |
| Dashboard         | [DashboardPage](src/pages/DashboardPage.tsx) | hero งานที่ใกล้ที่สุด + ไทม์ไลน์ + donut สถานะรวม                 |
| งานทั้งหมด        | [AllWorksPage](src/pages/AllWorksPage.tsx)   | ค้นหา / กรอง / รายละเอียดงาน (drawer บน desktop, sheet บนมือถือ) |
| วิชาเรียน + Admin | [SubjectsPage](src/pages/SubjectsPage.tsx)   | การ์ดวิชาพร้อมความคืบหน้า และตารางผู้ใช้สำหรับ admin              |

## Authentication และสิทธิ์

ล็อกอินด้วย **Google Sign-In จริง** ผ่าน Google Identity Services · มีปุ่มเข้าสู่ระบบ **ปุ่มเดียวทั้งแอป**
เป็นปุ่มมาตรฐานของ Google ตรง ๆ (ได้โลโก้/ฟอนต์/สัดส่วนตาม branding guideline) อยู่ที่ [LoginPage](src/pages/LoginPage.tsx)

### Flow

```
เปิดเว็บ → มี session ที่ใช้ได้ไหม?
            ├── มี   → skeleton สั้น ๆ → Dashboard        (ไม่เห็นหน้า Login เลย)
            └── ไม่มี → หน้า Login
                         ↓ [ ดำเนินการต่อด้วย Google ]
                       Google OAuth → ได้ id_token
                         ↓
                       bootstrap (คำขอเดียว: ยืนยันตัวตน + ออก session + โหลดข้อมูล)
                         ↓
                       Dashboard
```

### session ทำงานยังไง

1. ล็อกอินเสร็จได้ **Google id_token** → ส่งให้ backend **ครั้งเดียว**
2. backend ตรวจ id_token กับ Google แล้ว**ออก session token ของตัวเอง**ให้ (สุ่ม 64 ตัวอักษร อายุ 30 วัน)
   เก็บไว้ในชีต `Sessions`
3. frontend **ทิ้ง id_token ทันที** ไม่เขียนลงที่ไหน · คำขอหลังจากนี้แนบแต่ session token
4. session ต่ออายุแบบเลื่อนไปเรื่อย ๆ ทุกครั้งที่กลับมาใช้ — ใช้ต่อเนื่องก็ไม่มีวันหมดอายุ
5. **Logout เพิกถอน session ที่เซิร์ฟเวอร์จริง ๆ** — token เดิมใช้ไม่ได้อีกแม้จะยังค้างอยู่ที่ไหน
6. trigger รายวันเก็บกวาด session ที่หมดอายุออกจากชีตให้เอง

**เปิดแท็บใหม่หรือปิดเบราว์เซอร์แล้วเปิดใหม่ก็เข้าได้ทันที** ไม่ต้องกด Google ซ้ำ
จะเห็นหน้า Login อีกครั้งก็ต่อเมื่อ session หมดอายุหรือกด Logout เท่านั้น

### เก็บอะไรไว้ที่ไหน

| ที่เก็บ | เก็บอะไร |
| --- | --- |
| `localStorage` → `unitodo:session` | **session token ที่ backend ออกให้** — สุ่ม เพิกถอนได้ มีวันหมดอายุ |
| ชีต `Sessions` | ทะเบียน session ทั้งหมด (เจ้าของ / วันหมดอายุ / ใช้ล่าสุด) — เพิกถอนได้จากฝั่งเซิร์ฟเวอร์ |
| ไม่เก็บที่ไหนเลย | **รหัสผ่าน · Google id_token** — id_token ถูกใช้ครั้งเดียวตอนแลกเป็น session แล้วทิ้ง |

> ทำไมไม่ใช้ httpOnly cookie: Apps Script อยู่คนละ origin กับหน้าเว็บ จึงตั้ง cookie ให้เราไม่ได้
> และ `sessionStorage` แยกกันคนละแท็บ จึงไม่ผ่านเงื่อนไข "เปิดแท็บใหม่แล้วต้องเข้าได้เลย"
> `localStorage` จึงเป็นทางเลือกเดียวที่เหลือ — สิ่งที่เก็บจึงเป็น token ที่เพิกถอนได้ ไม่ใช่ข้อมูลรับรองของ Google

### สิทธิ์

- backend ตรวจตัวตนทุกคำขอ ไม่เชื่ออีเมลที่ฝั่ง client ส่งมาลอย ๆ ไม่ว่าทางไหน
- **ตาราง Admin เห็นได้เฉพาะบัญชีที่ `isAdmin`** — backend จะไม่ส่งรายชื่อผู้ใช้กลับมาเลยถ้าคนขอไม่ใช่ admin
  ไม่ใช่แค่ซ่อนใน UI
- กดปุ่ม 👁 ในตาราง Admin = **สวมบทเป็นผู้ใช้คนนั้นทันที** เห็นและแก้ไขได้ทุกอย่างเหมือนเจ้าตัว
  ระหว่างนั้นจะมีแถบสีเหลืองค้างไว้บนสุด กด "กลับเป็นตัวเอง" เพื่อออก
  ทุกคำขอตอนสวมบทจะแนบ `viewAs` ไปด้วย และ backend เช็คสิทธิ์ admin ซ้ำทุกครั้ง

## Priority — คำนวณให้เอง ไม่ต้องเลือก

| สถานะ           | วันที่เหลือ         | Priority     |
| --------------- | ------------------- | ------------ |
| เสร็จแล้ว        | —                   | ไม่แสดง      |
| ยังไม่เสร็จ      | เลยกำหนด            | 🔥 `Urgent`  |
| ยังไม่เสร็จ      | ครบกำหนดวันนี้       | 🔥 `Urgent`  |
| ยังไม่ได้ทำ      | 1–2 วัน             | ▲ `High`     |
| ยังไม่ได้ทำ      | 3 วัน               | ■ `Medium`   |
| ยังไม่ได้ทำ      | 4 วันขึ้นไป          | ▼ `Low`      |
| กำลังทำ         | 1 วัน               | ▲ `High`     |
| กำลังทำ         | 2–3 วัน             | ■ `Medium`   |
| กำลังทำ         | 4 วันขึ้นไป          | ▼ `Low`      |

ฟอร์มเพิ่มงานจึงไม่มีปุ่มเลือกความสำคัญแล้ว แต่จะโชว์ให้เห็นว่าวันที่ที่เลือกจะได้ระดับไหน
งานที่เสร็จแล้วไม่มีความสำคัญ — ในชีตคอลัมน์ `priority` จะเป็นช่องว่าง (ดูสถานะจากคอลัมน์ `status` แทน)

### ค่าในชีตอัปเดตเองทุกวัน

ความสำคัญถูกคำนวณสองที่ และทั้งสองที่ให้ผลตรงกันเสมอ:

| ที่ไหน                                                        | เมื่อไหร่                                     | ไว้ทำอะไร                              |
| ------------------------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| `computeWorkPriority` ใน [workFormatting.ts](src/utils/workFormatting.ts) | ทุกครั้งที่วาดหน้าจอ                | สิ่งที่ผู้ใช้เห็น — สดเสมอ ไม่มีทางค้าง |
| `recalculatePriorities` ใน [code.gs](google-app-script/code.gs)           | **trigger รายวันช่วงเที่ยงคืน** + ทุกครั้งที่เพิ่ม/แก้งาน | คอลัมน์ `priority` ในชีต |

trigger รายวันทำงานเองแม้ไม่มีใครเปิดเว็บ — เปิดชีตเช้ามาก็เห็นค่าที่ถูกต้องของวันนั้นเลย
เรียงหรือกรองใน Google Sheets ได้ตรง ๆ · รอบหนึ่งอ่านชีตครั้งเดียว เขียนครั้งเดียว และข้ามการเขียนถ้าไม่มีอะไรเปลี่ยน

จัดการ trigger เพิ่มเติมได้ที่ฟังก์ชัน `installDailyPriorityTrigger` / `removeDailyPriorityTrigger`
และเช็คว่าติดตั้งอยู่ไหมผ่าน action `ping` (ดูค่า `dailyTriggers`)

## ความเร็ว

- **เปิดแอป = ยิง API ครั้งเดียว** (`bootstrap`) ได้ user + วิชา + งาน + ตาราง admin ครบในคำขอเดียว
- **วาดจาก cache ก่อน** แล้วค่อยอัปเดตทับเมื่อของจริงมาถึง — เข้าเว็บซ้ำเห็นข้อมูลทันทีไม่ต้องรอ
- **แก้อะไรก็ขึ้นจอทันที** (optimistic) แล้วค่อยบันทึกลงชีตเบื้องหลัง
  ถ้าเซิร์ฟเวอร์ปฏิเสธจะย้อนคืนให้อัตโนมัติพร้อม toast แจ้งเตือน — ข้อมูลบนจอไม่หลุดจากของจริง
- ส่งด้วย `POST` + `Content-Type: text/plain` เพื่อไม่ให้เบราว์เซอร์ยิง preflight (ประหยัดไปหนึ่ง round-trip ทุกคำขอ)
- ฝั่ง Apps Script อ่านชีตด้วย `getValues()` ครั้งเดียวต่อชีต และ cache ผลตรวจ token ไว้ไม่ต้องถาม Google ซ้ำ

## Flow หลัก

- **เพิ่มงาน** — ปุ่ม `+ Add Work` (desktop) / FAB (มือถือ) → [AddWorkModal](src/components/work/AddWorkModal.tsx) → ตรวจฟอร์ม → ปิด modal + toast "เพิ่มงานแล้ว" พร้อมปุ่ม "ดูงาน"
- **เพิ่มวิชา** — `+ Add Subject` → [AddSubjectModal](src/components/subject/AddSubjectModal.tsx) → กรอกอีโมจิเอง (พิมพ์ได้ หรือกดเลือกจากตัวอย่าง) + ชื่อวิชา → เช็คชื่อซ้ำในเทอมเดียวกัน (เช็คซ้ำที่ backend อีกชั้น) → toast
- **ออกจากระบบ** — กด avatar ขวาบน → [UserMenu](src/components/layout/UserMenu.tsx) → เพิกถอน session ที่เซิร์ฟเวอร์ + ล้าง cache + ปิด auto sign-in แล้วกลับหน้า Login
- **เลือกเทอม** — dropdown ปีการศึกษาและเทอมบนแถบนำทาง → วิชาและงานถูกกรองตามเทอมที่เลือก
- **เปลี่ยนสถานะ / ลบงาน** — เปิดรายละเอียดงาน → เปลี่ยนสถานะหรือกดลบ → ยืนยันใน [ConfirmDialog](src/components/common/ConfirmDialog.tsx) → toast พร้อมปุ่ม Undo (Undo เขียนกลับลงชีตจริง)

## โครงสร้าง

```
google-app-script/
├── code.gs                  backend ทั้งหมด — auth, สิทธิ์, CRUD บน Google Sheet
└── appsscript.json          manifest ประกาศ OAuth scopes ที่สคริปต์ต้องใช้
src/
├── types/todolist.ts        โดเมนทั้งหมด (Work, Subject, AppUser, …)
├── lib/                     config · api (client คุยกับ Apps Script) · googleAuth (ห่อ GIS)
├── data/academicTerms.ts    ปีการศึกษา/เทอม คำนวณจากวันที่จริง
├── hooks/
│   ├── useSession           สถานะล็อกอิน — ถือ session ของ backend, คุม loading/error ตอนยืนยันตัวตน
│   ├── useTodolistStore     ข้อมูลจากเซิร์ฟเวอร์ + cache + optimistic update
│   ├── useTodolistData      มุมมองตามเทอมที่เลือก (คำนวณล้วน ๆ ไม่ถือ state)
│   └── useToasts · useMediaQuery
├── utils/workFormatting.ts  วันที่แบบไทย, นับวันคงเหลือ, สี/ป้ายของแต่ละสถานะ
├── components/              layout · common · dashboard · work · subject
└── pages/                   4 หน้าตาม design
```

## Responsive

Mobile กับ desktop ออกแบบแยกกัน ไม่ใช่แค่ย่อขนาด — มือถือใช้ bottom tab bar, การ์ดเรียงตั้ง, รายละเอียดเป็น bottom sheet,
ฟอร์มเป็น sheet ที่ปุ่มติดขอบล่าง ส่วน desktop ใช้แถบนำทางด้านบน, drawer ด้านขวา และ modal กลางจอ
ส่วนที่แชร์ DOM ชุดเดียวได้ใช้ Tailwind breakpoint (`lg:`) ส่วนที่โครงต่างกันจริง ๆ ใช้ `useMediaQuery` สลับ

## ยังไม่ได้ทำ

- กติกา priority เขียนไว้สองภาษา (TypeScript + Apps Script) แก้ที่ไหนต้องแก้อีกที่ด้วย
- ยังไม่มีปุ่มลบวิชาใน UI (backend รองรับแล้ว — `deleteSubject` ลบงานในวิชานั้นตามไปด้วย)
- ยังไม่มี UI เลื่อน/ถอดสิทธิ์ admin (backend รองรับแล้วที่ action `setAdmin`)
- แก้ไขงานได้เฉพาะสถานะกับโน้ต ยังแก้ชื่อ/วิชา/กำหนดส่งของงานเดิมไม่ได้
- ยังแก้อีโมจิของวิชาที่เพิ่มไปแล้วไม่ได้ ต้องตั้งตอนสร้าง
