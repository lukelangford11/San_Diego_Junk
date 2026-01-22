import OpenAI from 'openai';
import { ITEM_BASELINES, getItemBaseline } from './pricing-config.js';

/**
 * AI Vision Analyzer for Junk Removal Photos
 * Uses OpenAI GPT-4 Vision to analyze photos and estimate volume
 */

// Initialize OpenAI client
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable. Set it in .env or Netlify environment variables.');
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey
    });
  }
  
  return openaiClient;
}

/**
 * Analyze junk removal photos using GPT-4 Vision
 * Returns structured data about volume, items, and complexity
 */
export async function analyzePhotos(photoUrls) {
  if (!photoUrls || photoUrls.length === 0) {
    throw new Error('No photos provided for analysis');
  }
  
  try {
    const openai = getOpenAIClient();
    
    // Prepare the image content for the API
    const imageContent = photoUrls.slice(0, 6).map(url => ({
      type: "image_url",
      image_url: {
        url: url,
        detail: "high" // Use high detail for better analysis
      }
    }));
    
    // Create the analysis prompt
    const prompt = buildAnalysisPrompt();
    
    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o which has vision capabilities
      messages: [
        {
          role: "system",
          content: "You are an expert junk removal estimator with years of experience. You can accurately estimate volumes and identify items from photos."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            ...imageContent
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3 // Lower temperature for more consistent estimates
    });
    
    // Parse the response
    const analysisText = response.choices[0].message.content;
    const parsedAnalysis = parseVisionResponse(analysisText);
    
    return parsedAnalysis;
    
  } catch (error) {
    console.error('OpenAI Vision API error:', error);
    
    // Return fallback data if vision fails
    return getFallbackAnalysis(photoUrls.length);
  }
}

/**
 * Build the analysis prompt for GPT-4 Vision
 */
function buildAnalysisPrompt() {
  return `Analyze these junk removal photos and provide a detailed estimate. 

Please evaluate:

1. **Volume Estimate**: Estimate the total volume in cubic yards (1-20 range)
   - Consider all visible items across all photos
   - Account for hidden/stacked items
   - 1 pickup truck load ≈ 2-3 cubic yards
   - 1 standard room of furniture ≈ 4-6 cubic yards

2. **Item Categories**: Identify what types of items you see (select all that apply):
   - furniture (sofas, chairs, tables, beds, dressers)
   - appliances (refrigerators, washers, dryers, stoves)
   - yard_waste (branches, leaves, lawn debris)
   - hot_tub (hot tubs, spas, large pools)
   - construction (lumber, drywall, concrete, building materials)
   - electronics (TVs, computers, monitors)
   - other (miscellaneous items)

   **Couch Detection (if couch/sofa visible):**
   - Count visible seat cushions: 2, 3, 4, or 5+
   - Identify if L-shaped or chaise sectional
   - Provide: "couch_cushion_count": <number>, "couch_is_sectional": <boolean>

   **IMPORTANT - Itemized List**: Provide a detailed list of individual items with quantities:
   Each item needs: item_name (specific), quantity (number), confidence (0.0-1.0)
   
   Common item names to use:
   - Furniture: "sofa_3_seat", "loveseat_2_seat", "sectional_small", "recliner", "dining_table", "dining_chair", "coffee_table", "desk", "office_chair", "bookshelf", "dresser", "nightstand", "bed_frame_queen", "mattress_queen"
   - Appliances: "refrigerator", "washer", "dryer", "washer_dryer_pair", "dishwasher", "stove", "microwave", "water_heater"
   - Electronics: "tv_large", "tv_small", "computer_desktop", "computer_monitor", "printer"
   - Misc: "trash_bag", "box_small", "box_medium", "box_large", "bin_95_gal"
   - Yard: "yard_debris_pile", "tree_branches"
   - Construction: "construction_debris", "drywall_sheet", "lumber_bundle"
   - Special: "hot_tub", "treadmill", "elliptical"
   
   If uncertain about exact type, use generic: "misc_furniture", "misc_appliance", "misc_items"

3. **Access Difficulty**: Rate the access difficulty (easy/medium/hard):
   - Easy: Ground level, clear path, close to truck
   - Medium: Stairs, narrow doorways, or backyard access
   - Hard: Multiple flights of stairs, tight spaces, or disassembly required

4. **Special Concerns**: Note any special handling requirements:
   - Heavy items requiring extra crew
   - Hazardous materials (batteries, chemicals, paint)
   - Items requiring disassembly
   - Delicate/fragile items

5. **Confidence Level**: Rate your confidence in this estimate (low/medium/high):
   - High: Clear photos, all items visible, good lighting
   - Medium: Some items obscured or limited angles
   - Low: Poor lighting, unclear photos, or very limited view

6. **Service Type Inference**: Determine if this is curbside or full-service removal:
   - curbside: Items are on street/sidewalk/driveway, visible curb/road/pavement, outdoor setting with sky visible, no interior walls
   - full_service: Items inside garage (visible garage door tracks, walls, ceiling), inside home (interior walls, doors, stairs visible), or fenced backyard
   - unknown: Cannot determine from photos
   
   Provide:
   - inferred_service_type: "curbside" | "full_service" | "unknown"
   - service_confidence: 0.0-1.0 (how certain are you about the service type?)
   - reasoning_tags: ["outdoor", "curb_visible", "garage_interior", "interior_walls", etc.]

Please respond in the following JSON format:
{
  "volume_cubic_yards": <number between 1-20>,
  "item_categories": ["<category1>", "<category2>", ...],
  "detected_items": [
    {"item_name": "<canonical_name>", "quantity": <number>, "confidence": <0.0-1.0>},
    ...
  ],
  "couch_cushion_count": <number or null>,
  "couch_is_sectional": <boolean or null>,
  "access_difficulty": "<easy|medium|hard>",
  "special_concerns": ["<concern1>", "<concern2>", ...],
  "confidence": "<low|medium|high>",
  "notes": "<brief explanation of your estimate>",
  "inferred_service_type": "<curbside|full_service|unknown>",
  "service_confidence": <0.0-1.0>,
  "reasoning_tags": ["<tag1>", "<tag2>", ...]
}`;
}

