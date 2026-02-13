# ⚓ JSON Harbor

Interactive JSON validation learning game.

JSON Harbor is a browser-based learning project that teaches JSON
syntax, schema validation, structural correctness, and data
transformation through progressive missions.

The project consists of:

-   📘 **Compendium** (index.html) – explanation and learning reference
-   🎮 **Game** (game.html) – interactive validation missions
-   🧠 Custom JSON validation engine (no external libraries)
-   💾 localStorage-based progress tracking
-   🔁 Automatic reset after full completion

------------------------------------------------------------------------

## 🌊 Concept

You are the Harbor Inspector.

Incoming ships arrive with damaged or inconsistent JSON manifests. Your
job is to:

1.  Fix the JSON
2.  Pass parsing
3.  Pass schema validation
4.  Pass custom business rules
5.  (Dock 5) Match exact expected output

Missions unlock step-by-step.

You cannot skip ahead.

------------------------------------------------------------------------

## 🗂 Project Structure

```
/
├── index.html          # Compendium (entry page)
├── game.html           # JSON Harbor game
├── css/
│   ├── style.css
│   └── kstyle.css
├── js/
│   ├── engine.js
│   ├── validator.js
│   ├── comparator.js
│   ├── kscript.json
│   └── missions/
│       ├── missions.json
│       ├── 01/
│       ├── 02/
│       ├── 03/
│       ├── 04/
│       └── 05/
└── README.md

```

------------------------------------------------------------------------

## 🧠 Learning Goals

### Dock 1 — Syntax & Basics

-   Valid JSON format
-   Double quotes only
-   No trailing commas
-   Object vs array structure

### Dock 2 — Types & Required Fields

-   String vs number vs integer
-   Boolean vs string
-   Required properties
-   Null handling

### Dock 3 — Structure & Nesting

-   Nested objects
-   Required inside nested structures
-   Additional properties restrictions
-   Correct array item types

### Dock 4 — Lists & Rules

-   Unique IDs
-   Min/max items
-   String length constraints
-   Enum values

### Dock 5 — Transformations

-   Expected output matching
-   Field normalization
-   Aggregation
-   Derived values
-   Exact deep comparison

------------------------------------------------------------------------

## ⚙️ How It Works

### 1️⃣ JSON Parsing

JsonValidator.parse(text)

Fails early if JSON is syntactically invalid.

------------------------------------------------------------------------

### 2️⃣ Schema Validation (Custom Engine)

Supports a subset of JSON Schema:

-   type
-   required
-   properties
-   additionalProperties
-   items
-   enum
-   minItems / maxItems
-   string length rules

No external libraries are used.

------------------------------------------------------------------------

### 3️⃣ Custom Rules (Dock 4)

Business rules such as:

-   Unique IDs
-   Logical constraints

------------------------------------------------------------------------

### 4️⃣ Expected Output (Dock 5)

Deep comparison via:

JsonComparator.deepEqual(a, b)

Exact structure + values required.

------------------------------------------------------------------------

## 🔁 Progress System

Progress is stored in:

localStorage\[“json_harbor_progress_v2”\]

Tracks:

-   introDone
-   helpDone
-   current dock
-   current mission
-   completed mission IDs

When Dock 5 is completed:

-   Progress is wiped
-   Game resets to Dock 1

Replay-friendly design.

------------------------------------------------------------------------

## 🚀 Running Locally

Because missions are loaded via fetch(), you must run a local server.

### Python

python -m http.server 8000

Open:

http://localhost:8000

------------------------------------------------------------------------

## 📱 Responsive Design

-   Desktop: 3-column layout
-   Tablet: stacked panels
-   Mobile: vertical flow with full-width buttons

CSS uses breakpoints at:

-   1024px
-   600px

------------------------------------------------------------------------

## 🔮 Future Ideas

-   Syntax highlighting editor
-   Hint system per mission
-   Scoring system
-   Time challenge mode
-   Mission randomizer
-   Dark/Light theme toggle
-   Internationalization
-   Achievement system
-   Instructor mode
-   API version for classroom use

------------------------------------------------------------------------

## 📜 License

Educational project.

Use, modify, extend freely.

------------------------------------------------------------------------

## 👤 Author

Marcus Dziersan  
JSON Harbor — Inspect. Validate. Release.
