const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'images';

/**
 * Upload a file buffer to Supabase Storage
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Public URL of the uploaded image
 */
const uploadFile = async (fileBuffer, fileName, mimeType) => {
  try {
    // Generate secure unique filename
    const ext = path.extname(fileName).toLowerCase();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now();
    const secureFileName = `img-${timestamp}-${randomSuffix}${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(secureFileName, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      // If bucket doesn't exist, try to create it (optional but helpful)
      if (error.message.includes('not found')) {
        console.log(`🚀 Bucket "${BUCKET_NAME}" not found. Creating it...`);
        await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        // Retry upload
        return await uploadFile(fileBuffer, fileName, mimeType);
      }
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(secureFileName);

    console.log(`✅ File uploaded to Supabase: ${secureFileName}`);
    return publicUrl;
  } catch (error) {
    console.error('❌ Supabase Upload Error:', error.message);
    throw new Error('Không thể upload ảnh lên hệ thống lưu trữ đám mây');
  }
};

/**
 * Delete a file from Supabase Storage by URL
 * @param {string} url - Public URL of the file
 */
const deleteFileByUrl = async (url) => {
  try {
    if (!url) return;
    
    // Extract filename from URL
    // URL pattern: https://.../storage/v1/object/public/images/filename.jpg
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    
    if (!fileName) return;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) console.warn(`⚠️ Could not delete old file from Supabase: ${fileName}`);
    else console.log(`🗑️ Deleted file from Supabase: ${fileName}`);
  } catch (error) {
    console.warn('⚠️ Error deleting file from Supabase:', error.message);
  }
};

module.exports = {
  uploadFile,
  deleteFileByUrl
};