/**
 * Normalize detected items from AI into structured schema
 * Each item: { id, canonicalType, displayName, qty, minQty, maxQty, baselineYardsPerUnit, confidence, included }
 */
function normalizeDetectedItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return [];
  }
  
  const normalized = [];
  let idCounter = 1;
  
  for (const item of rawItems) {
    if (!item || !item.item_name) continue;
    
    // Map to canonical type (handle variations)
    const canonicalType = mapToCanonicalType(item.item_name);
    const baseline = getItemBaseline(canonicalType);
    
    // Clamp quantity to valid range
    const rawQty = typeof item.quantity === 'number' ? item.quantity : 1;
    const qty = Math.max(baseline.minQty, Math.min(baseline.maxQty, Math.round(rawQty)));
    
    // Confidence (0-1)
    const confidence = typeof item.confidence === 'number' 
      ? Math.max(0, Math.min(1, item.confidence)) 
      : 0.7;
    
    normalized.push({
      id: `item_${idCounter++}`,
      canonicalType,
      displayName: baseline.label,
      qty,
      minQty: baseline.minQty,
      maxQty: baseline.maxQty,
      baselineYardsPerUnit: baseline.yards,
      confidence,
      included: true // All items start included
    });
  }
  
  return normalized;
}

/**
 * Map AI item names to canonical types in ITEM_BASELINES
 */
function mapToCanonicalType(itemName) {
  if (!itemName) return 'misc_items';
  
  const normalized = itemName.toLowerCase().replace(/[\s-]+/g, '_');
  
  // Direct match
  if (ITEM_BASELINES[normalized]) {
    return normalized;
  }
  
  // Common aliases/variations
  const aliases = {
    'couch': 'sofa_3_seat',
    'sofa': 'sofa_3_seat',
    '3_seat_sofa': 'sofa_3_seat',
    '2_seat_sofa': 'loveseat_2_seat',
    'loveseat': 'loveseat_2_seat',
    'sectional': 'sectional_small',
    'fridge': 'refrigerator',
    'frig': 'refrigerator',
    'washing_machine': 'washer',
    'clothes_dryer': 'dryer',
    'oven': 'stove',
    'range': 'stove',
    'television': 'tv_large',
    'tv': 'tv_large',
    'flat_screen': 'tv_large',
    'mattress': 'mattress_queen',
    'bed': 'bed_frame_queen',
    'queen_bed': 'bed_frame_queen',
    'king_bed': 'bed_frame_king',
    'twin_bed': 'bed_frame_twin',
    'chair': 'dining_chair',
    'table': 'dining_table',
    'garbage_bag': 'trash_bag',
    'bag': 'trash_bag',
    'boxes': 'box_medium',
    'cardboard': 'box_medium',
    'branches': 'tree_branches',
    'debris': 'construction_debris',
    'yard_waste': 'yard_debris_pile',
    'exercise_equipment': 'treadmill',
    'gym_equipment': 'treadmill'
  };
  
  if (aliases[normalized]) {
    return aliases[normalized];
  }
  
  // Partial match fallbacks
  if (normalized.includes('sofa') || normalized.includes('couch')) return 'sofa_3_seat';
  if (normalized.includes('chair')) return 'dining_chair';
  if (normalized.includes('table')) return 'dining_table';
  if (normalized.includes('mattress')) return 'mattress_queen';
  if (normalized.includes('bed')) return 'bed_frame_queen';
  if (normalized.includes('refrigerator') || normalized.includes('fridge')) return 'refrigerator';
  if (normalized.includes('washer')) return 'washer';
  if (normalized.includes('dryer')) return 'dryer';
  if (normalized.includes('tv') || normalized.includes('television')) return 'tv_large';
  if (normalized.includes('box')) return 'box_medium';
  if (normalized.includes('bag')) return 'trash_bag';
  if (normalized.includes('desk')) return 'desk';
  if (normalized.includes('dresser')) return 'dresser';
  if (normalized.includes('bookshelf') || normalized.includes('shelf')) return 'bookshelf';
  
  // Category fallbacks
  if (normalized.includes('furniture')) return 'misc_furniture';
  if (normalized.includes('appliance')) return 'misc_appliance';
  
  return 'misc_items';
}

