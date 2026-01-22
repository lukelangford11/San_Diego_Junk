/**
 * San Diego pricing zone configuration
 * Modular zone multipliers for easy updates
 */

export const ZONE_MULTIPLIERS = {
  // Zone 1: Core San Diego neighborhoods (ZIP 92101-92130)
  zone_1_core: {
    zips: [
      '92101', '92102', '92103', '92104', '92105', '92106', '92107', '92108', '92109',
      '92110', '92111', '92113', '92114', '92115', '92116', '92117', '92119', '92120',
      '92121', '92122', '92123', '92124', '92126', '92127', '92128', '92129', '92130'
    ],
    multiplier: 1.0,
    label: 'Core San Diego'
  },

  // Zone 2: Extended San Diego (ZIP 92131-92199)
  zone_2_extended: {
    zips: [
      '92131', '92132', '92134', '92135', '92136', '92137', '92138', '92139', '92140',
      '92142', '92143', '92145', '92147', '92149', '92150', '92152', '92153', '92154',
      '92155', '92158', '92159', '92160', '92161', '92163', '92165', '92166', '92167',
      '92168', '92169', '92170', '92171', '92172', '92173', '92174', '92175', '92176',
      '92177', '92178', '92179', '92182', '92186', '92187', '92190', '92191', '92192',
      '92193', '92194', '92195', '92196', '92197', '92198', '92199'
    ],
    multiplier: 1.15,
    label: 'Extended San Diego'
  },

  // Zone 3: Greater San Diego County (North County, East County, South Bay)
  zone_3_county: {
    zips: [
      // Chula Vista, National City, Imperial Beach
      '91910', '91911', '91913', '91914', '91915', '91932', '91950',
      // El Cajon, La Mesa, Santee, Lakeside
      '91941', '91942', '91943', '91977', '92019', '92020', '92021', '92040', '92071',
      // Escondido, San Marcos, Vista
      '92025', '92026', '92027', '92028', '92029', '92069', '92078', '92079', '92081', '92082', '92083', '92084', '92085',
      // Oceanside, Carlsbad, Encinitas
      '92007', '92008', '92009', '92010', '92011', '92024', '92054', '92056', '92057', '92058',
      // Poway, Ramona, Julian
      '92064', '92065', '92066', '92070',
      // Coronado
      '92118'
    ],
    multiplier: 1.3,
    label: 'San Diego County'
  },

  // Zone 4: Out of primary service area (default for unknown ZIPs)
  zone_4_default: {
    multiplier: 1.5,
    label: 'Out of Primary Service Area'
  }
};

/**
 * Get zone and multiplier for a ZIP code
 */
export function getZoneMultiplier(zipCode) {
  // Normalize ZIP code (first 5 digits)
  const normalizedZip = zipCode.toString().trim().slice(0, 5);

  // Search through zones
  for (const [zoneName, config] of Object.entries(ZONE_MULTIPLIERS)) {
    if (config.zips?.includes(normalizedZip)) {
      return {
        zone: zoneName,
        multiplier: config.multiplier,
        label: config.label
      };
    }
  }

  // Default to zone 4 if not found
  return {
    zone: 'zone_4_default',
    multiplier: ZONE_MULTIPLIERS.zone_4_default.multiplier,
    label: ZONE_MULTIPLIERS.zone_4_default.label
  };
}

/**
 * Get all zones for reference
 */
export function getAllZones() {
  return Object.entries(ZONE_MULTIPLIERS).map(([key, config]) => ({
    id: key,
    label: config.label,
    multiplier: config.multiplier,
    zipCount: config.zips?.length || 0
  }));
}
