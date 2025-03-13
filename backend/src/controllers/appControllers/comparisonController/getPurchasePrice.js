const mongoose = require('mongoose');
const Invoice = mongoose.model('Invoice');
const PurchaseOrder = mongoose.model('PurchaseOrder');
const Client = mongoose.model('Client');
const Merch = mongoose.model('Merch');

/**
 * This controller fetches the purchase price for a product based on historical data
 * It follows a hierarchy:
 * 1. Look for purchase price in the client's own invoice history
 * 2. If not found, look in the same region's client invoices
 * 3. If still not found, return empty for manual input
 */
const getPurchasePrice = async (req, res) => {
  try {
    const { itemName, clientId, VAT: requestVAT, ETR: requestETR } = req.query;

    if (!itemName || !clientId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Item name and client ID are required',
      });
    }

    // Default VAT and ETR values
    let VAT = 1.13;
    let ETR = 0.13;

    // If VAT and ETR are provided in the request, use those values
    // Otherwise, look up the merchandise in the database
    if (requestVAT && requestETR) {
      VAT = parseFloat(requestVAT);
      ETR = parseFloat(requestETR);
    } else {
      // Get merch details to calculate profit later
      const merch = await Merch.findOne({ serialNumber: itemName, removed: false });
      if (!merch) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Merchandise not found',
        });
      }

      VAT = merch.VAT || 1.13; // Default if missing
      ETR = merch.ETR || 0.13; // Default if missing
    }

    // CASE 1: Check for this client's purchase history - IMPROVED LOGIC
    // Find all invoices for this client containing the item, sorted by recency
    const clientInvoices = await Invoice.find({
      client: clientId,
      'items.itemName': itemName,
      removed: false
    }).sort({ date: -1 }); // Get most recent first

    let purchasePrice = null;
    let source = null;

    // Check each invoice until we find a valid price
    for (const invoice of clientInvoices) {
      if (invoice.relatedPurchaseOrders && invoice.relatedPurchaseOrders.length > 0) {
        // For each invoice, check all its purchase orders
        for (const poId of invoice.relatedPurchaseOrders) {
          const po = await PurchaseOrder.findOne({ 
            _id: poId, 
            removed: false,
            'items.itemName': itemName
          });
          
          if (po) {
            // Find the specific item in this PO
            const itemEntry = po.items.find(item => item.itemName === itemName);
            if (itemEntry) {
              purchasePrice = itemEntry.price;
              source = 'client_history';
              break; // Found a match, exit the PO loop
            }
          }
        }
        
        if (purchasePrice) break; // If price found, exit the invoice loop
      }
    }

    // CASE 2: Check region history if no direct client history
    if (!purchasePrice) {
      // Get current client's country
      const client = await Client.findById(clientId);
      if (!client || !client.country) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Client country information not available',
        });
      }

      // Find clients from the same region
      const regionalClients = await Client.find({
        country: client.country,
        _id: { $ne: clientId }, // Exclude current client
        removed: false
      });

      const regionalClientIds = regionalClients.map(c => c._id);

      // Find invoices from regional clients with this item, sorted by date
      const regionalInvoices = await Invoice.find({
        client: { $in: regionalClientIds },
        'items.itemName': itemName,
        removed: false
      }).sort({ date: -1 });

      // Check each invoice for purchase orders
      for (const invoice of regionalInvoices) {
        if (invoice.relatedPurchaseOrders && invoice.relatedPurchaseOrders.length > 0) {
          for (const poId of invoice.relatedPurchaseOrders) {
            const po = await PurchaseOrder.findOne({ 
              _id: poId, 
              removed: false,
              'items.itemName': itemName
            });
            
            if (po) {
              // Find the specific item in this PO
              const itemEntry = po.items.find(item => item.itemName === itemName);
              if (itemEntry) {
                purchasePrice = itemEntry.price;
                source = 'region_history';
                break; // Found a match, exit the PO loop
              }
            }
          }
          
          if (purchasePrice) break; // If price found, exit the invoice loop
        }
      }
    }

    // Return the result with merch data for profit calculation
    return res.status(200).json({
      success: true,
      result: {
        purchasePrice,
        source,
        VAT,
        ETR
      },
      message: purchasePrice ? 'Purchase price found' : 'No purchase price history found',
    });
  } catch (error) {
    console.error('Error in getPurchasePrice:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
};

module.exports = getPurchasePrice; 