"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Moon, SunMedium, Info, Search, Filter, ChevronDown, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Diagnostic Test Explorer (Single-Page React)
 * - Clean, modern UI with Tailwind-like tokens (provided inline here)
 * - Dark mode toggle (persistent + system-pref aware)
 * - Filter by condition + search
 * - Sortable, sticky-header table
 * - Click a test to open details
 * - NEW: Study Notes & Caveats panel under the left column that updates when a table row is clicked
 * - Prevalence slider + positive/negative toggle
 * - Computes post-test probability using LR±
 * - 10x10 icon grid to make probabilities tangible
 */

// --- Helpers: probability/odds math -------------------------------------------------
const probToOdds = (p: number) => p / (1 - p);
const oddsToProb = (o: number) => o / (1 + o);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function postTestProb(prevalence: number, lr: number) {
  const preP = clamp01(prevalence);
  const preOdds = probToOdds(preP);
  const postOdds = preOdds * lr;
  return clamp01(oddsToProb(postOdds));
}

// --- Data --------------------------------------------------------------------------
// Keys aligned with source file: Test, Condition, Sensitivity, Specificity, LR+, LR-, Reference, ReferenceUrl
const RAW = [
  { "Test":"FIT", "Condition":"Colorectal Cancer", "Sensitivity":0.79, "Specificity":0.94, "LR+":13.17, "LR-":0.22, "Reference":"Lee JK, et al. (2014), Ann Intern Med", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/24658694/" },
  { "Test":"Colonoscopy", "Condition":"Colorectal Cancer", "Sensitivity":0.89, "Specificity":0.89, "LR+":8.09, "LR-":0.12, "Reference":"Jennifer S L, et al. (2021), JAMA", "ReferenceUrl":"https://jamanetwork.com/journals/jama/fullarticle/2779987" },
  { "Test":"Mammography", "Condition":"Breast Cancer", "Sensitivity":0.82, "Specificity":0.84, "LR+":5.12, "LR-":0.21, "Reference":"Tadesse GF, et al. (2023), J Ultrasound", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/36696046/" },
  { "Test":"Pap Smear", "Condition":"Cervical Cancer", "Sensitivity":0.55, "Specificity":0.97, "LR+":18.33, "LR-":0.46, "Reference":"Arbyn M, et al. (2008), Lancet Oncol", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/17942871/" },
  { "Test":"HPV DNA", "Condition":"Cervical Cancer", "Sensitivity":0.95, "Specificity":0.94, "LR+":15.83, "LR-":0.05, "Reference":"Naucler P, et al. (2007), N Engl J Med", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/17942871/" },
  { "Test":"PSA", "Condition":"Prostate Cancer", "Sensitivity":0.92, "Specificity":0.16, "LR+":1.10, "LR-":0.50, "Reference":"Yan J, et al. (2022), Investigative and Clinical Urology", "ReferenceUrl":"https://icurology.org/DOIx.php?id=10.4111/icu.20210429" },
  { "Test":"MRI (mpMRI)", "Condition":"Prostate Cancer", "Sensitivity":0.93, "Specificity":0.41, "LR+":1.58, "LR-":0.17, "Reference":"Ahmed HU, et al. (2017), Lancet", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/27599140/" },
  { "Test":"D-dimer (POC)", "Condition":"DVT", "Sensitivity":0.85, "Specificity":0.74, "LR+":3.27, "LR-":0.20, "Reference":"Geersing GJ, et al. (2009), BMJ 339:b2990", "ReferenceUrl":"https://www.bmj.com/content/339/bmj.b2990" },
  { "Test":"D-dimer (ELISA)", "Condition":"VTE (LCP)", "Sensitivity":1.00, "Specificity":0.679, "LR+":3.75, "LR-":0.00, "Reference":"Pulivarthi S, Gurram MK. (2014), N Am J Med Sci", "ReferenceUrl":"https://pmc.ncbi.nlm.nih.gov/articles/PMC4215485/" },
  { "Test":"D-dimer (Rapid whole-blood, quantitative)", "Condition":"VTE (LCP)", "Sensitivity":1.00, "Specificity":0.733, "LR+":3.12, "LR-":0.00, "Reference":"Pulivarthi S, Gurram MK. (2014), N Am J Med Sci", "ReferenceUrl":"https://pmc.ncbi.nlm.nih.gov/articles/PMC4215485/" },
  { "Test":"CTPA", "Condition":"Pulmonary Embolism", "Sensitivity":0.98, "Specificity":0.94, "LR+":16.33, "LR-":0.02, "Reference":"Paul D Stein, et al. (2023), NEJM", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/16738268/" },
  { "Test":"Rapid Antigen", "Condition":"COVID-19", "Sensitivity":0.73, "Specificity":0.99, "LR+":73.00, "LR-":0.27, "Reference":"Dinnes J, et al. (2021), Cochrane", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/33760236/" },
  { "Test":"PCR", "Condition":"COVID-19", "Sensitivity":0.80, "Specificity":0.98, "LR+":40.00, "LR-":0.20, "Reference":"Sophia Yohe (2020), College of American Pathologists", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.https://www.cap.org/member-resources/articles/how-good-are-covid-19-sars-cov-2-diagnostic-pcr-tests/33301459/" },
  { "Test":"BNP", "Condition":"Heart Failure", "Sensitivity":0.90, "Specificity":0.74, "LR+":3.46, "LR-":0.14, "Reference":"Kelmenson DA, et al. (2017), Acad Emerg Med", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/17594491/" },
  { "Test":"Troponin (hs)", "Condition":"Myocardial Infarction", "Sensitivity":0.90, "Specificity":0.78, "LR+":4.09, "LR-":0.13, "Reference":"NICE Evidence Review. (2020), NICE", "ReferenceUrl":"https://www.nice.org.uk/guidance/dg40/chapter/3-Evidence" },
  { "Test":"Wells Score", "Condition":"DVT", "Sensitivity":0.77, "Specificity":0.38, "LR+":1.24, "LR-":0.61, "Reference":"Johnathan S, et al. (2017), PubMed", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/29399531/" },
  { "Test":"Ultrasound", "Condition":"DVT", "Sensitivity":0.96, "Specificity":0.94, "LR+":16.00, "LR-":0.04, "Reference":"Goodacre S, et al. (2005), BMJ", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/15975199/" },
  { "Test":"Spirometry", "Condition":"COPD", "Sensitivity":0.81, "Specificity":0.71, "LR+":2.79, "LR-":0.27, "Reference":"David P Johns, et al. (2014), Journal of Thoracic Disease", "ReferenceUrl":"https://pmc.ncbi.nlm.nih.gov/articles/PMC4255165/#:~:text=In%20a%20scenario%20when%20individuals,aged%20over%2050%20years%20(50)/" },
  { "Test":"Dermatoscopy", "Condition":"Melanoma", "Sensitivity":0.90, "Specificity":0.90, "LR+":9.00, "LR-":0.11, "Reference":"Kathryn Harrison. (2024), Journal of clinical and aesthetic dermatology", "ReferenceUrl":"https://pmc.ncbi.nlm.nih.gov/articles/PMC11460753/#:~:text=Dermoscopy%20improves%20the%20sensitivity%20for,with%20naked%20eye%20examination%20alone." },
  { "Test":"CA-125", "Condition":"Ovarian Cancer", "Sensitivity":0.79, "Specificity":0.78, "LR+":3.59, "LR-":0.27, "Reference":"Menzin A, et al. (2010), Gynecol Oncol", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/20614474/" },
  { "Test":"LDCT", "Condition":"Lung Cancer", "Sensitivity":0.93, "Specificity":0.77, "LR+":4.04, "LR-":0.09, "Reference":"Paul F P, et al. (2013), Journal of Medical Screening", "ReferenceUrl":"https://pubmed.ncbi.nlm.nih.gov/24009092/" },
  { "Test":"Chest X-ray", "Condition":"Lung Cancer", "Sensitivity":0.81, "Specificity":0.68, "LR+":2.53, "LR-":0.28, "Reference":"Louis Dwyer-Hemmings, et al. (2021), British Institute of Radiology", "ReferenceUrl":"https://academic.oup.com/bjro/article/3/1/20210005/7240341" }
];

interface TestData {
  test: string;
  condition: string;
  sensitivity: number;
  specificity: number;
  lrPlus: number;
  lrMinus: number;
  reference: string;
  referenceUrl?: string | null;
}

const DATA: TestData[] = RAW.map(r => ({
  test: r["Test"],
  condition: r["Condition"],
  sensitivity: r["Sensitivity"],
  specificity: r["Specificity"],
  lrPlus: r["LR+"],
  lrMinus: r["LR-"],
  reference: r["Reference"],
  referenceUrl: r["ReferenceUrl"] ?? null,
}));

// unique conditions for filter
const CONDITIONS = Array.from(new Set(DATA.map(d => d.condition))).sort();

// --- Optional: Study notes/caveats data -------------------------------------------
// NOTE: These are placeholders to demonstrate structure & UX. Replace with real study details.
interface StudyNotes {
  overview?: string;
  sampleSize?: string;
  population?: string;
  setting?: string;
  design?: string;
  year?: string;
  caveats?: string[];
  extra?: string;
}

const keyFor = (t: string, c: string) => `${t}|||${c}`;

const DETAILS = {
  [keyFor("Colonoscopy", "Colorectal Cancer")]: {
    overview:
      "Evidence review for the USPSTF found high per-patient sensitivity for ≥6 mm adenomas and cancers; performance varies by lesion size and operator. Colonoscopy also serves as the reference standard in most studies.",
    sampleSize: "Screening accuracy data across 9 studies for CT colonography (n=6,497); several of these also reported colonoscopy accuracy; broader evidence base spans multiple cohorts.",
    population: "Asymptomatic, average-risk adults undergoing CRC screening.",
    setting: "Multicenter screening programs in high-income countries.",
    design: "Systematic review/evidence report summarizing diagnostic accuracy and harms; comparative accuracy vs CT colonography.",
    year: "Publication year: 2021",
    caveats: [
      "Sensitivity varies by lesion size (higher for ≥10 mm; lower for diminutive polyps).",
      "Bowel prep quality and operator skill materially affect Se/Sp.",
      "Harms: ~5.4 perforations and ~17.5 major bleeds per 10,000 follow-up colonoscopies.",
    ],
    extra:
      "CT colonography with standard prep showed pooled sensitivity ~0.86 for ≥6 mm adenomas; colonoscopy ~0.89 in the same subset.",
  }, // Lin JS et al., JAMA 2021; USPSTF Evidence Review. :contentReference[oaicite:0]{index=0}

  [keyFor("FIT", "Colorectal Cancer")]: {
    overview:
      "Meta-analysis of screening FITs shows moderate sensitivity and high specificity for CRC; lower positivity thresholds improve sensitivity at the cost of specificity.",
    sampleSize: "19 studies included (1996–2013).",
    population: "Asymptomatic, average-risk adults in organized/opportunistic screening.",
    setting: "Population screening programs; various countries.",
    design: "Systematic review and meta-analysis of diagnostic accuracy.",
    year: "Publication year: 2014",
    caveats: [
      "Assay brand and cut-off (µg Hb/g) drive trade-offs. Sensitivity for CRC improved with lower assay cutoff values for a positive test result (for example, 0.89 [CI, 0.80 to 0.95] at a cutoff value less than 20 µg/g vs. 0.70 [CI, 0.55 to 0.81] at cutoff values of 20 to 50 µg/g) but with a corresponding decrease in specificity.",
      "Single-sample vs multi-sample strategies show similar accuracy in pooled analyses.",
    ],
  }, // Lee JK et al., Ann Intern Med 2014. :contentReference[oaicite:1]{index=1}

  [keyFor("Mammography", "Breast Cancer")]: {
    overview:
      "Narrative review summarizing that screening accuracy depends on age and breast density; typical pooled estimates ~0.82 sensitivity and ~0.84 specificity in general screening populations.",
    sampleSize: "Review paper drawing on multiple cohorts (not a single pooled meta-N).",
    population: "Asymptomatic screening populations; accuracy varies by age/density.",
    setting: "Screening programs and diagnostic clinics.",
    design: "Journal review of test accuracy literature.",
    year: "Publication year: 2023",
    caveats: [
      "Lower sensitivity in dense breasts; tomosynthesis can improve detection.",
      "Recall/biopsy rates vary by program thresholds.",
    ],
  }, // Tadesse GF et al., J Ultrasound 2023. :contentReference[oaicite:2]{index=2}

  [keyFor("Pap Smear", "Cervical Cancer")]: {
    overview:
      "Cytology detects CIN2+/CIN3+ but is less sensitive than HPV testing; specificity is higher.",
    sampleSize: "Large meta-analytic datasets across multiple trials/observational studies.",
    population: "Asymptomatic women in organized screening (typically 21–65 y).",
    setting: "Population screening programs and clinical settings.",
    design: "Comparative meta-analyses and trials vs HPV DNA testing.",
    year: "Key evidence years: 2007–2017 (landmark trials/meta-analyses).",
    caveats: [
      "Sampling quality and cytologist expertise affect sensitivity.",
      "Longer screening intervals may miss fast-progressing lesions.",
      "Reflex HPV triage alters effective performance.",
    ],
  }, // Mayrand 2007 NEJM; broader meta-analytic evidence. :contentReference[oaicite:3]{index=3}

  [keyFor("HPV DNA", "Cervical Cancer")]: {
    overview:
      "Randomized trials show primary high-risk HPV testing is more sensitive than cytology for CIN2+/CIN3+ and lowers subsequent CIN3+ incidence; specificity slightly lower than cytology.",
    sampleSize: "NEJM RCT in Sweden: 12,527 women; multiple trials/meta-analyses beyond this.",
    population: "Women in organized screening, often age 30–65.",
    setting: "Population-based screening programs.",
    design: "Randomized trials; pooled meta-analyses.",
    year: "Key trials 2007; meta-analyses 2014+",
    caveats: [
      "Transient infections in younger women → false positives.",
      "Genotype 16/18 risk stratification improves PPV.",
      "Self-collected samples have slightly lower sensitivity vs clinician-collected.",
    ],
  }, // Naucler 2007 NEJM; Ronco 2014; Arbyn 2014 meta-analysis of self-sampling. :contentReference[oaicite:4]{index=4}

  [keyFor("PSA", "Prostate Cancer")]: {
    overview:
      "Systematic review/meta-analysis shows high sensitivity but very poor specificity for PSA near traditional cutoffs; many benign conditions elevate PSA.",
    sampleSize: "11 studies in meta-analysis focused on PSA <4 ng/mL cutoffs.",
    population: "Men undergoing evaluation for possible prostate cancer.",
    setting: "Outpatient/urology; hospital cohorts.",
    design: "Systematic review and meta-analysis of diagnostic accuracy.",
    year: "Publication year: 2022",
    caveats: [
      "Threshold selection (2–4 ng/mL) shifts Se/Sp markedly.",
      "Consider age-specific ranges, %free PSA, PSAD, and MRI pathways.",
    ],
  }, // Jin/Yan et al., 2022 Investigative & Clinical Urology (open-access meta-analysis). :contentReference[oaicite:5]{index=5}

  [keyFor("MRI (mpMRI)", "Prostate Cancer")]: {
    overview:
      "PROMIS trial showed mpMRI has very high sensitivity and NPV for clinically significant prostate cancer and can triage men before biopsy; specificity is modest and reader-dependent.",
    sampleSize: "740 men (paired validating study).",
    population: "Men with elevated PSA referred for biopsy.",
    setting: "Tertiary centers with experienced readers; 1.5T mpMRI.",
    design: "Prospective paired diagnostic accuracy vs transperineal template mapping biopsy reference.",
    year: "Publication year: 2017",
    caveats: [
      "Reader experience and PI-RADS version influence accuracy.",
      "Inflammation/prostatitis can mimic lesions (false positives).",
      "A negative mpMRI does not absolutely exclude csPCa.",
    ],
  }, // Ahmed HU et al., Lancet 2017 (PROMIS). :contentReference[oaicite:6]{index=6}

  [keyFor("D-dimer (POC)", "DVT")]: {
    overview:
      "Qualitative POC D-dimer (SimpliRED) pooled Se 0.85 and Sp 0.74 in outpatients with suspected venous thromboembolism; suitable for rule-out in low pretest probability when used with a clinical decision rule.",
    sampleSize: "23 studies; n=13,959 (mixed suspected VTE).",
    population: "Consecutive outpatients with suspected VTE (includes DVT and PE).",
    setting: "Emergency/ambulatory care; near-patient testing.",
    design: "Diagnostic meta-analysis (bivariate model).",
    year: "Publication year: 2009",
    caveats: [
      "Apply alongside a validated clinical prediction rule (e.g., Wells); best for low pretest probability.",
      "Qualitative assays show better specificity than some quantitative platforms but higher LR− with SimpliRED than Cardiac.",
    ],
  },

  [keyFor("D-dimer (ELISA)", "VTE (LCP)")]: {
    overview:
      "Central-lab ELISA D-dimer shows ~100% sensitivity in low/non-high pretest probability cohorts with specificity ~68%, supporting rule-out when combined with a clinical prediction rule.",
    sampleSize: "Narrative review summarizing multiple cohorts and meta-analyses through 2011.",
    population: "Adults with suspected venous thromboembolism at low clinical probability.",
    setting: "ED and ambulatory care; laboratory ELISA assays.",
    design: "Evidence review citing meta-analyses and large prospective cohorts.",
    year: "Publication year: 2014",
    caveats: [
      "High sensitivity comes with modest specificity → many false positives; use to rule out, not rule in.",
      "Apply alongside a validated clinical prediction rule (e.g., Wells/Geneva) and appropriate imaging pathways.",
      "Assay type, timing from symptom onset, age, anticoagulation, and comorbidity materially affect performance."
    ],
    extra:
      "The review also cites meta-analytic sensitivities of 0.96 and 0.94 across broader cohorts; ELISA/automated latex outperform older qualitative assays on sensitivity but with lower specificity.",
  },

  [keyFor("D-dimer (Rapid whole-blood, quantitative)", "VTE (LCP)")]: {
    overview:
      "Rapid whole-blood quantitative D-dimer demonstrates ~100% sensitivity with slightly higher specificity (~73%) than ELISA in low-risk pathways; useful for near-patient rule-out.",
    sampleSize: "Narrative review summarizing multiple cohorts and meta-analyses through 2011.",
    population: "Adults with suspected VTE and low clinical probability.",
    setting: "Point-of-care/ED; rapid quantitative platforms.",
    design: "Evidence review with assay-comparison data.",
    year: "Publication year: 2014",
    caveats: [
      "Despite higher specificity vs ELISA, PPV remains poor; positive tests require imaging.",
      "Performance degrades if testing is delayed (>~1 week from symptom onset) or after starting anticoagulation.",
      "Older age, renal dysfunction, inflammation, pregnancy, and cancer increase false-positive rates."
    ],
    extra:
      "VIDAS ELISA reported 100% sensitivity at a 500 μg/L cutoff in a large management study; overall, ELISA/microplate ELISA/automated latex assays deliver higher sensitivity but lower specificity than some alternatives.",
  },

  [keyFor("CTPA", "Pulmonary Embolism")]: {
    overview:
      "Modern multidetector CTPA demonstrates very high sensitivity and specificity for acute PE when technically adequate, and is the definitive imaging test in most pathways.",
    sampleSize: "Large prospective cohorts/registries; classic multicenter studies report hundreds to thousands of patients.",
    population: "Adults with suspected PE (often moderate/high pretest probability or elevated D-dimer).",
    setting: "Hospital radiology; ED/inpatient.",
    design: "Prospective diagnostic accuracy vs clinical follow-up or catheter angiography.",
    year: "Seminal accuracy era mid-2000s onward; widely adopted standard.",
    caveats: [
      "Subsegmental PE significance can be uncertain.",
      "Contrast nephropathy/allergy may preclude use.",
      "Motion/poor opacification can reduce sensitivity.",
    ],
  }, // Representative sources discussing CTPA accuracy. :contentReference[oaicite:8]{index=8}

  [keyFor("Rapid Antigen", "COVID-19")]: {
    overview:
      "Cochrane living review shows antigen tests are highly specific but variably sensitive—best early in symptomatic infection and with high viral loads.",
    sampleSize: "Hundreds of evaluations pooled in serial Cochrane updates.",
    population: "Symptomatic and asymptomatic individuals across community/clinical sites.",
    setting: "Point-of-care/community testing sites.",
    design: "Systematic review and meta-analysis of diagnostic test accuracy vs RT-PCR.",
    year: "Evidence base summarized 2021 and updated since.",
    caveats: [
      "Lower sensitivity later in illness or in asymptomatic screens.",
      "Performance varies by brand and specimen quality.",
      "Repeat testing improves yield after early negatives.",
    ],
  }, // Dinnes J et al., Cochrane 2021+ living review. :contentReference[oaicite:9]{index=9}

  [keyFor("PCR", "COVID-19")]: {
    overview:
      "RT-PCR has very high analytical sensitivity; clinical sensitivity depends on timing, specimen site, and pre-analytical factors.",
    sampleSize: "Narrative/technical evidence summary with broad platform coverage.",
    population: "Symptomatic and asymptomatic individuals.",
    setting: "Laboratory-based molecular testing.",
    design: "CAP evidence overview and technical guidance.",
    year: "Publication year: 2020 (continually updated guidance thereafter).",
    caveats: [
      "Swab technique/site matter; early or late sampling can lower yield.",
      "Ct values are not standardized across platforms.",
      "Residual RNA can remain detectable after infectious period.",
    ],
  }, // College of American Pathologists explainer (Yohe, 2020). :contentReference[oaicite:10]{index=10}

  [keyFor("BNP", "Heart Failure")]: {
    overview:
      "In acute dyspnea, natriuretic peptides (BNP/NT-proBNP) aid diagnosis of acute heart failure with good rule-out performance at low cutoffs; accuracy impacted by obesity (lower) and renal dysfunction/age (higher).",
    sampleSize: "Multiple ED cohorts; classic ED trial n=452; large meta-analyses >10 studies.",
    population: "Adults presenting with undifferentiated dyspnea to the ED.",
    setting: "Emergency departments; inpatient admission cohorts.",
    design: "Diagnostic cohort studies and systematic reviews/meta-analyses.",
    year: "Key studies 2005–2016; ongoing reviews 2024.",
    caveats: [
      "Use assay-specific cutoffs and age-adjusted thresholds (esp. NT-proBNP).",
      "Obesity lowers levels (false negatives); renal dysfunction elevates (false positives).",
    ],
  }, // Mueller 2005; Korenstein 2007; Martindale 2016; contemporary review 2024. :contentReference[oaicite:11]{index=11}

  [keyFor("Troponin (hs)", "Myocardial Infarction")]: {
    overview:
      "High-sensitivity troponin assays enable early rule-out pathways for NSTEMI with high sensitivity when combined with timing and delta change algorithms.",
    sampleSize: "Evidence base spans large multi-center observational cohorts and RCTs summarized by NICE.",
    population: "Adults with suspected ACS in ED/observation settings.",
    setting: "EDs using hs-cTnT or hs-cTnI assays with protocolized pathways.",
    design: "Diagnostics guidance synthesizing trials/observational accuracy studies.",
    year: "Publication year: 2020 (DG40).",
    caveats: [
      "Non-ischemic causes (myocarditis, tachyarrhythmia, CKD) elevate troponin.",
      "Time from symptom onset and serial sampling are critical.",
      "Sex-specific 99th percentile cutoffs recommended.",
    ],
  }, // NICE DG40 (2020) + pathway evidence. :contentReference[oaicite:12]{index=12}

  [keyFor("Wells Score", "DVT")]: {
    overview:
      "Clinical prediction rule to stratify pretest probability; use with D-dimer to safely exclude DVT in low-risk patients.",
    sampleSize: "Numerous validation cohorts; broad literature summarized in reviews.",
    population: "Adults with suspected lower-extremity DVT.",
    setting: "Outpatient and ED settings.",
    design: "Derivation/validation studies; narrative/systematic reviews.",
    year: "Representative review: 2017.",
    caveats: [
      "Subjective components can vary between clinicians.",
      "Prevalence shifts materially change post-test probabilities.",
    ],
  }, // Stone 2017 review; additional validation literature. :contentReference[oaicite:13]{index=13}

  [keyFor("Ultrasound", "DVT")]: {
    overview:
      "Compression ultrasonography is first-line imaging; meta-analyses show high sensitivity for proximal DVT and slightly lower for distal/calf DVT.",
    sampleSize: "Meta-analysis pooling numerous diagnostic cohorts.",
    population: "Symptomatic patients with suspected DVT.",
    setting: "Vascular labs/EDs.",
    design: "Systematic review and meta-analysis vs venography/follow-up.",
    year: "Publication year: 2005",
    caveats: [
      "Distal DVT harder to detect; repeat studies may be needed.",
      "Body habitus/edema can limit visualization; operator experience matters.",
    ],
  }, // Goodacre S. et al., BMC Med Imaging 2005; supporting literature. :contentReference[oaicite:14]{index=14}

  [keyFor("Spirometry", "COPD")]: {
    overview:
      "Diagnosis based on post-bronchodilator FEV1/FVC below threshold (fixed 0.70 or LLN). Review highlights under-diagnosis and limitations of fixed ratio (risk of over-/under-diagnosis by age).",
    sampleSize: "Narrative review; cites multiple population surveys and diagnostic studies.",
    population: "Adults with chronic respiratory symptoms or risk factors (e.g., smokers).",
    setting: "Primary care/pulmonary labs.",
    design: "Review article of diagnostic criteria and performance.",
    year: "Publication year: 2014",
    caveats: [
      "Fixed 0.70 cutoff may overdiagnose elderly, underdiagnose younger adults.",
      "Poor technique/effort reduces reliability; ensure repeatability and bronchodilator response assessment.",
    ],
  }, // Johns DP et al., J Thorac Dis 2014. :contentReference[oaicite:15]{index=15}

  [keyFor("Dermatoscopy", "Melanoma")]: {
    overview:
      "Recent review shows dermoscopy improves diagnostic accuracy for pigmented lesions vs naked-eye exam; typical figures around 0.90 sensitivity/specificity in trained hands.",
    sampleSize: "Literature review summarizing multiple reader studies and meta-analyses.",
    population: "Adults with suspicious skin lesions.",
    setting: "Dermatology/primary care with training.",
    design: "Review article (practice-oriented) of diagnostic accuracy literature.",
    year: "Publication year: 2024",
    caveats: [
      "Training and experience strongly influence performance.",
      "Atypical benign lesions (e.g., Spitz nevus) can mimic melanoma.",
      "Use structured algorithms (ABCD, 7-point) to standardize.",
    ],
  }, // Harrison K., J Clin Aesthet Dermatol 2024. :contentReference[oaicite:16]{index=16}

  [keyFor("CA-125", "Ovarian Cancer")]: {
    overview:
      "CA-125 is frequently elevated in epithelial ovarian cancer but lacks sensitivity for early-stage disease and can be elevated in benign conditions; performance improves when combined with other markers/algorithms.",
    sampleSize: "Multiple cohorts and reviews; classic figures synthesized across studies.",
    population: "Women with adnexal masses or in high-risk screening protocols.",
    setting: "Outpatient/gynecologic oncology.",
    design: "Reviews and comparative biomarker studies.",
    year: "Key evidence: 2010–2024 syntheses.",
    caveats: [
      "Premenopausal specificity is lower due to benign gynecologic causes.",
      "Early-stage disease may have normal CA-125.",
      "Serial change or ROMA (HE4 + CA-125) can improve discrimination.",
    ],
  }, // Charkhchi 2020 review; Englisz 2024; HE4+CA125 literature. :contentReference[oaicite:17]{index=17}

  [keyFor("LDCT", "Lung Cancer")]: {
    overview:
      "NLST analyses show LDCT screening has high sensitivity with moderate specificity and reduces lung-cancer mortality in high-risk smokers.",
    sampleSize: "NLST (n≈53,000) with operating characteristics analyzed by Pinsky; multiple large trials/USPSTF evidence review (13 studies; n≈76,856 for sensitivity).",
    population: "High-risk current/former smokers meeting screening criteria.",
    setting: "Structured screening programs.",
    design: "Randomized trials and evidence reviews; ROC analysis of NLST.",
    year: "Key publications: 2013 (ROC), 2021 (USPSTF review).",
    caveats: [
      "High nodule detection → downstream work-ups/overdiagnosis.",
      "Adherence to annual screening affects outcomes; use Lung-RADS for management.",
    ],
  }, // Pinsky PF 2013 J Med Screen; USPSTF 2021 review. :contentReference[oaicite:18]{index=18}

  [keyFor("Chest X-ray", "Lung Cancer")]: {
    overview:
      "Systematic review in symptomatic primary-care populations found CXR sensitivity ~81% and specificity ~68% for lung malignancy—normal films do not exclude cancer when suspicion is high.",
    sampleSize: "10 studies included; 5 contributed to sensitivity meta-analysis.",
    population: "Adults presenting with symptoms suggestive of lung cancer in primary care.",
    setting: "Primary care/open-access radiography programs.",
    design: "Systematic review and meta-analysis.",
    year: "Publication year: 2021",
    caveats: [
      "Lower sensitivity for small/central lesions and early-stage disease.",
      "Consider low threshold for CT when risk remains high despite normal CXR.",
    ],
  }, // Dwyer-Hemmings L. et al., BJR Open 2021 (+ supportive PC literature). :contentReference[oaicite:19]{index=19}
};

// --- UI Bits ------------------------------------------------------------------------
function ThemeVars() {
  return (
    <style>{`
      :root {
        --background: 0 0% 100%;
        --foreground: 222.2 47.4% 11.2%;
        --muted: 210 40% 96.1%;
        --muted-foreground: 215.4 16.3% 46.9%;
        --primary: 221.2 83.2% 53.3%;
        --primary-foreground: 210 40% 98%;
        --border: 214.3 31.8% 91.4%;
        --success: 142 71% 45%;
        --warning: 38 92% 50%;
        --danger: 0 84% 60%;
      }
      .dark {
        --background: 222.2 84% 4.9%;
        --foreground: 210 40% 98%;
        --muted: 217.2 32.6% 17.5%;
        --muted-foreground: 210 20% 85%;
        --primary: 263.4 70% 50.4%;
        --primary-foreground: 210 40% 98%;
        --border: 217.2 32.6% 17.5%;
      }
      /* Map tokens to real colors */
      .bg-background { background-color: hsl(var(--background)); }
      .text-foreground { color: hsl(var(--foreground)); }
      .bg-muted { background-color: hsl(var(--muted)); }
      .text-muted-foreground { color: hsl(var(--muted-foreground)); }
      .bg-primary { background-color: hsl(var(--primary)); }
      .border { border-color: hsl(var(--border)); }
      .tabular-nums { font-variant-numeric: tabular-nums; }
      .border-primary { border-color: hsl(var(--primary)); }

      /* --- Portable, file-local UI styles --- */
      .dx { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

      /* Cards */
      .dx .card { border-radius: 1rem; border: 1px solid hsl(var(--border)); box-shadow: 0 4px 14px hsl(0 0% 0% / 0.06); background-color: hsl(var(--background)); }

      /* Buttons */
      .dx .btn { border-radius: 0.75rem; padding: 0.5rem 0.75rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); color: hsl(var(--foreground)); cursor: pointer; transition: transform .05s ease, background-color .15s ease, border-color .15s ease; }
      .dx .btn:hover { background: hsl(var(--muted)); }
      .dx .btn:active { transform: translateY(1px); }
      .dx .btn-primary { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }
      .dx .btn-primary:hover { filter: brightness(1.05); }
      .dx .btn-outline { background: transparent; }
      .dx .icon-btn { width: 2.25rem; height: 2.25rem; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
      .dx .btn:focus-visible { outline: 2px solid hsl(var(--primary)); outline-offset: 2px; }

      /* Inputs */
      .dx .input, .dx .select-trigger { width: 100%; border-radius: 0.75rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); color: hsl(var(--foreground)); padding: 0.5rem 0.75rem; }
      .dx .input:focus, .dx .select-trigger:focus { outline: 2px solid hsl(var(--primary)); outline-offset: 2px; }

      /* Table */
      .dx table thead th { position: sticky; top: 0; color: hsl(var(--foreground)); background: hsl(var(--muted) / 0.70); backdrop-filter: blur(4px); }
      .dx table tbody tr.row { transition: background-color .15s ease; }
      .dx table tbody tr.row:hover { background: hsl(var(--muted) / 0.40); }
      .dx table tbody tr.row.active { background: hsl(var(--primary) / 0.08); }

      /* Dark-mode specific nudges for contrast */
      .dark .dx .btn-outline { border-color: hsl(var(--border)); }
      /* Force universally light text in dark mode for legibility */
      .dark .dx, .dark .dx table td, .dark .dx table th { color: hsl(var(--foreground)); }
      .dark .dx .text-muted-foreground { color: hsl(var(--foreground)); }
      .dark .dx .card { box-shadow: 0 8px 22px hsl(0 0% 0% / 0.35); }
      .dark .dx table thead { border-bottom-color: hsl(var(--border)); }
      .dark {
        /* ADD: dark-tuned variants */
        --success: 142 64% 45%;
        --warning: 38 92% 58%;
        --danger: 0 84% 60%;
      }

      /* ADD: shared grid cell styles */
      .dx .cell { height: 1rem; width: 1rem; border-radius: 0.2rem; border: 1px solid hsl(var(--border)); }
      .dx .cell.tp { background-color: hsl(var(--success) / 0.95); border-color: hsl(var(--success)); }    /* True Positive / True Negative (correct) */
      .dx .cell.tn { background-color: hsl(var(--success) / 0.95); border-color: hsl(var(--success)); }
      .dx .cell.fp { background-color: hsl(var(--warning) / 0.95); border-color: hsl(var(--warning)); }   /* False Positive */
      .dx .cell.fn { background-color: hsl(var(--danger) / 0.95);  border-color: hsl(var(--danger)); }    /* False Negative */

      /* Legend chips */
      .dx .chip { display:inline-flex; align-items:center; gap:0.4rem; padding:0.25rem 0.5rem; border-radius:0.5rem; border:1px solid hsl(var(--border)); }
      .dx .swatch { width:0.85rem; height:0.85rem; border-radius:0.2rem; border:1px solid hsl(var(--border)); }
      .dx .swatch.tp, .dx .swatch.tn { background-color: hsl(var(--success) / 0.95); border-color: hsl(var(--success)); }
      .dx .swatch.fp { background-color: hsl(var(--warning) / 0.95); border-color: hsl(var(--warning)); }
      .dx .swatch.fn { background-color: hsl(var(--danger) / 0.95); border-color: hsl(var(--danger)); }

    `}</style>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  // Initialize from localStorage or system preference
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem("theme") : null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = stored ? stored === 'dark' : prefersDark;
    setDark(!!shouldDark);
    const root = document.documentElement;
    if (shouldDark) root.classList.add("dark"); else root.classList.remove("dark");
  }, []);

  // Persist + toggle class on change
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove("dark");
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <Button
      variant="outline"
      size="icon"
      className="btn btn-outline icon-btn"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={() => setDark(v => !v)}
    >
      {dark ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

interface StatProps {
  label: string;
  value: string;
  hint?: string;
}

function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="flex flex-col">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold" aria-live="polite">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

interface TenByTenGridProps {
  probability: number;
}

function TenByTenGrid({ probability }: TenByTenGridProps) {
  const count = Math.round(probability * 100);
  const activeStyle = { backgroundColor: 'hsl(var(--primary) / 0.90)', borderColor: 'hsl(var(--primary))' } as React.CSSProperties;
  const mutedStyle = { backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' } as React.CSSProperties;
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 100 }).map((_, i) => (
        <div
          key={i}
          className={"h-4 w-4 rounded-sm border"}
          style={i < count ? activeStyle : mutedStyle}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

type OutcomeKind = "tp" | "tn" | "fp" | "fn";

function OutcomeGrid({
  total = 100,
  correctCount,
  incorrectCount,
  correctClass,   // "tp" or "tn"
  incorrectClass, // "fp" or "fn"
  ariaLabel
}: {
  total?: number;
  correctCount: number;
  incorrectCount: number;
  correctClass: "tp" | "tn";
  incorrectClass: "fp" | "fn";
  ariaLabel: string;
}) {
  const cells: OutcomeKind[] = [];
  for (let i = 0; i < correctCount; i++) cells.push(correctClass);
  for (let i = 0; i < incorrectCount; i++) cells.push(incorrectClass);
  while (cells.length < total) cells.push(correctClass); // should not happen, safety

  return (
    <div className="grid grid-cols-10 gap-1" role="img" aria-label={ariaLabel}>
      {cells.slice(0, total).map((k, i) => (
        <div key={i} className={`cell ${k}`} aria-hidden="true" />
      ))}
    </div>
  );
}


interface SortConfig {
  key: keyof TestData;
  direction: "asc" | "desc";
}

function useSortableData(items: TestData[], config: SortConfig | null = null) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(config);
  const sortedItems = useMemo(() => {
    const sortable = [...items];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        const { key, direction } = sortConfig;
        const va = a[key];
        const vb = b[key];
        const aVal = va ?? (typeof vb === 'number' ? 0 : '');
        const bVal = vb ?? (typeof va === 'number' ? 0 : '');
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [items, sortConfig]);

  function requestSort(key: keyof TestData) {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  }

  return { items: sortedItems, requestSort, sortConfig };
}

function StudyNotesPanel({ selected }: { selected: TestData | null }) {
  const k = selected ? keyFor(selected.test, selected.condition) : null;
  const notes = (k && DETAILS[k]) || null;

  return (
    <Card className="card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Study notes & caveats</div>
          {selected?.referenceUrl && (
            <a
              href={selected.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline underline-offset-2 hover:no-underline"
              aria-label="Open reference link"
            >
              Reference <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {!selected && (
          <div className="text-sm text-muted-foreground">Select a test from the table to see study details.</div>
        )}

        {selected && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">{selected.test} — {selected.condition}</div>

            {notes ? (
              <div className="space-y-3">
                {notes.overview && (
                  <div>
                    <div className="text-xs text-muted-foreground">Overview</div>
                    <p className="text-sm leading-relaxed">{notes.overview}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground font-medium">Study Characteristics</div>
                  {notes.sampleSize && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Sample Size</span>
                      <span className="text-sm font-medium">{notes.sampleSize}</span>
                    </div>
                  )}
                  {notes.population && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Population</span>
                      <span className="text-sm font-medium">{notes.population}</span>
                    </div>
                  )}
                  {notes.setting && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Setting</span>
                      <span className="text-sm font-medium">{notes.setting}</span>
                    </div>
                  )}
                  {notes.design && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Design</span>
                      <span className="text-sm font-medium">{notes.design}</span>
                    </div>
                  )}
                  {notes.year && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Year</span>
                      <span className="text-sm font-medium">{notes.year}</span>
                    </div>
                  )}
                </div>

                {notes.caveats && notes.caveats.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground">Caveats</div>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {notes.caveats.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {notes.extra && (
                  <div className="text-xs text-muted-foreground">{notes.extra}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No custom notes for this test yet. Add an entry to <code>DETAILS</code> using key <code>{k}</code>.
              </div>
            )}

            <div className="pt-2 border-t text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium">Reference:</span>{' '}
              {selected.referenceUrl ? (
                <a href={selected.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
                  {selected.reference}
                </a>
              ) : (
                selected.reference
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DiagnosticTestExplorer() {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("All");
  const [selected, setSelected] = useState<TestData | null>(null);
  const [prevalence, setPrevalence] = useState(10); // %
  const [testResult, setTestResult] = useState<"positive" | "negative">("positive"); // positive | negative

  const filtered = useMemo(() => {
    return DATA.filter(d => (condition === "All" || d.condition === condition) && (
      d.test.toLowerCase().includes(query.toLowerCase()) || d.condition.toLowerCase().includes(query.toLowerCase())
    ));
  }, [query, condition]);

  const { items: sorted, requestSort, sortConfig } = useSortableData(filtered);

  useEffect(() => {
    if (!selected && sorted.length > 0) setSelected(sorted[0]);
  }, [sorted, selected]);

  const prevalence01 = prevalence / 100;

  // Use the selected test for LR and post-test calculations shown on the left panel
  const lrChoice = selected ? (testResult === "positive" ? selected.lrPlus : selected.lrMinus) : 1;
  const postChoice = selected ? postTestProb(prevalence01, lrChoice) : prevalence01;

  // Lightweight runtime tests (dev-only) to catch regressions
  useEffect(() => {
    console.assert(Math.abs(probToOdds(0.5) - 1) < 1e-9, "probToOdds(0.5) should be 1");
    console.assert(Math.abs(oddsToProb(1) - 0.5) < 1e-9, "oddsToProb(1) should be 0.5");
    const demo = postTestProb(0.1, 10); // ~0.526
    console.assert(demo > 0.5 && demo < 0.53, "postTestProb sanity check failed");
    // Extra tests
    console.assert(postTestProb(0.2, 1) === 0.2, "LR=1 should not change probability");
    console.assert(postTestProb(0.01, 20) > 0.15, "High LR+ should raise low pre-test prob");
    console.assert(postTestProb(0.8, 0.1) < 0.4, "Low LR- should reduce high pre-test prob");
  }, []);

  return (
    <TooltipProvider>
      <ThemeVars />
      <div className="dx min-h-screen bg-background text-foreground">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
          <div className="mx-auto max-w-7xl px-2 py-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary" />
              <h1 className="text-xl font-semibold tracking-tight">Diagnostic Test Explorer</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <DarkModeToggle />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-2 py-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Controls & Summary (Left column) */}
          <section className="lg:col-span-2 space-y-4">
            <Card className="card">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input className="input" placeholder="Search tests or conditions…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="select-trigger w-full">
                      <SelectValue placeholder="Filter by condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All conditions</SelectItem>
                      {CONDITIONS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Prevalence (pre-test probability)</div>
                    <div className="text-sm tabular-nums" aria-live="polite">{prevalence}%</div>
                  </div>
                  <Slider min={1} max={90} step={1} value={[prevalence]} onValueChange={(v) => setPrevalence(v[0])} />
                  <div className="text-xs text-muted-foreground">Drag to set the estimated prevalence in your population/context.</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">Test result</div>
                  <div className="ml-auto flex gap-2">
                    <Button className={testResult === "positive" ? "btn btn-primary" : "btn btn-outline"} onClick={() => setTestResult("positive")}>Positive</Button>
                    <Button className={testResult === "negative" ? "btn btn-primary" : "btn btn-outline"} onClick={() => setTestResult("negative")}>Negative</Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <Stat label="Sensitivity" value={selected ? (selected.sensitivity*100).toFixed(0) + "%" : "—"} />
                  <Stat label="Specificity" value={selected ? (selected.specificity*100).toFixed(0) + "%" : "—"} />
                  <Stat label={testResult === "positive" ? "LR+" : "LR-"} value={selected ? (testResult === "positive" ? selected.lrPlus : selected.lrMinus).toFixed(2) : "—"} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Pre-test prob" value={(prevalence01*100).toFixed(0) + "%"} />
                  <Stat label="Post-test prob" value={(postChoice*100).toFixed(0) + "%"} hint={selected ? `Using ${testResult === 'positive' ? 'LR+' : 'LR-'} for ${selected.test}` : undefined} />
                </div>

                <div className="space-y-4">
                  {/* Sensitivity/Specificity visual (confusion-style) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <span>Visual: Sensitivity & Specificity (TP/FN/TN/FP)</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-sm">
                          Each 10×10 grid represents 100 people within the indicated group.
                          Diseased group shows True Positives (green) and False Negatives (red).
                          Non-diseased group shows True Negatives (green) and False Positives (amber).
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    {/* Diseased cohort - Sensitivity */}
                    <Card className="card" style={{ backgroundColor: 'hsl(var(--muted) / 0.30)' }}>
                      <CardContent className="p-5 space-y-3">
                        <div className="text-xs text-muted-foreground">Diseased cohort (uses Sensitivity)</div>
                        <OutcomeGrid
                          correctCount={Math.round((selected?.sensitivity ?? 0) * 100)}   // TP
                          incorrectCount={100 - Math.round((selected?.sensitivity ?? 0) * 100)} // FN
                          correctClass="tp"
                          incorrectClass="fn"
                          ariaLabel="Diseased cohort grid showing True Positives and False Negatives"
                        />
                        <div className="text-sm font-medium" aria-live="polite">
                          Sensitivity: {((selected?.sensitivity ?? 0) * 100).toFixed(0)}% — 
                          <span className="ml-1">TP</span> {Math.round((selected?.sensitivity ?? 0) * 100)},
                          <span className="ml-1">FN</span> {100 - Math.round((selected?.sensitivity ?? 0) * 100)}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Non-diseased cohort - Specificity */}
                    <Card className="card" style={{ backgroundColor: 'hsl(var(--muted) / 0.30)' }}>
                      <CardContent className="p-5 space-y-3">
                        <div className="text-xs text-muted-foreground">Non-diseased cohort (uses Specificity)</div>
                        <OutcomeGrid
                          correctCount={Math.round((selected?.specificity ?? 0) * 100)}   // TN
                          incorrectCount={100 - Math.round((selected?.specificity ?? 0) * 100)} // FP
                          correctClass="tn"
                          incorrectClass="fp"
                          ariaLabel="Non-diseased cohort grid showing True Negatives and False Positives"
                        />
                        <div className="text-sm font-medium" aria-live="polite">
                          Specificity: {((selected?.specificity ?? 0) * 100).toFixed(0)}% — 
                          <span className="ml-1">TN</span> {Math.round((selected?.specificity ?? 0) * 100)},
                          <span className="ml-1">FP</span> {100 - Math.round((selected?.specificity ?? 0) * 100)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="chip"><span className="swatch tp" /> True Positive</span>
                    <span className="chip"><span className="swatch fn" /> False Negative</span>
                    <span className="chip"><span className="swatch tn" /> True Negative</span>
                    <span className="chip"><span className="swatch fp" /> False Positive</span>
                  </div>




                  {/* Post-test probability visual */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <span>Visual: Post-test probability</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-sm">
                          A 10×10 grid (100 people). Highlighted squares represent how many are expected to have the condition after applying the test result.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <TenByTenGrid probability={postChoice} />
                  </div>

                </div>

                {selected && (
                  <div className="text-xs text-muted-foreground leading-relaxed pt-2 border-t">
                    <div>
                      <span className="font-medium">Reference:</span>{' '}
                      {selected.referenceUrl ? (
                        <a href={selected.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
                          {selected.reference}
                        </a>
                      ) : (
                        selected.reference
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NEW: Study Notes & Caveats panel */}
            <StudyNotesPanel selected={selected} />
          </section>

          {/* Table (Right column) */}
          <section className="lg:col-span-2 space-y-4">
            <Card className="card">
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 backdrop-blur border-b" style={{ backgroundColor: 'hsl(var(--muted) / 0.70)' }}>
                      <tr>
                        {[
                          { key: "test", label: "Test" },
                          { key: "condition", label: "Condition" },
                          { key: "sensitivity", label: "Sensitivity", tooltip: "Proportion of people WITH the condition who test positive (true positive rate)" },
                          { key: "specificity", label: "Specificity", tooltip: "Proportion of people WITHOUT the condition who test negative (true negative rate)" },
                          { key: "lrPlus", label: "LR+", tooltip: "Likelihood Ratio Positive: How much more likely a positive test result is in people WITH vs WITHOUT the condition" },
                          { key: "lrMinus", label: "LR-", tooltip: "Likelihood Ratio Negative: How much more likely a negative test result is in people WITH vs WITHOUT the condition" },
                          { key: "reference", label: "Reference" },
                        ].map(col => (
                          <th
                            key={col.key}
                            scope="col"
                            className="text-left font-medium px-3 py-2 cursor-pointer select-none"
                            onClick={() => requestSort(col.key as keyof TestData)}
                          >
                            <div className="inline-flex items-center gap-1">
                              {col.tooltip ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{col.label}</span>
                                  </TooltipTrigger>
                                  <TooltipContent 
                                    side="top" 
                                    className="max-w-xs text-sm bg-muted border border-border text-foreground shadow-lg backdrop-blur-sm"
                                  >
                                    {col.tooltip}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span>{col.label}</span>
                              )}
                              <ChevronDown className={"h-4 w-4 transition-transform " + (sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? 'rotate-180' : '') : 'opacity-30')} />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((row, idx) => {
                        const isActive = selected && selected.test === row.test && selected.condition === row.condition;
                        return (
                          <tr key={row.test + idx} className={(isActive ? "row active" : "row") + " border-b align-top"}>
                            <td className="px-3 py-2">
                              <button className="btn btn-outline" onClick={() => setSelected(row)}>
                                {row.test}
                              </button>
                            </td>
                            <td className="px-3 py-2">{row.condition}</td>
                            <td className="px-3 py-2 tabular-nums">{(row.sensitivity*100).toFixed(0)}%</td>
                            <td className="px-3 py-2 tabular-nums">{(row.specificity*100).toFixed(0)}%</td>
                            <td className="px-3 py-2 tabular-nums">{row.lrPlus.toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums">{row.lrMinus.toFixed(2)}</td>
                            <td className="px-3 py-2 text-muted-foreground max-w-[18rem]">
                              {row.referenceUrl ? (
                                <a href={row.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
                                  {row.reference}
                                </a>
                              ) : (
                                row.reference
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>

        <footer className="border-t py-3 text-center text-xs text-muted-foreground">
          Built for teaching & quick bedside reasoning. Information displayed may not be up to date. Individual clinician responsible for cross referencing information displayed. Always consider the whole clinical picture.
        </footer>
      </div>
    </TooltipProvider>
  );
}
