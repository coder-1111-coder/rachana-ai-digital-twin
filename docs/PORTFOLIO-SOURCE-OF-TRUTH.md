# Portfolio Source of Truth

**Owner:** Rachana S — Year 3 Digital Transformation / AI-ML student.

This file is the **only factual source** for the website copy (`data/portfolio.json`) and for
the AI Digital Twin ("Ask Rachana"). It contains only information verified and supplied by the
owner in the original project brief.

## Rules

1. Nothing may be added here unless the owner supplied it.
2. `data/portfolio.json` must be derivable from this file. `npm test` cross-checks that every
   number and technology in the JSON appears in this document.
3. If something is not listed here, it is **unknown**. The site and the twin must say so
   instead of guessing.
4. Do not add performance numbers, dates, employers, awards, certifications or technologies.

---

## Projects

### 1. PCA + ANN Face Recognition System

**Technologies:** Python, OpenCV, NumPy, TensorFlow/Keras, Scikit-learn, Matplotlib, Seaborn.

**Dataset:** 450 facial images, 9 people, 50 images per person.

**Pipeline:**
image loading → grayscale → resize 100x100 → flatten → mean face → mean subtraction →
surrogate covariance → eigen decomposition → eigenfaces → PCA signatures →
60/40 stratified split → ANN → evaluation.

**ANN:** 128 ReLU → Dropout 0.3 → 64 ReLU → Dropout 0.2 → 9 Softmax.

**Includes:**
- confusion matrix
- classification metrics
- accuracy vs k
- imposter detection
- confidence threshold
- saved ANN model
- PCA/eigenface visualizations

**Project materials:** https://drive.google.com/drive/folders/1QdUDRg0ahajt_9Tomr2ttUf3i_QSxEhL?usp=drive_link

### 2. Hazardous Asteroid Prediction

Binary classification: Hazardous vs Non-Hazardous Near-Earth Objects.

**Dataset:** NASA NEO historical observations.

**Known project characteristics:**
- approximately 90,836 close-approach records
- approximately 27,423 unique asteroid IDs
- approximately 9.7% hazardous class
- repeated asteroid IDs

**Workflow:**
- missing-value analysis
- duplicate analysis
- zero-variance feature removal
- feature engineering
- average estimated diameter
- leakage-safe grouped train/test separation
- SMOTE only on training data
- 9 classification algorithms
- accuracy, precision, recall, F1, ROC-AUC
- Gradient Boosting optimization
- RandomizedSearchCV
- feature importance
- permutation importance
- Joblib
- prediction interface

No additional performance numbers exist in the verified source.

**Project materials:** https://drive.google.com/drive/folders/1uvXxiPpQYEyoGz2fQsUdSBc8Gr40z_0J?usp=drive_link

### 3. Employee Attrition + Salary Prediction

**Dataset:** IBM HR Attrition dataset.

**Tasks:**
- Attrition classification
- MonthlyIncome regression

**Methods:**
- preprocessing
- encoding
- scaling
- train/test split
- SMOTE
- feature engineering
- GridSearchCV
- log transformation
- multiple classification algorithms
- multiple regression algorithms
- F1/AUC
- RMSE/R²

**Repository:** https://github.com/rachana26paw/hr-attrition-ml-analysis

### 4. Symbio-NLM

Full-stack genomics platform.

**Features:**
- FASTA upload
- FASTA validation
- DNA parsing
- GC content
- nucleotide counts
- ORF detection
- genomic dashboard
- Recharts
- GSAP
- AI sequence summaries
- AI chatbot
- authentication
- Google/Microsoft/GitHub OAuth
- PDF reports

**Technology:** React, Node.js, Express, MongoDB/Mongoose, GSAP, Recharts, Tailwind,
Passport/OAuth, AI integration, PDF generation.

**Repository:** https://github.com/anurag-njr11/Symbio-project

### 5. Space Atlas

Full-stack astronomy application.

**Features:**
- 30+ celestial bodies
- search
- filtering
- detail pages
- responsive UI
- NASA imagery
- JWT authentication
- admin panel
- CRUD
- validation
- rate limiting
- Helmet
- Mongo sanitization
- CORS

**Technology:** React, React Router, Vite, Axios, Node.js, Express, MongoDB/Mongoose, JWT.

**Repository:** https://github.com/coder-1111-coder/Space-Atlas-backend-codes

### 6. Memory of a City

Interactive Bengaluru urban evolution explorer.

**Flow:** Home → City Explorer → year → neighborhood → compare years → metrics/charts →
AI Change Story → evidence.

**Historical metrics are DEMO DATA and must never be represented as verified real-world
measurements.**

Current geography uses OpenStreetMap.

**AI Change Story distinguishes:**
- Data Observation
- AI Interpretation
- Supporting Evidence

**Repository:** https://github.com/Meghna-K03/Memory-of--a-city.git

---

## About this website (facts about the site, not claims about Rachana's skills)

Stack: React, TypeScript, Vite, Tailwind CSS, Lucide React, Node.js, Express.
The AI Digital Twin calls Groq through the Express backend.

---

## Contact

Email: rachana00526@gmail.com

LinkedIn: https://www.linkedin.com/in/rachana-s-21b931331/

---

## Explicitly NOT in the verified source (treat as unknown)

Anything not written in this document is unknown, even if it is not listed here. The list below
names the most likely questions. `data/portfolio.json` repeats these lines verbatim and a test
checks they match.

- Employers, internships, jobs or any work history
- Dates or a chronology of the projects
- University name, GPA, grades or salary
- Certifications, awards, publications or hackathons
- Any performance numbers (accuracy, F1, ROC-AUC, RMSE, R² and so on) for any project
- The names of the 9 classification algorithms in the asteroid project
- The names of the classification and regression algorithms in the attrition project
- Which AI provider or model Symbio-NLM and Memory of a City use
- The technology stack of Memory of a City
- Row counts of the IBM HR Attrition dataset
- Deployment URLs for any project
- Repository links for the Face Recognition and Hazardous Asteroid Prediction projects
- Rachana's phone number and personal GitHub profile
- Personal interests, opinions, location, pronouns, or biography beyond being a Year 3 student
- Programming language, libraries or frameworks for any project other than those listed under that project
- Train/test split ratios for the asteroid and attrition projects
- Hyperparameters, search spaces, number of epochs, the value of k, and the confidence-threshold value
- What the log transformation in the attrition project was applied to
- Where SMOTE was applied in the attrition project
- Number of features or engineered features beyond those named
- Whether any project was solo or team work, Rachana's role, whether it was coursework or personal, and how long it took
