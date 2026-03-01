const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed },
    category: {
      type: String,
      enum: ['general', 'payment', 'smtp', 'limits', 'api'],
      default: 'general'
    },
    isPublic: { type: Boolean, default: false },
    description: String
  },
  { timestamps: true }
);

platformSettingsSchema.index({ category: 1 });

// Static helper to get all settings as a key-value map
platformSettingsSchema.statics.getAll = async function (category) {
  const query = category ? { category } : {};
  const settings = await this.find(query);
  return settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
};

// Static helper to set a setting
platformSettingsSchema.statics.set = async function (key, value, category, description) {
  return this.findOneAndUpdate(
    { key },
    { key, value, category: category || 'general', description },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
