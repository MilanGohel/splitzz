import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(cents: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
  }).format(Math.abs(cents) / 100)
}
