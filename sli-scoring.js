// ══════════════════════════════════════════════════════════════════════════
// SLI 2.0 SCORING ENGINE — single shared source of truth for Support-Level math.
//
// Used by: sliassessment_1.html (standalone Initial/30-day/90-day/Ad-hoc assessment),
// treatmentplan_2.html (Treatment Plan Builder's inline SLI widget + 90-day review
// re-score), psychotherapynote.html (Psychotherapy Note's inline SLI re-score).
//
// FIX (BUG-13/BUG-33, 9/4/26): this exact math was independently re-implemented 4+
// times across these files (confirmed numerically identical on 9/4/26, with one
// already-fixed drift -- a variable-name typo, not a logic difference). Rather than
// keep re-verifying N copies stay in sync by hand, this is now the ONE place the
// math lives; each tool's own file wires its DOM/UI to this. A future scoring-rule
// change -- most importantly the real Thrive ASAM picklist tracked as BUG-07, which
// only needs to replace SLI_ASAM_DIMENSIONS_PLACEHOLDER / SLI_ASAM_PLACEHOLDER_OPTIONS
// below -- now takes effect in every tool at once instead of needing the same edit
// made correctly in 4+ places.
//
// Include this file with a same-origin relative path (not an external host) BEFORE
// each tool's own <script> block:
//   <script src="sli-scoring.js"></script>
// Same-origin on purpose -- see BUG-22 (Provider Match widget) for what an
// externally-hosted single point of failure costs when it's down; this file
// ships in the same repo/deploy as the tools that need it.
//
// Every function here is a pure function of its arguments -- no DOM access, no
// Supabase calls, nothing global except the constants below. That's deliberate:
// it's what makes it safe to unit-test in isolation and safe to share across three
// otherwise-unrelated single-file tools with no build step.
// ══════════════════════════════════════════════════════════════════════════

// PLACEHOLDER -- per the SLI 2.0 manual, each ASAM dimension is a 10-option picklist
// scored 0.5-4 by placement level, not by descriptor wording alone. The real
// Thrive-specific option text wasn't present in the SLI_2_0.xlsx export, so this
// 5-point severity key stands in. Swap this array for the real picklist text (10
// entries per dimension) once available -- nothing else in the scoring logic needs
// to change, and the swap takes effect in every tool that includes this file.
var SLI_ASAM_DIMENSIONS_PLACEHOLDER = [
  'Acute Intoxication and/or Withdrawal Potential',
  'Biomedical Conditions and Complications',
  'Emotional, Behavioral, or Cognitive Conditions and Complications',
  'Readiness to Change',
  'Relapse, Continued Use, or Continued Problem Potential',
  'Recovery/Living Environment'
];
var SLI_ASAM_PLACEHOLDER_OPTIONS = [
  { label: '0 — No problem: fully stable', points: 0 },
  { label: '1 — Mild: slight issue, manageable in current setting', points: 1 },
  { label: '2 — Moderate: requires structured support or intervention', points: 2 },
  { label: '3 — Serious: presents a clear risk, needs intensive services', points: 3 },
  { label: '4 — Severe: imminent danger or inability to function without 24/7 care', points: 4 }
];

// Canonical item KEYS only (not labels -- each tool phrases questions for its own
// audience: "you" in the self-report SLI Assessment, "the individual" in Treatment
// Plan Builder, "the client" in Psychotherapy Note). Confirmed identical key sets
// across all three files' own item-definition arrays before extracting this.
var SLI_BAM_SCORED_KEYS = [
  'physical_health', 'sleep_trouble', 'mood_distress', 'alcohol_days', 'heavy_drinking_days',
  'drug_days', 'cravings', 'abstinence_confidence', 'self_help_days', 'risky_situations_days',
  'spirituality', 'work_school_days', 'relationship_problems', 'supportive_contact_days',
  'recovery_satisfaction'
];
var SLI_CSSRS_KEYS = ['1a', '1b', '1c', '1d', '1e', '1f'];
var SLI_CSSRS_ESCALATION_KEYS = ['1c', '1d', '1e', '1f'];
var SLI_RISK_EXTRA_KEYS = ['harm_others', 'abuse', 'psychosis'];
var SLI_SDOH_KEYS = ['housing', 'food_utilities', 'transportation', 'healthcare_access', 'isolation', 'legal_safety'];

