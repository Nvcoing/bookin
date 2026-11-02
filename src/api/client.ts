import { initialBookings, initialRooms, mockUsers } from "./mockData";
import type { Booking, Recommendation, Role, Room, User } from "../types";

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
let rooms = [...initialRooms];
let bookings = [...initialBookings];

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_URL) throw new ApiError(503, "Chưa cấu hình máy chủ");
  const token = localStorage.getItem("bookin_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  });
  if (response.status === 403) throw new ApiError(403, "Bạn không có quyền thực hiện thao tác này.");
  if (response.status === 409) throw new ApiError(409, "Khung giờ đã được sử dụng.");
  if (!response.ok) throw new ApiError(response.status, "Không thể kết nối máy chủ.");
  return response.json() as Promise<T>;
}

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    if (API_URL) return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    await wait();
    if (!password) throw new ApiError(422, "Vui lòng nhập mật khẩu.");
    const role: Role = email.includes("admin") ? "admin" : email.includes("giangvien") ? "lecturer" : "student";
    return { token: "mock-jwt-token", user: mockUsers[role] };
  },
  async register(payload: Partial<User> & { password: string }): Promise<User> {
    if (API_URL) return request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    await wait();
    return { ...mockUsers.student, name: payload.name || mockUsers.student.name, email: payload.email || mockUsers.student.email, code: payload.code || mockUsers.student.code, special_needs: payload.special_needs || [] };
  },
  async rooms(): Promise<Room[]> {
    if (API_URL) return request("/rooms");
    await wait(); return [...rooms];
  },
  async saveRoom(room: Room): Promise<Room> {
    if (API_URL) return request(`/rooms/${room.id}`, { method: "PUT", body: JSON.stringify(room) });
    await wait(); rooms = rooms.some((item) => item.id === room.id) ? rooms.map((item) => item.id === room.id ? room : item) : [room, ...rooms]; return room;
  },
  async bookings(): Promise<Booking[]> {
    if (API_URL) return request("/bookings");
    await wait(); return [...bookings];
  },
  async updateBooking(id: string, status: Booking["status"], rejectionReason?: string): Promise<Booking> {
    if (API_URL) return request(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason }) });
    await wait(); const found = bookings.find((item) => item.id === id); if (!found) throw new ApiError(404, "Không tìm thấy đơn."); Object.assign(found, { status, rejectionReason }); return found;
  },
  async recommend(attendees: number, needProjector: boolean, needsAccess: boolean): Promise<{ recommendations: Recommendation[]; excluded: { room: string; reason: string }[] }> {
    if (API_URL) return request("/recommendations", { method: "POST", body: JSON.stringify({ attendees, need_projector: needProjector, temporary_flags: needsAccess ? ["leg_injury"] : [] }) });
    await wait(500);
    const excluded = rooms.filter((room) => room.status !== "active" || room.capacity < attendees || (needsAccess && room.floor > 2 && !room.has_elevator)).map((room) => ({ room: room.id, reason: room.status !== "active" ? "Đang bảo trì" : room.capacity < attendees ? "Không đủ sức chứa" : "Không phù hợp điều kiện di chuyển" }));
    const recommendations = rooms.filter((room) => !excluded.some((item) => item.room === room.id)).map((room) => {
      const health = needsAccess ? (room.floor === 1 ? 40 : room.floor === 2 && room.has_elevator ? 20 : 0) : 40;
      const equipment = needProjector ? (room.facilities.includes("Máy chiếu") ? 30 : 0) : 30;
      const ratio = attendees / room.capacity;
      const capacity = ratio >= .6 && ratio <= .9 ? 20 : ratio >= .3 ? 10 : 0;
      const location = room.building === "Tòa A" ? 10 : 5;
      return { room, health, equipment, capacity, location, total: health + equipment + capacity + location };
    }).sort((a, b) => b.total - a.total).slice(0, 3);
    return { recommendations, excluded };
  },
};
