/**
 * Seed script for Time Engine sample data
 * 
 * Usage: npx ts-node scripts/seed-time-slices.ts
 * 
 * This script populates the database with a 2-week sample dataset
 * for testing the Time Engine and Time History UI.
 * 
 * Requires: DATABASE_URL and API_SECRET environment variables
 * (Set via .env file or export before running)
 */

// Load environment variables from .env file before any other imports
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { TimeDimension, TimeSource } from '@prisma/client';
import { prisma, disconnect } from '../src/prisma';

interface SampleTimeSlice {
  start: string;
  end: string | null;
  category: string;
  dimension: TimeDimension;
  source: TimeSource;
  linkedTaskId?: string;
}

const sampleTimeSlices: SampleTimeSlice[] = [
  // PRIMARY dimension
  {
    start: '2025-11-21T09:00:00.000Z',
    end: '2025-11-21T11:00:00.000Z',
    category: 'Coding Sprint',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
    linkedTaskId: 'task-time-engine-spike',
  },
  {
    start: '2025-11-21T20:00:00.000Z',
    end: '2025-11-21T22:00:00.000Z',
    category: 'Gaming Session',
    dimension: 'PRIMARY',
    source: 'MANUAL',
  },
  {
    start: '2025-11-21T23:00:00.000Z',
    end: '2025-11-22T07:00:00.000Z',
    category: 'Sleep',
    dimension: 'PRIMARY',
    source: 'TIMERY',
  },
  {
    start: '2025-11-23T10:00:00.000Z',
    end: '2025-11-23T12:00:00.000Z',
    category: 'Gym & Sauna',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-24T09:00:00.000Z',
    end: '2025-11-24T12:00:00.000Z',
    category: 'Deep Work – Weekly Planning',
    dimension: 'PRIMARY',
    source: 'API',
    linkedTaskId: 'task-weekly-planning',
  },
  {
    start: '2025-11-26T18:00:00.000Z',
    end: '2025-11-26T20:00:00.000Z',
    category: 'Evening Walk & Podcast',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-28T14:00:00.000Z',
    end: '2025-11-28T16:00:00.000Z',
    category: 'Project Meeting Block',
    dimension: 'PRIMARY',
    source: 'API',
  },
  {
    start: '2025-11-29T18:00:00.000Z',
    end: '2025-11-29T21:00:00.000Z',
    category: 'Date Night (Dinner)',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-30T16:00:00.000Z',
    end: '2025-11-30T18:30:00.000Z',
    category: 'Side Project – Compass UI',
    dimension: 'PRIMARY',
    source: 'API',
    linkedTaskId: 'task-side-project-compass-ui',
  },
  {
    start: '2025-12-03T08:30:00.000Z',
    end: null,
    category: 'Coding – Time Engine',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
    linkedTaskId: 'task-implement-time-engine',
  },

  // WORK_MODE dimension
  {
    start: '2025-11-21T09:00:00.000Z',
    end: '2025-11-21T11:00:00.000Z',
    category: 'Deep Work',
    dimension: 'WORK_MODE',
    source: 'SHORTCUT',
    linkedTaskId: 'task-time-engine-spike',
  },
  {
    start: '2025-11-24T09:00:00.000Z',
    end: '2025-11-24T10:30:00.000Z',
    category: 'Deep Work',
    dimension: 'WORK_MODE',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-24T10:30:00.000Z',
    end: '2025-11-24T12:00:00.000Z',
    category: 'Shallow Work',
    dimension: 'WORK_MODE',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-28T14:00:00.000Z',
    end: '2025-11-28T15:00:00.000Z',
    category: 'Admin',
    dimension: 'WORK_MODE',
    source: 'API',
  },
  {
    start: '2025-11-30T16:00:00.000Z',
    end: '2025-11-30T18:30:00.000Z',
    category: 'Recovery',
    dimension: 'WORK_MODE',
    source: 'MANUAL',
  },
  {
    start: '2025-12-03T08:30:00.000Z',
    end: null,
    category: 'Deep Work',
    dimension: 'WORK_MODE',
    source: 'SHORTCUT',
    linkedTaskId: 'task-implement-time-engine',
  },

  // SOCIAL dimension
  {
    start: '2025-11-21T20:00:00.000Z',
    end: '2025-11-21T22:00:00.000Z',
    category: 'Discord Call',
    dimension: 'SOCIAL',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-23T11:00:00.000Z',
    end: '2025-11-23T12:00:00.000Z',
    category: 'In-Person',
    dimension: 'SOCIAL',
    source: 'MANUAL',
  },
  {
    start: '2025-11-26T19:00:00.000Z',
    end: '2025-11-26T21:00:00.000Z',
    category: 'Discord Call',
    dimension: 'SOCIAL',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-29T18:00:00.000Z',
    end: '2025-11-29T21:00:00.000Z',
    category: 'Date Night',
    dimension: 'SOCIAL',
    source: 'SHORTCUT',
  },
  {
    start: '2025-12-02T17:00:00.000Z',
    end: '2025-12-02T19:00:00.000Z',
    category: 'Family Time',
    dimension: 'SOCIAL',
    source: 'MANUAL',
  },
  {
    start: '2025-12-03T08:30:00.000Z',
    end: null,
    category: 'Discord Call',
    dimension: 'SOCIAL',
    source: 'SHORTCUT',
  },

  // SEGMENT dimension
  {
    start: '2025-11-21T07:00:00.000Z',
    end: '2025-11-21T12:00:00.000Z',
    category: 'Morning Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-21T13:00:00.000Z',
    end: '2025-11-21T17:00:00.000Z',
    category: 'Afternoon Work Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-21T20:00:00.000Z',
    end: '2025-11-21T23:00:00.000Z',
    category: 'Evening Wind-down',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-24T09:00:00.000Z',
    end: '2025-11-24T12:00:00.000Z',
    category: 'Workday Focus Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-28T14:00:00.000Z',
    end: '2025-11-28T18:00:00.000Z',
    category: 'Meetings Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-30T15:00:00.000Z',
    end: '2025-11-30T19:00:00.000Z',
    category: 'Weekend Project Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-12-03T08:00:00.000Z',
    end: null,
    category: 'Morning Build Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
];

async function seed() {
  console.log('🕒 Starting Time Engine seed...');
  console.log(`📊 Preparing to insert ${sampleTimeSlices.length} time slices\n`);

  // Clear existing time slices (optional - comment out to append)
  const existingCount = await prisma.timeSlice.count();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing time slices`);
    console.log('🗑️  Clearing existing time slices...');
    await prisma.timeSlice.deleteMany({});
    console.log('✅ Cleared existing data\n');
  }

  // Insert sample data
  const dataToInsert = sampleTimeSlices.map((slice) => ({
    start: new Date(slice.start),
    end: slice.end ? new Date(slice.end) : null,
    category: slice.category,
    dimension: slice.dimension,
    source: slice.source,
    linkedTaskId: slice.linkedTaskId || null,
  }));

  const result = await prisma.timeSlice.createMany({
    data: dataToInsert,
  });

  console.log(`✅ Successfully inserted ${result.count} time slices\n`);

  // Validate and summarize
  console.log('📊 Validation Summary:');
  console.log('─────────────────────────────────────────\n');

  // Count by dimension
  const byDimension = await prisma.timeSlice.groupBy({
    by: ['dimension'],
    _count: { id: true },
  });
  console.log('By Dimension:');
  byDimension.forEach((d) => {
    console.log(`  ${d.dimension}: ${d._count.id} slices`);
  });

  // Count by source
  const bySource = await prisma.timeSlice.groupBy({
    by: ['source'],
    _count: { id: true },
  });
  console.log('\nBy Source:');
  bySource.forEach((s) => {
    console.log(`  ${s.source}: ${s._count.id} slices`);
  });

  // Active slices (end is null)
  const activeSlices = await prisma.timeSlice.findMany({
    where: { end: null },
    orderBy: { dimension: 'asc' },
  });
  console.log(`\nActive Slices (end: null): ${activeSlices.length}`);
  activeSlices.forEach((s) => {
    console.log(`  ${s.dimension}: "${s.category}" (started: ${s.start.toISOString()})`);
  });

  // Slices with linked tasks
  const linkedSlices = await prisma.timeSlice.count({
    where: { linkedTaskId: { not: null } },
  });
  console.log(`\nSlices with linkedTaskId: ${linkedSlices}`);

  // Date range
  const oldest = await prisma.timeSlice.findFirst({
    orderBy: { start: 'asc' },
  });
  const newest = await prisma.timeSlice.findFirst({
    orderBy: { start: 'desc' },
  });
  console.log(`\nDate Range:`);
  console.log(`  Earliest: ${oldest?.start.toISOString()}`);
  console.log(`  Latest: ${newest?.start.toISOString()}`);

  console.log('\n─────────────────────────────────────────');
  console.log('✅ Seed complete!');
}

seed()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });

