# notER - AI Clinical Copilot

notER is an advanced, AI-powered clinical transcription and documentation platform designed for healthcare professionals. Built with Next.js, it acts as a passive clinical copilot, listening to doctor-patient consultations in real-time, transcribing the audio, and automatically generating structured clinical documentation including SOAP notes and prescriptions.

## 🚀 Key Features

### 🎙️ Real-time Medical Transcription
- **Vapi.ai Integration**: Uses a highly optimized passive listener configuration to capture audio without interrupting the consultation.
- **Deepgram Nova-3**: Employs Deepgram's industry-leading `nova-3` speech-to-text model, English-optimized for maximum accuracy.
- **Medical Keyword Boosting**: Transcriber is explicitly tuned with weighted cardiovascular and general medical terminology (e.g., Atorvastatin, Metoprolol, echocardiogram) to ensure accurate capture of complex drug names and conditions.

### 🧠 Intelligent Clinical Analysis
- **Google Gemini Integration**: Utilizes the Google Gemini API to process raw transcripts.
- **SOAP Note Generation**: Automatically structures the conversation into Subjective, Objective, Assessment, and Plan components.
- **Prescription Extraction**: Identifies medications, dosages, frequencies, and durations discussed during the visit.
- **Live Keyword Extraction**: Highlights key medical terms and categorizes them (Symptoms, Conditions, Medications) in real-time.

### 🔒 Secure Patient Data Storage
- **Qdrant Vector Database**: Persists consultation records locally/remotely for high-performance retrieval.
- **AES-256-GCM Encryption**: All sensitive patient data is symmetrically encrypted before being stored in the database, ensuring HIPAA-compliant-level data at rest.
- **Unique UUIDs**: Robust session management using cryptographically secure UUIDs.

### 📄 Clinical Document Generation
- **Printable Prescriptions**: Generates beautifully formatted, printable Rx documents containing Patient Name, Age, Gender, and prescribed medications.
- **PDF Export**: Exports the entire consultation summary and SOAP notes into a professional, hospital-grade A4 PDF document.

### 💻 Modern Medical UI
- **Hospital-Grade Aesthetics**: Clean, responsive interface featuring medical dark mode elements, glassmorphism, and intuitive clinical workflows.
- **Validation**: Strict patient data validation (Age 1-150, discrete Gender selection) prior to consultation start.

## 🛠️ Technology Stack
- **Frontend/Framework**: Next.js (App Router), React, Tailwind CSS
- **Voice AI**: Vapi.ai SDK (Web)
- **Language Model**: Google Gemini (via `@google/genai` or `@google/generative-ai`)
- **Database**: Qdrant (Vector Database)
- **Encryption**: Node.js native `crypto` module (AES-256-GCM)

## 🔮 Future Roadmap

- **Authentication & Authorization**: Implement robust JWT-based doctor login and role-based access control.
- **Historical Record Search**: Build a patient dashboard allowing doctors to semantic-search past consultations via Qdrant's vector search capabilities.
- **EMR/EHR Integration**: Support HL7/FHIR standards to push generated SOAP notes directly to existing hospital records systems.
- **Multi-lingual Support**: Expand the Deepgram transcriber capabilities to accurately capture non-English patient consultations and translate the clinical notes to English.
- **Analytics Dashboard**: Provide clinical insights, common diagnoses, and prescribing patterns over time.

## ⚙️ Setup & Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Set up environment variables in \`.env.local\`:
   \`\`\`env
   # Vapi Configuration
   NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key

   # Gemini Configuration
   GEMINI_API_KEY=your_gemini_api_key

   # Qdrant Database
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_api_key

   # Encryption (32-byte hex string)
   ENCRYPTION_KEY=your_secure_32_byte_hex_key
   \`\`\`
4. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## 📝 License
Proprietary - All rights reserved.
