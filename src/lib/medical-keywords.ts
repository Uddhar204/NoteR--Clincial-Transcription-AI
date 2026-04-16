// Medical keyword dictionaries for real-time tagging in cardiology context

export type KeywordCategory =
  | "symptom"
  | "condition"
  | "medication"
  | "vital"
  | "test";

export interface DetectedKeyword {
  term: string;
  category: KeywordCategory;
  count: number;
  firstSeen: number;
}

const SYMPTOM_TERMS = [
  "chest pain",
  "chest tightness",
  "chest discomfort",
  "chest pressure",
  "angina",
  "dyspnea",
  "shortness of breath",
  "breathlessness",
  "breathing difficulty",
  "palpitations",
  "heart pounding",
  "racing heart",
  "dizziness",
  "dizzy",
  "lightheaded",
  "light headed",
  "syncope",
  "fainting",
  "fainted",
  "edema",
  "swelling",
  "swollen legs",
  "swollen ankles",
  "fatigue",
  "tired",
  "tiredness",
  "weakness",
  "nausea",
  "sweating",
  "diaphoresis",
  "cough",
  "coughing",
  "wheezing",
  "orthopnea",
  "jaw pain",
  "arm pain",
  "neck pain",
  "back pain",
  "claudication",
  "leg pain",
  "headache",
  "blurred vision",
  "weight gain",
  "weight loss",
  "appetite loss",
  "insomnia",
  "anxiety",
  "restlessness",
  // Hindi common terms
  "seene mein dard",
  "chakkar",
  "sans",
  "sujan",
  "thakan",
  "kamzori",
  "dard",
  "ghbrahat",
];

const CONDITION_TERMS = [
  "hypertension",
  "high blood pressure",
  "high bp",
  "hypotension",
  "low blood pressure",
  "low bp",
  "diabetes",
  "diabetic",
  "sugar",
  "myocardial infarction",
  "heart attack",
  "mi",
  "stemi",
  "nstemi",
  "arrhythmia",
  "atrial fibrillation",
  "af",
  "afib",
  "a-fib",
  "tachycardia",
  "bradycardia",
  "heart failure",
  "chf",
  "congestive heart failure",
  "coronary artery disease",
  "cad",
  "valvular disease",
  "valve disease",
  "mitral stenosis",
  "mitral regurgitation",
  "aortic stenosis",
  "aortic regurgitation",
  "cardiomyopathy",
  "pericarditis",
  "endocarditis",
  "dvt",
  "deep vein thrombosis",
  "pulmonary embolism",
  "pe",
  "stroke",
  "tia",
  "anemia",
  "thyroid",
  "hypothyroid",
  "hyperthyroid",
  "copd",
  "asthma",
  "ckd",
  "renal failure",
  "kidney disease",
  "hyperlipidemia",
  "high cholesterol",
  "cholesterol",
  "obesity",
];

const MEDICATION_TERMS = [
  "aspirin",
  "ecosprin",
  "clopidogrel",
  "plavix",
  "ticagrelor",
  "prasugrel",
  "warfarin",
  "heparin",
  "enoxaparin",
  "rivaroxaban",
  "apixaban",
  "dabigatran",
  "metoprolol",
  "atenolol",
  "carvedilol",
  "bisoprolol",
  "propranolol",
  "amlodipine",
  "nifedipine",
  "diltiazem",
  "verapamil",
  "enalapril",
  "ramipril",
  "lisinopril",
  "losartan",
  "telmisartan",
  "valsartan",
  "olmesartan",
  "atorvastatin",
  "rosuvastatin",
  "simvastatin",
  "furosemide",
  "lasix",
  "torsemide",
  "spironolactone",
  "hydrochlorothiazide",
  "digoxin",
  "amiodarone",
  "nitroglycerin",
  "isosorbide",
  "nitrate",
  "insulin",
  "metformin",
  "glimepiride",
  "pantoprazole",
  "omeprazole",
  "paracetamol",
  "ibuprofen",
];

const VITAL_TERMS = [
  "blood pressure",
  "bp",
  "systolic",
  "diastolic",
  "heart rate",
  "pulse",
  "pulse rate",
  "respiratory rate",
  "oxygen saturation",
  "spo2",
  "temperature",
  "bmi",
  "body mass index",
  "weight",
  "height",
  "jvp",
  "jugular venous pressure",
];

const TEST_TERMS = [
  "ecg",
  "ekg",
  "electrocardiogram",
  "echocardiogram",
  "echo",
  "2d echo",
  "stress test",
  "tmt",
  "treadmill test",
  "angiography",
  "angiogram",
  "catheterization",
  "cath lab",
  "holter",
  "holter monitor",
  "ct scan",
  "ct angiography",
  "mri",
  "cardiac mri",
  "chest x-ray",
  "x-ray",
  "troponin",
  "bnp",
  "nt-probnp",
  "lipid profile",
  "lipid panel",
  "cbc",
  "complete blood count",
  "creatinine",
  "urea",
  "electrolytes",
  "potassium",
  "sodium",
  "hba1c",
  "a1c",
  "thyroid profile",
  "tsh",
  "pt inr",
  "inr",
  "d-dimer",
  "ck-mb",
  "ldh",
  "ast",
  "alt",
  "blood sugar",
  "fasting sugar",
  "random sugar",
];

const CATEGORY_MAP: Record<KeywordCategory, string[]> = {
  symptom: SYMPTOM_TERMS,
  condition: CONDITION_TERMS,
  medication: MEDICATION_TERMS,
  vital: VITAL_TERMS,
  test: TEST_TERMS,
};

export function extractKeywords(
  text: string,
  existingKeywords: Map<string, DetectedKeyword>
): Map<string, DetectedKeyword> {
  const lowerText = text.toLowerCase();
  const updated = new Map(existingKeywords);

  for (const [category, terms] of Object.entries(CATEGORY_MAP)) {
    for (const term of terms) {
      // Use word boundary matching
      const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches) {
        const key = `${category}:${term}`;
        const existing = updated.get(key);
        if (existing) {
          updated.set(key, {
            ...existing,
            count: existing.count + matches.length,
          });
        } else {
          updated.set(key, {
            term: formatTerm(term),
            category: category as KeywordCategory,
            count: matches.length,
            firstSeen: Date.now(),
          });
        }
      }
    }
  }

  return updated;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatTerm(term: string): string {
  // Capitalize first letter of each word
  return term
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getCategoryLabel(category: KeywordCategory): string {
  const labels: Record<KeywordCategory, string> = {
    symptom: "Symptoms",
    condition: "Conditions",
    medication: "Medications",
    vital: "Vitals",
    test: "Tests & Investigations",
  };
  return labels[category];
}

export function getCategoryIcon(category: KeywordCategory): string {
  const icons: Record<KeywordCategory, string> = {
    symptom: "🔴",
    condition: "🔵",
    medication: "🟢",
    vital: "🟡",
    test: "🟣",
  };
  return icons[category];
}
