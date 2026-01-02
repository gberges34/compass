-- Add togglEntryId to link TimeSlices to Toggl Track entries
ALTER TABLE "TimeSlice" ADD COLUMN "togglEntryId" TEXT;