/**
 * Parse the GPT-4 Vision response into structured data
 */
function parseVisionResponse(responseText) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the response
      const normalizedItems = normalizeDetectedItems(parsed.detected_items || []);
      
      return {
        volumeCubicYards: Math.max(1, Math.min(20, parsed.volume_cubic_yards || 3)),
        itemCategories: Array.isArray(parsed.item_categories) ? parsed.item_categories : [],
        detectedItems: normalizedItems,
        accessDifficulty: ['easy', 'medium', 'hard'].includes(parsed.access_difficulty) 
          ? parsed.access_difficulty 
          : 'medium',
        specialConcerns: Array.isArray(parsed.special_concerns) ? parsed.special_concerns : [],
        confidence: ['low', 'medium', 'high'].includes(parsed.confidence) 
          ? parsed.confidence 
          : 'medium',
        notes: parsed.notes || 'AI-powered estimate based on photo analysis',
        
        // Couch detection data (estimator-only)
        couchCushionCount: typeof parsed.couch_cushion_count === 'number' ? parsed.couch_cushion_count : null,
        couchIsSectional: typeof parsed.couch_is_sectional === 'boolean' ? parsed.couch_is_sectional : false,
        
        // NEW: Service type inference
        inferredServiceType: ['curbside', 'full_service', 'unknown'].includes(parsed.inferred_service_type)
          ? parsed.inferred_service_type
          : 'unknown',
        serviceTypeConfidence: typeof parsed.service_confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.service_confidence))
          : 0.5,
        visionReasoningTags: Array.isArray(parsed.reasoning_tags) ? parsed.reasoning_tags : [],
        
        raw_response: responseText
      };
    }
    
    // If JSON extraction fails, return default values
    throw new Error('Could not parse JSON from response');
    
  } catch (error) {
    console.error('Error parsing vision response:', error);
    console.log('Raw response:', responseText);
    
    // Try to extract at least the volume from text
    const volumeMatch = responseText.match(/(\d+(?:\.\d+)?)\s*cubic\s*yard/i);
    const volume = volumeMatch ? parseFloat(volumeMatch[1]) : 3;
    
    return {
      volumeCubicYards: Math.max(1, Math.min(20, volume)),
      itemCategories: [],
      detectedItems: [],
      accessDifficulty: 'medium',
      specialConcerns: [],
      confidence: 'low',
      notes: 'Estimate based on partial AI analysis',
      inferredServiceType: 'unknown',
      serviceTypeConfidence: 0.3,
      visionReasoningTags: [],
      raw_response: responseText
    };
  }
}

/**
 * Get fallback analysis if Vision API fails
 */
function getFallbackAnalysis(photoCount) {
  // Use photo count as rough proxy if vision fails
  const estimatedVolume = Math.min(15, photoCount * 2.5);
  
  return {
    volumeCubicYards: estimatedVolume,
    itemCategories: [],
    detectedItems: [],
    accessDifficulty: 'medium',
    specialConcerns: [],
    confidence: 'low',
    notes: 'Fallback estimate - Vision AI unavailable. Based on photo count only.',
    inferredServiceType: 'unknown',
    serviceTypeConfidence: 0.0,
    visionReasoningTags: [],
    fallback: true
  };
}

/**
 * Calculate access difficulty multiplier
 */
export function getAccessMultiplier(difficulty) {
  const multipliers = {
    easy: 1.0,
    medium: 1.15,
    hard: 1.3
  };
  
  return multipliers[difficulty] || 1.15;
}

/**
 * Check if vision analysis is enabled
 */
export function isVisionEnabled() {
  return !!process.env.OPENAI_API_KEY;
}
