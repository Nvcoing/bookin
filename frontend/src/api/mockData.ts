import type { Booking, Room, User } from "../types";

export const mockUsers: Record<string, User> = {
  admin: { id: 1, name: "Nguyễn Minh Anh", code: "CB001", email: "admin@bookin.edu.vn", role: "admin", special_needs: [] },
  lecturer: { id: 2, name: "TS. Trần Hoàng Nam", code: "GV024", email: "giangvien@bookin.edu.vn", role: "lecturer", special_needs: [] },
  student: { id: 3, name: "Lê Thu Hà", code: "SV220184", email: "sinhvien@bookin.edu.vn", role: "student", special_needs: ["leg_injury"] },
};

export const initialRooms: Room[] = [
  { id: "A.101", building: "Tòa A", floor: 1, has_elevator: true, capacity: 30, facilities: ["Máy chiếu", "Điều hòa", "Bảng trắng"], status: "active" },
  { id: "A.203", building: "Tòa A", floor: 2, has_elevator: true, capacity: 50, facilities: ["Máy chiếu", "Micro", "Điều hòa"], status: "active" },
  { id: "B.102", building: "Tòa B", floor: 1, has_elevator: false, capacity: 20, facilities: ["TV thông minh", "Bảng trắng"], status: "active" },
  { id: "B.305", building: "Tòa B", floor: 3, has_elevator: false, capacity: 40, facilities: ["Máy chiếu", "Điều hòa"], status: "active" },
  { id: "C.401", building: "Tòa C", floor: 4, has_elevator: true, capacity: 80, facilities: ["Máy chiếu", "Micro", "Loa"], status: "maintenance" },
  { id: "C.202", building: "Tòa C", floor: 2, has_elevator: true, capacity: 24, facilities: ["Máy chiếu", "Bảng trắng"], status: "active" },
];

export const initialBookings: Booking[] = [
  { id: "BK-1048", requester: "TS. Trần Hoàng Nam", requesterRole: "lecturer", room: "A.203", date: "24/06/2025", start: "08:00", end: "10:00", purpose: "Giảng dạy chuyên đề", status: "pending" },
  { id: "BK-1046", requester: "Phạm Đức Long", requesterRole: "student", room: "B.102", date: "24/06/2025", start: "13:30", end: "15:30", purpose: "Họp nhóm đồ án", status: "pending" },
  { id: "BK-1041", requester: "Lê Thu Hà", requesterRole: "student", room: "A.101", date: "22/06/2025", start: "09:00", end: "11:00", purpose: "Học nhóm", status: "approved" },
  { id: "BK-1038", requester: "Lê Thu Hà", requesterRole: "student", room: "C.202", date: "20/06/2025", start: "14:00", end: "16:00", purpose: "Bảo vệ đồ án", status: "rejected", rejectionReason: "Phòng phục vụ lịch thi." },
  { id: "BK-1032", requester: "Lê Thu Hà", requesterRole: "student", room: "B.102", date: "18/06/2025", start: "08:00", end: "09:30", purpose: "Họp câu lạc bộ", status: "cancelled" },
];
