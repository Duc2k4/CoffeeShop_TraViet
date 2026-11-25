# 🍵 Trà Việt – Website Đặt Hàng Trực Tuyến & Màn Hình Quản Trị Nhà Bếp Real-Time (KDS)

![Trà Việt Banner](frontend/images/hero_bg.png)

Hệ thống Website thương mại điện tử chuyên nghiệp dành cho thương hiệu **Trà Việt**, tích hợp giỏ hàng thông minh, tùy chỉnh đồ uống chi tiết, thanh toán mã VietQR tự động và màn hình Nhà Bếp (KDS) nhận đơn hàng thời gian thực (Real-Time SSE).

---

## 🌟 Tính Năng Nổi Bật

### 1. 🚀 Trải Nghiệm Khách Hàng Nâng Cao (Front-End)
- **Local Cart (Giỏ hàng thông minh)**: Lưu trữ dữ liệu giỏ hàng tự động vào `LocalStorage` trình duyệt, duy trì trạng thái giỏ hàng liên tục trên tất cả các trang.
- **Modal Tùy Chỉnh Đồ Uống (Customization Modal)**:
  - **Chọn Size**: Size M (Standard), Size L (+7.000đ).
  - **Mức Đường**: 100%, 70%, 50%, 30%, 0% (Không đường).
  - **Mức Đá**: 100%, 70%, 50%, Không đá.
  - **Topping Thêm (+7.000đ/loại)**: Trân châu đen, Trân châu trắng, Thạch nha đam, Thạch trái cây, Pudding trứng, Kem phô mai, Thạch cà phê, Nước cốt dừa.
  - **Ghi chú riêng**: Dành cho tài xế & nhà bếp pha chế.
- **Hiệu Ứng Ly Trà Bay Vào Giỏ (Fly-To-Cart Animation)**: Quỹ đạo chuyển động cong 3D mượt mà rơi trực tiếp vào giỏ hàng nổi góc màn hình.
- **Trang Thanh Toán Mock-Up (`checkout.html`)**:
  - Tóm tắt đơn hàng, phí ship (Freeship cho đơn từ 150k), ô nhập mã giảm giá (`TRAVIET20`, `FREESHIP`).
  - Hỗ trợ 3 phương thức: **COD (Tiền mặt)**, **Ví MoMo**, và **Chuyển khoản Ngân Hàng VietQR** (Tự động sinh mã QR VietQR chứa đúng số tiền và cú pháp mã đơn).

### 2. ⚙️ Back-End & Màn Hình Quản Trị Real-Time (KDS Dashboard)
- **Node.js Server Standalone (`backend/server.js`)**:
  - Kết nối MySQL để lưu thực đơn và đơn hàng; cung cấp RESTful APIs (`/api/menu`, `/api/orders`).
- **Real-Time Order Stream (Server-Sent Events)**:
  - Tự động phát **tín hiệu chuông báo (Sound Chime Alert)** tức thì cho nhà bếp ngay khi khách hàng bấm Đặt hàng.
- **Màn hình Quản Trị Nhà Bếp (`admin.html`)**:
  - Cập nhật trạng thái đơn hàng 1-touch: `Mới` ➔ `Đang pha chế` ➔ `Đang giao` ➔ `Hoàn thành`.
  - **Công tắc "Hết Hàng" (Out of Stock Toggle)**: Bật/tắt tức thì ➔ Nút mua sản phẩm trên `menu.html` sẽ tự động vô hiệu hóa và hiển thị nhãn *"Tạm Hết Hàng"*.
  - Thêm/Sửa/Xóa món ăn trực tiếp từ giao diện Admin.
  - **Giả Lập Webhook VietQR**: Thử nghiệm nhận diện tiền về tự động.

---

## 📂 Cấu Trúc Thư Mục Dự Án (Clean Architecture)

