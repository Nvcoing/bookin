export type Role = "student" | "lecturer" | "admin";
export type RoomStatus = "active" | "maintenance";
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface User {
  id: number;
  name: string;
  full_name?: string;
  code: string;
  email: string;
  role: Role;
  faculty?: string | null;
  special_needs: string[];
  can_book_special_rooms?: boolean;
}

export interface Room {
  id: string;
  rawId?: number;
  code?: string;
  name?: string;
  building: string;
  floor: number;
  has_elevator: boolean;
  capacity: number;
  facilities: string[];
  status: RoomStatus;
  preferred_faculties?: string[];
  is_special?: boolean;
}

export interface Booking {
  id: string;
  rawId?: number;
  roomId?: number;
  requester: string;
  requesterRole: Role;
  room: string;
  date: string;
  start: string;
  end: string;
  purpose: string;
  status: BookingStatus;
  rejectionReason?: string;
}

export interface Recommendation {
  room: Room;
  health: number;
  equipment: number;
  capacity: number;
  location: number;
  total: number;
}

export interface ReportSummary {
  total: number;
  by_status: Record<string, number>;
}

export interface OccupancyItem {
  room_id: number;
  code: string;
  name: string;
  building: string;
  booked_hours: number;
  available_hours: number;
  occupancy_rate: number;
}

export interface OccupancyReport {
  overall_occupancy_rate: number;
  items: OccupancyItem[];
}

export interface HourCount {
  hour: number;
  count: number;
}

export interface WeekdayCount {
  weekday: number;
  count: number;
}

export interface PeakHoursReport {
  by_hour: HourCount[];
  by_weekday: WeekdayCount[];
}
