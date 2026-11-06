import type { Booking, OccupancyReport, PeakHoursReport, Recommendation, ReportSummary, Role, Room, User } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export const FACILITY_MAP: Record<string, string> = {
  projector: "Máy chiếu",
  microphone: "Micro",
  whiteboard: "Bảng trắng",
  air_conditioner: "Điều hòa",
  computer: "Máy tính",
  video_conference: "Hội nghị trực tuyến",
};

export const REVERSE_FACILITY_MAP: Record<string, string> = {
  "Máy chiếu": "projector",
  Micro: "microphone",
  "Bảng trắng": "whiteboard",
  "Điều hòa": "air_conditioner",
  "Máy tính": "computer",
  "Hội nghị trực tuyến": "video_conference",
  "TV thông minh": "computer",
  Loa: "microphone",
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("bookin_token");
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };

  if (options?.body && !(options.body instanceof FormData || options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // not json response
    }
    const message =
      errorData.message ||
      errorData.details?.errors?.[0]?.message ||
      (response.status === 403
        ? "Bạn không có quyền thực hiện thao tác này."
        : response.status === 401
        ? "Phiên đăng nhập đã hết hạn hoặc không hợp lệ."
        : `Lỗi máy chủ (${response.status})`);
    throw new ApiError(response.status, message, errorData.code, errorData.details);
  }

  return response.json() as Promise<T>;
}

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const body = new URLSearchParams({ username: email, password });
    const authRes = await request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    localStorage.setItem("bookin_token", authRes.access_token);
    const me = await request<any>("/users/me");
    const user: User = {
      id: me.id,
      name: me.full_name,
      full_name: me.full_name,
      code: me.faculty ? `${me.faculty}-${me.id}` : `SV${String(me.id).padStart(4, "0")}`,
      email: me.email,
      role: me.role,
      faculty: me.faculty,
      special_needs: me.special_needs || [],
      can_book_special_rooms: me.can_book_special_rooms,
    };
    return { token: authRes.access_token, user };
  },

  async register(payload: { name: string; code?: string; email: string; password: string; special_needs?: string[] }): Promise<User> {
    const res = await request<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        full_name: payload.name,
        faculty: "CNTT",
        special_needs: payload.special_needs || [],
      }),
    });
    return {
      id: res.id,
      name: res.full_name,
      code: payload.code || `SV${String(res.id).padStart(4, "0")}`,
      email: res.email,
      role: res.role,
      faculty: res.faculty,
      special_needs: res.special_needs || [],
    };
  },

  async getProfile(): Promise<User> {
    const me = await request<any>("/users/me");
    return {
      id: me.id,
      name: me.full_name,
      full_name: me.full_name,
      code: me.faculty ? `${me.faculty}-${me.id}` : `SV${String(me.id).padStart(4, "0")}`,
      email: me.email,
      role: me.role,
      faculty: me.faculty,
      special_needs: me.special_needs || [],
      can_book_special_rooms: me.can_book_special_rooms,
    };
  },

  async updateProfile(payload: { name?: string; special_needs?: string[] }): Promise<User> {
    const res = await request<any>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        full_name: payload.name,
        special_needs: payload.special_needs,
      }),
    });
    return {
      id: res.id,
      name: res.full_name,
      full_name: res.full_name,
      code: res.faculty ? `${res.faculty}-${res.id}` : `SV${String(res.id).padStart(4, "0")}`,
      email: res.email,
      role: res.role,
      faculty: res.faculty,
      special_needs: res.special_needs || [],
      can_book_special_rooms: res.can_book_special_rooms,
    };
  },

  async rooms(): Promise<Room[]> {
    const res = await request<{ items: any[]; total: number }>("/rooms?size=100");
    return res.items.map((r) => ({
      id: r.code || String(r.id),
      rawId: r.id,
      code: r.code,
      name: r.name,
      building: r.building,
      floor: r.floor,
      has_elevator: r.has_elevator,
      capacity: r.capacity,
      facilities: (r.facilities || []).map((f: string) => FACILITY_MAP[f] || f),
      status: r.status,
      preferred_faculties: r.preferred_faculties,
      is_special: r.is_special,
    }));
  },

  async saveRoom(room: Room): Promise<Room> {
    const facilities = (room.facilities || []).map((f) => REVERSE_FACILITY_MAP[f] || f);
    if (room.rawId) {
      const res = await request<any>(`/rooms/${room.rawId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: room.name || `Phòng ${room.id}`,
          building: room.building,
          floor: room.floor,
          has_elevator: room.has_elevator,
          capacity: room.capacity,
          facilities,
        }),
      });
      if (res.status !== room.status) {
        await request(`/rooms/${room.rawId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: room.status }),
        });
      }
      return { ...room, status: room.status };
    } else {
      const res = await request<any>("/rooms", {
        method: "POST",
        body: JSON.stringify({
          code: room.id,
          name: room.name || `Phòng ${room.id}`,
          building: room.building,
          floor: room.floor,
          has_elevator: room.has_elevator,
          capacity: room.capacity,
          facilities,
          status: room.status,
        }),
      });
      return { ...room, rawId: res.id };
    }
  },

  async bookings(admin?: boolean): Promise<Booking[]> {
    const path = admin ? "/bookings/pending?size=100" : "/bookings/me?size=100";
    const res = await request<{ items: any[]; total: number }>(path);
    return res.items.map((b) => {
      const startDt = new Date(b.start_time);
      const endDt = new Date(b.end_time);
      const dateStr = startDt.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
      const startStr = startDt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
      const endStr = endDt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
      return {
        id: `BK-${b.id}`,
        rawId: b.id,
        roomId: b.room_id,
        requester: b.user?.full_name || "Tôi",
        requesterRole: b.user?.role || "student",
        room: b.room ? `${b.room.code}` : `Phòng #${b.room_id}`,
        date: dateStr,
        start: startStr,
        end: endStr,
        purpose: b.purpose,
        status: b.status,
        rejectionReason: b.reject_reason,
      };
    });
  },

  async updateBooking(id: string, status: Booking["status"], rejectionReason?: string): Promise<void> {
    const numericId = id.replace(/^BK-/, "");
    if (status === "approved") {
      await request(`/bookings/${numericId}/approve`, { method: "POST" });
    } else if (status === "rejected") {
      await request(`/bookings/${numericId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectionReason || "Từ chối bởi quản trị viên" }),
      });
    } else if (status === "cancelled") {
      await request(`/bookings/${numericId}/cancel`, { method: "POST" });
    }
  },

  async recommend(
    attendees: number,
    needProjector: boolean,
    needsAccess: boolean,
    dateStr?: string,
    startStr?: string,
    endStr?: string
  ): Promise<{ recommendations: Recommendation[]; excluded: { room: string; reason: string }[] }> {
    const date = dateStr || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const start = startStr || "08:00";
    const end = endStr || "10:00";
    const start_time = `${date}T${start}:00+07:00`;
    const end_time = `${date}T${end}:00+07:00`;

    const required_facilities = needProjector ? ["projector"] : [];
    const temp_special_needs = needsAccess ? ["leg_injury"] : [];

    const res = await request<{ recommendations: any[]; message?: string }>("/bookings/recommendations", {
      method: "POST",
      body: JSON.stringify({
        start_time,
        end_time,
        attendee_count: attendees,
        purpose: "Gợi ý phòng",
        required_facilities,
        temp_special_needs,
      }),
    });

    const recommendations: Recommendation[] = (res.recommendations || []).map((item) => ({
      room: {
        id: item.room.code || String(item.room.id),
        rawId: item.room.id,
        code: item.room.code,
        name: item.room.name,
        building: item.room.building,
        floor: item.room.floor,
        has_elevator: item.room.has_elevator ?? (item.room.floor <= 1),
        capacity: item.room.capacity || attendees,
        facilities: (item.room.facilities || []).map((f: string) => FACILITY_MAP[f] || f),
        status: "active",
      },
      health: item.score_breakdown.health,
      equipment: item.score_breakdown.facilities,
      capacity: item.score_breakdown.capacity,
      location: item.score_breakdown.location,
      total: item.score,
    }));

    return {
      recommendations,
      excluded: [],
    };
  },

  async createBooking(data: {
    roomId: number;
    date: string;
    start: string;
    end: string;
    attendees: number;
    purpose: string;
    needProjector: boolean;
    needsAccess: boolean;
  }): Promise<any> {
    const start_time = `${data.date}T${data.start}:00+07:00`;
    const end_time = `${data.date}T${data.end}:00+07:00`;
    return request("/bookings", {
      method: "POST",
      body: JSON.stringify({
        room_id: data.roomId,
        start_time,
        end_time,
        attendee_count: data.attendees,
        purpose: data.purpose,
        required_facilities: data.needProjector ? ["projector"] : [],
        temp_special_needs: data.needsAccess ? ["leg_injury"] : [],
      }),
    });
  },

  async reports(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const q = params.toString() ? `?${params.toString()}` : "";
    const [summary, occupancy, peak] = await Promise.all([
      request<ReportSummary>(`/reports/summary${q}`),
      request<OccupancyReport>(`/reports/occupancy${q}`),
      request<PeakHoursReport>(`/reports/peak-hours${q}`),
    ]);
    return { summary, occupancy, peak };
  },
};