```text
TMD/
├── backend/                  <-- Mã nguồn Back-End (Node.js REST API & SSE)
│   ├── config/
│   │   ├── constants.js      <-- Cấu hình Port, Đường dẫn dự án
│   │   └── schema.sql        <-- Tạo database và các bảng MySQL
│   ├── data/
│   │   ├── menu.json         <-- Dữ liệu cũ để chuyển sang MySQL
│   │   └── orders.json       <-- Dữ liệu cũ để chuyển sang MySQL
│   ├── routes/
│   │   ├── menuRoutes.js     <-- Controllers API Menu (CRUD & Toggle stock)
│   │   ├── orderRoutes.js    <-- Controllers API Đơn hàng & SSE Stream
│   │   └── webhookRoutes.js  <-- Controllers Giả lập Webhook VietQR
│   ├── utils/
│   │   ├── mysqlDb.js        <-- Kết nối và định dạng dữ liệu MySQL
│   │   └── sseManager.js     <-- Quản lý kết nối Real-time KDS nhà bếp
│   ├── scripts/
│   │   └── migrate-json-to-mysql.js <-- Nhập dữ liệu JSON cũ vào MySQL
│   └── server.js             <-- Back-End Server chính
│
├── frontend/                 <-- Giao diện người dùng (Front-End)
│   ├── css/
│   │   └── style.css         <-- Design System & KDS Styling
│   ├── js/
│   │   ├── main.js           <-- Mobile nav, scroll reveal
│   │   ├── cart.js           <-- Giỏ hàng LocalStorage & Customization Modal
│   │   ├── admin.js          <-- Client SSE Kitchen KDS Real-Time
│   │   └── menu-filter.js    <-- Bộ lọc menu
│   ├── images/               <-- Hình ảnh sản phẩm
│   ├── index.html            <-- Trang chủ Trà Việt
│   ├── menu.html             <-- Trang Thực đơn chọn món
│   ├── checkout.html         <-- Trang Thanh toán & mã QR VietQR
│   ├── admin.html            <-- Trang Quản trị & Màn hình Nhà bếp KDS
│   ├── about.html            <-- Trang Về chúng tôi
│   ├── store.html            <-- Trang Cửa hàng
│   ├── promotions.html       <-- Trang Khuyến mãi
│   └── contact.html          <-- Trang Liên hệ
│
├── server.js                 <-- File Chạy Chính tại Root (Chạy backend & serve frontend)
├── README.md                 <-- Tài liệu hướng dẫn dự án
└── package.json              <-- Khai báo lệnh `npm start`
```

---

## 🛠️ Hướng Dẫn Khởi Chạy (Quick Start)

### Yêu cầu hệ thống:
- Đã cài đặt **Node.js** (Phiên bản v14+ trở lên).
- Đã cài đặt **MySQL Server** và **MySQL Workbench**. Workbench là giao diện quản lý; ứng dụng kết nối tới MySQL Server.

### Các bước thực hiện:

1. **Tạo database và các bảng**:
   - Mở `backend/config/schema.sql` trong MySQL Workbench.
   - Kết nối tới MySQL Server, mở file SQL và bấm nút tia sét **Execute**.

2. **Cấu hình kết nối MySQL**:
   - Sao chép `.env.example` thành `.env` tại thư mục gốc dự án.
   - Trên macOS, có thể chạy `cp .env.example .env` trong Terminal tại thư mục dự án.
   - Điền mật khẩu MySQL Server vào `MYSQL_PASSWORD` (và sửa user/port nếu cần).

3. **Cài thư viện và chuyển dữ liệu cũ (nếu có)**:
   ```bash
   npm install
   npm run migrate:json
   ```
   Lệnh migrate nhập `menu.json` và `orders.json` vào MySQL. Món/đơn có cùng ID sẽ được giữ nguyên trong database; dữ liệu JSON cũ không bị xóa.

4. **Khởi động ứng dụng**:
   ```bash
   npm start
   # Hoặc
   node server.js
   ```

5. **Truy cập ứng dụng trên trình duyệt**:
   - 🍵 **Trang Chủ**: [http://localhost:3000](http://localhost:3000)
   - 📜 **Thực Đơn Đặt Trà**: [http://localhost:3000/menu.html](http://localhost:3000/menu.html)
   - 💳 **Trang Thanh Toán**: [http://localhost:3000/checkout.html](http://localhost:3000/checkout.html)
   - 🍳 **Quản Trị Nhà Bếp KDS Real-Time**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🔒 Bảo Mật & Lưu Trữ Dữ Liệu
- Menu và đơn hàng được lưu trong MySQL database `traviet`, không còn ghi vào các file JSON khi ứng dụng chạy.
- File `.env` chứa thông tin kết nối và không nên chia sẻ hoặc đưa lên kho mã nguồn.
- `backend/data/*.json` chỉ được dùng làm nguồn dữ liệu khi chuyển đổi ban đầu; sau khi chuyển xong có thể giữ lại làm bản sao lưu.

---

## 📄 Giấy Phép
Dự án được bảo lưu mọi quyền bởi **Trà Việt Traditional Tea © 2026**.

Built by ItsDucc__
