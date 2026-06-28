# 🌳 Hệ thống quản lý canh tác và dự đoán bệnh trên cây có múi

Đây là đồ án tốt nghiệp xây dựng một hệ thống web hỗ trợ quản lý vườn cây có múi, ghi nhận hoạt động canh tác, theo dõi chi phí và dự đoán bệnh trên lá cây bằng AI.

Hệ thống được triển khai theo mô hình 4 lớp: **Frontend → Backend → MongoDB Atlas → ML**. Người dùng thao tác trên giao diện web, backend xử lý nghiệp vụ và xác thực, MongoDB Atlas lưu dữ liệu, còn dịch vụ ML chịu trách nhiệm huấn luyện và dự đoán bệnh từ ảnh lá cây.

## 1. Mục tiêu đồ án

- Số hóa quá trình quản lý vườn cây có múi.
- Ghi nhận nhật ký canh tác, chi phí, mùa vụ và mẫu đất.
- Hỗ trợ phát hiện sớm bệnh trên lá cây bằng mô hình AI.
- Cung cấp giao diện web dễ sử dụng cho cả người dùng và admin.
- Tách biệt rõ frontend, backend, cơ sở dữ liệu và ML để dễ bảo trì, mở rộng và retrain.

## 2. Kiến trúc hệ thống

### Luồng xử lý chính

1. Người dùng đăng nhập trên frontend.
2. Frontend gửi request đến backend qua REST API.
3. Backend xác thực JWT, kiểm tra phân quyền và truy vấn MongoDB Atlas.
4. Khi người dùng tải ảnh lá cây lên, backend gửi ảnh sang dịch vụ ML.
5. ML xử lý ảnh, dự đoán bệnh và trả kết quả về backend.
6. Backend chuẩn hóa nhãn bệnh, tra cứu dữ liệu bệnh trong database và lưu lịch sử dự đoán.
7. Frontend hiển thị bệnh chính, top-k kết quả, Grad-CAM.
8. Người dùng chọn kết quả và xem tư vấn AI
9. Admin theo dõi dữ liệu huấn luyện, retrain model và xem các chỉ số đánh giá như accuracy, loss, precision, recall, F1.

### Các thành phần chính

- **Frontend:** giao diện người dùng và admin.
- **Backend:** REST API, xác thực, phân quyền, xử lý nghiệp vụ.
- **MongoDB Atlas:** lưu dữ liệu người dùng, vườn, nhật ký, chi phí, bệnh, dự đoán và cấu hình hệ thống.
- **ML Service:** xử lý ảnh, dự đoán bệnh, retrain mô hình và xuất báo cáo huấn luyện.

## 3. Công nghệ sử dụng

### Frontend

- React 18
- Vite
- TailwindCSS
- React Router
- Axios
- React Hook Form
- React Hot Toast

### Backend

- Node.js
- Express
- MongoDB Atlas
- Mongoose
- JSON Web Token
- Multer
- Axios

### Machine Learning

- Python
- TensorFlow / Keras
- MobileNetV2
- Flask
- scikit-learn
- NumPy
- Pillow

## 4. Phần mềm / môi trường cần thiết

- **Node.js:** `v24.14.0`
- **Python:** `3.10.11`
- **MongoDB:** MongoDB Atlas (Cloud)
- **Git** để clone repository
- **Trình duyệt web** như Chrome

## 5. Cấu trúc thư mục

```text
project-root/
├── README.md
├── src/
│	├── backend/
│	│   ├── src/
│	│   │   ├── controllers/
│	│   │   ├── models/
│	│   │   ├── routes/
│	│   │   └── app.js
│	│   ├── uploads/
│	│   └── scripts/
│	├── frontend/
│	│   └── src/
│	│       ├── components/
│	│       ├── pages/
│	│       ├── services/
│	│       └── App.jsx
│	└── ml/
│		├── datasets/
│		├── gop_dataset/
│		├── organized_dataset/
│		├── split_dataset/
│		├── app.py
│		└── train.py
└── docs/
	├── Hướng dẫn sử dụng.docx
	├── poster-tn-da22tta-nguyenphucan.pdf
	├── tn-da22tta-nguyenphucan.docx
	├── tn-da22tta-nguyenphucan.pdf
	├── tn-da22tta-nguyenphucan.pptx
```

