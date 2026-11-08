import mongoose from 'mongoose';

const nfcScanSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    payload: { type: String, required: true, maxlength: 4096 },
    serial: { type: String, maxlength: 128 },
    source: { type: String, enum: ['bridge', 'manual', 'web-nfc'], default: 'bridge' },
    scannedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

nfcScanSchema.index({ owner: 1, scannedAt: -1 });

export default mongoose.model('NfcScan', nfcScanSchema);
