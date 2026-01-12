/**
 * FamBam Storage Cleanup Script
 *
 * LEGO ANALOGY:
 * This script is like an inventory checker that walks through your storage room,
 * picks up each brick, and checks if it's actually attached to your castle.
 * If a brick isn't attached to anything, it's "orphaned" and can be removed.
 *
 * WHAT IT DOES:
 * 1. Lists all files in your 'posts' storage bucket (recursively)
 * 2. Gets all media URLs referenced in your database
 * 3. Compares them to find orphaned files
 * 4. Optionally deletes the orphans
 */

import { createClient } from '@supabase/supabase-js';

// ⚠️ Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://nxgekhiknodvxrfvkugk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z2VraGlrbm9kdnhyZnZrdWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzQ0MTYsImV4cCI6MjA4MTQxMDQxNn0.2euH_SsYsdg3ea8e18fJhPB0HdsR3Du-YJZokVX02Lk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const BUCKET_NAME = 'posts';
const DRY_RUN = true; // Set to false to actually delete files

/**
 * Recursively list all files in a storage bucket
 * This handles nested folders like posts/user_123/image.jpg
 */
async function listAllFiles(bucket, folder = '') {
  const allFiles = [];

  const { data, error } = await supabase
    .storage
    .from(bucket)
    .list(folder, {
      limit: 1000,
      offset: 0,
    });

  if (error) {
    console.error(`❌ Error listing folder "${folder}":`, error);
    return allFiles;
  }

  for (const item of data) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;

    // If item has no metadata.size, it's likely a folder
    if (item.id === null) {
      // It's a folder - recurse into it
      const subFiles = await listAllFiles(bucket, fullPath);
      allFiles.push(...subFiles);
    } else {
      // It's a file - add it with full path
      allFiles.push({
        ...item,
        fullPath: fullPath
      });
    }
  }

  return allFiles;
}

async function findOrphanedFiles() {
  console.log('🔍 Starting orphan detection...\n');

  // ============================================
  // STEP 1: Get all files from storage bucket (recursively)
  // ============================================
  console.log('📦 Step 1: Listing all files in storage bucket (recursively)...');

  const storageFiles = await listAllFiles(BUCKET_NAME);

  if (storageFiles.length === 0) {
    console.log('   No files found in storage bucket.\n');
    return;
  }

  console.log(`   Found ${storageFiles.length} files in storage\n`);

  // ============================================
  // STEP 2: Get all media URLs from database
  // ============================================
  console.log('🗄️  Step 2: Getting all referenced media from database...');

  const { data: dbMedia, error: dbError } = await supabase
    .from('post_media')
    .select('media_url');

  if (dbError) {
    console.error('❌ Error fetching database media:', dbError);
    return;
  }

  // Extract just the file paths from the full URLs
  // URL looks like: https://xxx.supabase.co/storage/v1/object/public/posts/path/to/file.jpg
  const referencedFiles = new Set(
    dbMedia.map(row => {
      const url = row.media_url;
      // Get everything after '/posts/'
      const match = url.match(/\/posts\/(.+)$/);
      return match ? match[1] : null;
    }).filter(Boolean)
  );

  console.log(`   Found ${referencedFiles.size} files referenced in database\n`);

  // ============================================
  // STEP 3: Find orphaned files
  // ============================================
  console.log('🔎 Step 3: Identifying orphaned files...\n');

  const orphanedFiles = [];
  let totalOrphanedSize = 0;

  for (const file of storageFiles) {
    if (!referencedFiles.has(file.fullPath)) {
      orphanedFiles.push(file);
      totalOrphanedSize += file.metadata?.size || 0;

      const sizeMB = ((file.metadata?.size || 0) / (1024 * 1024)).toFixed(2);
      console.log(`   🗑️  ORPHAN: ${file.fullPath} (${sizeMB} MB)`);
    }
  }

  // ============================================
  // STEP 4: Summary
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total files in storage:     ${storageFiles.length}`);
  console.log(`Files referenced in DB:     ${referencedFiles.size}`);
  console.log(`Orphaned files:             ${orphanedFiles.length}`);
  console.log(`Potential space savings:    ${(totalOrphanedSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log('='.repeat(50) + '\n');

  // ============================================
  // STEP 5: Delete orphans (if not dry run)
  // ============================================
  if (orphanedFiles.length === 0) {
    console.log('✅ No orphaned files found! Your storage is clean.');
    return;
  }

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files were deleted');
    console.log('   To delete orphaned files, set DRY_RUN = false\n');
  } else {
    console.log('🗑️  Deleting orphaned files...\n');

    const filesToDelete = orphanedFiles.map(f => f.fullPath);

    // Delete in batches of 100 to avoid API limits
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);

      const { error: deleteError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError);
      } else {
        deletedCount += batch.length;
        console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} files`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} orphaned files!`);
    console.log(`   Freed up approximately ${(totalOrphanedSize / (1024 * 1024)).toFixed(2)} MB`);
  }
}

// Run the script
findOrphanedFiles().catch(console.error);
