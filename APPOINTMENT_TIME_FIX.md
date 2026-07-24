# Appointment Time Display Fix

## Problem
When users selected a time slot (e.g., "10:00 AM") for booking an appointment, after booking it would display a different time. This was caused by timezone conversion issues.

## Root Cause
The original code in `book.tsx` was creating the datetime string as:
```typescript
const scheduledAt = `${selectedDate}T${selectedTime}:00Z`;
```

This appended `Z` (UTC marker) to the time, which meant:
- User selects "10:00 AM" in their local timezone
- Code sends "10:00:00Z" (10:00 AM UTC)
- When displayed, JavaScript converts UTC to local timezone
- If user is in IST (UTC+5:30): 10:00 AM UTC → 3:30 PM IST ❌

## Solution
Changed the mobile app to properly convert the selected local time to UTC before sending:

```typescript
// Create a local datetime object from the selected date and time
const [hours, minutes] = selectedTime.split(':');
const localDateTime = new Date(selectedDate);
localDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

// Convert to ISO string (this will be in UTC)
const scheduledAt = localDateTime.toISOString();
```

Now:
- User selects "10:00 AM" in IST (UTC+5:30)
- Code converts to UTC: "04:30:00Z"
- When displayed back in IST: 04:30 UTC → 10:00 AM IST ✅

## Flow
1. **User Selection**: User selects date and time in local timezone
2. **Client Processing**: JavaScript Date object properly converts local time to UTC
3. **API Transmission**: UTC datetime string sent to backend (ISO format with Z)
4. **Backend Storage**: Backend stores as timezone-naive datetime (strips timezone info)
5. **API Response**: Backend returns ISO datetime string
6. **Display**: `toLocaleString()` converts back to user's local timezone

## Files Modified
- `dentai-mobile/app/appointments/book.tsx` - Fixed datetime creation to use JavaScript Date object for proper timezone conversion

## Testing
1. Book appointment at 10:00 AM local time
2. Verify appointment displays as 10:00 AM (not a different time)
3. Test across different timezones to ensure consistency
