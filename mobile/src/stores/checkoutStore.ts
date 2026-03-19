import { RankedTrip } from '../types/trip';
import { Passenger, BookingResponse } from '../types/booking';

let _trip: RankedTrip | null = null;
let _adults: number = 1;
let _passengers: Passenger[] = [];
let _bookingResult: BookingResponse | null = null;

export function setCheckoutTrip(trip: RankedTrip, adults: number): void {
  _trip = trip;
  _adults = adults;
  _passengers = [];
  _bookingResult = null;
}

export function getCheckoutTrip(): RankedTrip | null {
  return _trip;
}

export function getCheckoutAdults(): number {
  return _adults;
}

export function setPassengers(passengers: Passenger[]): void {
  _passengers = passengers;
}

export function getPassengers(): Passenger[] {
  return _passengers;
}

export function setBookingResult(result: BookingResponse): void {
  _bookingResult = result;
}

export function getBookingResult(): BookingResponse | null {
  return _bookingResult;
}

export function clearCheckout(): void {
  _trip = null;
  _adults = 1;
  _passengers = [];
  _bookingResult = null;
}