## 6. Dữ liệu huấn luyện ML

Hiện tại quy trình dữ liệu được chuẩn hóa theo 3 nguồn chính:

- `src/ml/gop_dataset`: ảnh gốc từ 3 dataset nguồn.
- `src/ml/organized_dataset`: tập dữ liệu đã được hợp nhất và chuẩn hóa theo nhãn bệnh.
- `src/backend/uploads/training`: ảnh mới do admin tải lên để bổ sung dữ liệu huấn luyện (2 dataset và ảnh trên mạng).

Khi retrain, hệ thống sẽ tổng hợp dữ liệu từ các nguồn này để tạo lại tập train/validation/test và sinh báo cáo huấn luyện mới.

## 7. Tính năng chính

- Đăng nhập và xác thực JWT.
- Quản lý vườn cây, mẫu đất, nhật ký canh tác, chi phí và mùa vụ.
- Chọn nhiều mẫu đất khi thêm hoặc sửa nhật ký / chi phí.
- Dự đoán bệnh từ ảnh lá hoặc quả của cây bằng AI.
- Hiển thị top-k kết quả dự đoán và tư vấn AI.
- Trang admin quản lý dữ liệu bệnh và trạng thái huấn luyện model.
- Theo dõi kết quả train gần nhất, validation và test.
- Bật/tắt chế độ bảo trì toàn hệ thống.
- Giao diện responsive cho desktop.

## 8. Cách chạy chương trình

### 8.1 Cấu hình backend

Tạo file `.env` trong `src/backend` và cấu hình các biến môi trường cần thiết, tối thiểu gồm:

```env
MONGO_URI=...
JWT_SECRET=...
ML_API_URL=http://localhost:5000
GEMINI_API_KEY=...
```

### 8.2 Cài đặt backend

```bash
cd src/backend
npm install
```

### 8.3 Cài đặt frontend

```bash
cd src/frontend
npm install
```

### 8.4 Cài đặt ML

```bash
cd src/ml
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 8.5 Chạy toàn hệ thống

Mở 3 terminal riêng:

```bash
# Terminal 1 - Backend
cd src/backend
npm run dev
```

```bash
# Terminal 2 - Frontend
cd src/frontend
npm run dev
```

```bash
# Terminal 3 - ML
cd src/ml
python train.py
python app.py
```

## 9. Phân quyền người dùng

### User

- Đăng nhập và quản lý thông tin cá nhân.
- Quản lý vườn cây, nhật ký, chi phí, mùa vụ.
- Tải ảnh lên để dự đoán bệnh và xem tư vấn AI.
- Xem lịch sử dự đoán.

### Admin

- Quản lý dữ liệu hệ thống.
- Thêm, sửa, xóa bệnh và dữ liệu liên quan.
- Xem trạng thái huấn luyện mô hình.
- Bật/tắt chế độ bảo trì.
- Theo dõi quá trình retrain và các chỉ số đánh giá mô hình.

## 10. Thông tin đồ án

- **Tên đồ án:** Hệ thống quản lý canh tác và dự đoán bệnh trên cây có múi
- **Học phần:** Khóa luận tốt nghiệp
- **Sinh viên thực hiện:** Nguyễn Phúc An
- **Ngành:** Công nghệ Thông tin
- **Giảng viên hướng dẫn:** ThS. Phạm Minh Đương
- **Trường:** Đại học trà Vinh

## 11. Ghi chú triển khai

- Backend chạy ở `http://localhost:3000`
- Frontend chạy ở `http://localhost:5173`
- ML API chạy ở `http://localhost:5000`
- Cơ sở dữ liệu đang dùng là **MongoDB Atlas (Cloud)** với database `vuon-cay-db`
- Khi thêm dữ liệu bệnh mới, cần retrain lại model để cập nhật kết quả dự đoán
