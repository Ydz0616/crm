require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
require('module-alias/register');

const mongoose = require('mongoose');

// Connect to database
mongoose.connect(process.env.DATABASE, {
  tls: true,
  tlsAllowInvalidCertificates: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});

// Load models
require('../models/appModels/Merch');

const migrateMerchDocuments = async () => {
  try {
    console.log('🚀 Migrating Merch documents to add VAT and ETR fields...');
    
    const Merch = mongoose.model('Merch');
    const existingDocs = await Merch.find({ 
      $or: [
        { VAT: { $exists: false } },
        { ETR: { $exists: false } }
      ],
      removed: false
    });
    
    console.log(`Found ${existingDocs.length} Merch documents to update`);
    
    for (const doc of existingDocs) {
      // Set default values for VAT and ETR
      if (!doc.VAT) doc.VAT = 1.13; // Default VAT value
      if (!doc.ETR) doc.ETR = 0.13; // Default ETR value
      
      await doc.save();
      console.log(`Updated Merch: ${doc.serialNumber}`);
    }
    
    console.log('✅ Merch documents migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error migrating Merch documents:', error);
    process.exit(1);
  }
};

// Run migration
migrateMerchDocuments(); 