var SLI_LEVEL_TABLE = [
  { min: 0, max: 5, level: 1, label: 'Level 1 — Maintenance', hours: '1-2 hrs/wk' },
  { min: 6, max: 8, level: 2, label: 'Level 2 — Moderate', hours: '2-4 hrs/wk' },
  { min: 9, max: 11, level: 3, label: 'Level 3 — High', hours: '4-6 hrs/wk' },
  { min: 12, max: 14, level: 4, label: 'Level 4 — Intensive', hours: '6-8 hrs/wk' },
  { min: 15, max: 9999, level: 5, label: 'Level 5 — Critical', hours: '8+ hrs/wk (Director approval required)' }
];

function sliSum(arr) {
  return arr.reduce(function(a, b) { return a + (b === null || b === undefined ? 0 : b); }, 0);
}

function sliBandFromTable(raw, table) {
  for (var i = 0; i < table.length; i++) {
    if (raw >= table[i].min && raw <= table[i].max) return table[i];
  }
  return table[table.length - 1];
}

// state shape (matches what all three tools already keep in memory):
//   { phq9:[9 nums], gad7:[7 nums], bam:{key:num}, asam_mh_only:bool, asam_dims:[6 nums],
//     cssrs:{key:0|1}, risk_extra:{key:0|1}, sdoh:{key:0|1} (optional -- see opts.sdoh) }
// opts (all optional):
//   sdoh -- an SDOH map to use INSTEAD of state.sdoh. Treatment Plan Builder doesn't keep
//     SDOH on its sliState/reviewSliState objects (it reads 6 checkboxes straight from the
//     DOM) -- its wrapper builds this map from those checkboxes and passes it here rather
//     than restructuring its state object. Every other caller can just rely on state.sdoh.
function sliComputeScores(state, opts) {
  opts = opts || {};
  var sdoh = opts.sdoh || state.sdoh;

  var phq9Raw = sliSum(state.phq9);
  var phq9Band = sliBandFromTable(phq9Raw, [
    { min: 0, max: 9, label: '0-9 Minimal', points: 1 },
    { min: 10, max: 14, label: '10-14 Mild-Moderate', points: 2 },
    { min: 15, max: 19, label: '15-19 Moderate-Severe', points: 3 },
    { min: 20, max: 27, label: '20-27 Severe', points: 4 }
  ]);

  var gad7Raw = sliSum(state.gad7);
  var gad7Band = sliBandFromTable(gad7Raw, [
    { min: 0, max: 9, label: '0-9 Minimal', points: 1 },
    { min: 10, max: 14, label: '10-14 Mild-Moderate', points: 2 },
    { min: 15, max: 19, label: '15-19 Moderate-Severe', points: 3 },
    { min: 20, max: 21, label: '20-21 Severe', points: 4 }
  ]);

  var bamRaw = sliSum(SLI_BAM_SCORED_KEYS.map(function(k) { return state.bam[k]; }));
  var bamBand = sliBandFromTable(bamRaw, [
    { min: 0, max: 20, label: '0-20 Low Risk', points: 1 },
    { min: 21, max: 35, label: '21-35 Moderate Risk', points: 2 },
    { min: 36, max: 45, label: '36-45 High Risk', points: 3 },
    { min: 46, max: 9999, label: '46+ Very High Risk', points: 4 }
  ]);

  var asamRaw = state.asam_mh_only ? 0 : sliSum(state.asam_dims);
  var asamBand = state.asam_mh_only
    ? { label: 'N/A (MH Only)', points: 0 }
    : sliBandFromTable(asamRaw, [
        { min: 0, max: 6, label: '0-6 Early/Outpatient', points: 1 },
        { min: 7, max: 12, label: '7-12 IOP', points: 2 },
        { min: 13, max: 17, label: '13-17 Residential', points: 3 },
        { min: 18, max: 9999, label: '18-24 Intensive', points: 4 }
      ]);

  var escalation = SLI_CSSRS_ESCALATION_KEYS.some(function(k) { return state.cssrs[k] === 1; });
  var riskExtraRaw = sliSum(SLI_RISK_EXTRA_KEYS.map(function(k) { return state.risk_extra[k]; }));
  var riskRaw = sliSum(SLI_CSSRS_KEYS.map(function(k) { return state.cssrs[k]; })) + riskExtraRaw;
  var riskBand;
  // FIX (BUG-13, 9/4): standardized on the "High/Low-Moderate/No Risk" label text already
  // used by 2 of the 3 tools -- sliassessment_1.html previously saved a differently-formatted
  // label ("2 High Risk") to the SAME shared sli_assessments.risk_band column, which meant
  // that one text field could read two different ways depending on which tool wrote the row.
  if (escalation || riskRaw >= 4) riskBand = { label: 'High Risk', points: 2 };
  else if (riskRaw >= 1) riskBand = { label: 'Low-Moderate Risk', points: 1 };
  else riskBand = { label: 'No Risk', points: 0 };

  var sdohScore = sdoh ? sliSum(SLI_SDOH_KEYS.map(function(k) { return sdoh[k]; })) : 0;

  var clinicalScore = phq9Band.points + gad7Band.points + bamBand.points + asamBand.points + riskBand.points;
  var adjustedSli = clinicalScore + sdohScore;

  var lowClinicalFlag = clinicalScore <= 4;
  var highSdohFlag = sdohScore >= 3;
  var cap = lowClinicalFlag && highSdohFlag;

  var calculatedLevel = cap ? SLI_LEVEL_TABLE[0] : sliBandFromTable(adjustedSli, SLI_LEVEL_TABLE);
  var directorReviewRequired = calculatedLevel.level === 5 && !cap;

  return {
    phq9Raw: phq9Raw, phq9Band: phq9Band,
    gad7Raw: gad7Raw, gad7Band: gad7Band,
    bamRaw: bamRaw, bamBand: bamBand,
    asamRaw: asamRaw, asamBand: asamBand,
    escalation: escalation, riskRaw: riskRaw, riskBand: riskBand,
    sdohScore: sdohScore,
    clinicalScore: clinicalScore, adjustedSli: adjustedSli,
    lowClinicalFlag: lowClinicalFlag, highSdohFlag: highSdohFlag, cap: cap,
    calculatedLevel: calculatedLevel, directorReviewRequired: directorReviewRequired
  };
}

// Node's `require()` isn't available in a plain browser <script> include, and this same
// file is also loaded directly by the regression harness (sli-scoring.test.js) under
// Node -- this makes both work from one file without a build step either way.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SLI_ASAM_DIMENSIONS_PLACEHOLDER: SLI_ASAM_DIMENSIONS_PLACEHOLDER,
    SLI_ASAM_PLACEHOLDER_OPTIONS: SLI_ASAM_PLACEHOLDER_OPTIONS,
    SLI_BAM_SCORED_KEYS: SLI_BAM_SCORED_KEYS,
    SLI_CSSRS_KEYS: SLI_CSSRS_KEYS,
    SLI_CSSRS_ESCALATION_KEYS: SLI_CSSRS_ESCALATION_KEYS,
    SLI_RISK_EXTRA_KEYS: SLI_RISK_EXTRA_KEYS,
    SLI_SDOH_KEYS: SLI_SDOH_KEYS,
    SLI_LEVEL_TABLE: SLI_LEVEL_TABLE,
    sliSum: sliSum,
    sliBandFromTable: sliBandFromTable,
    sliComputeScores: sliComputeScores
  };
}
