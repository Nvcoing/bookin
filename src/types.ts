export type Role = "student" | "lecturer" | "admin";
export type RoomStatus = "active" | "maintenance";
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface User {
  id: number;
  name: string;
  code: string;
  email: string;
  role: Role;
  special_needs: string[];
}

export interface Room {
  id: string;
  building: string;
  floor: number;
  has_elevator: boolean;
  capacity: number;
  facilities: string[];
  status: RoomStatus;
}

export interface Booking {
  id: string;
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
