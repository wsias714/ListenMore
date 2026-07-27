# A Retention & Reflection System for Audiobooks: Evidence + Buildable Spec

## TL;DR

- **Audio isn’t worse for *understanding* than reading — it’s worse for *durable retention and precise recall*.** A meta-analysis of 46 studies (Clinton-Lisell, *Review of Educational Research*, 2022, N = 4,687) found listening vs. reading comprehension “not reliably different” (g = 0.07, p = .23), though reading held a modest edge for *inferential* comprehension (g = 0.36). But auditory memory is coarse and gist-based where visual memory is detailed, you can’t reread or visually anchor, and you usually listen while doing something else. The fix is not “listen harder” — it’s to bolt on the few techniques that actually work: **retrieval practice, spaced resurfacing, and application-focused reflection** (implementation intentions, pre-mortems).
- **What to build:** A **Google Sheet master index + one Google Doc per book** (not a single running doc), a **20–30 minute application-focused reflection template**, a **weekly random-resurfacing routine**, three small **Google Apps Script** automations (weekly email prompt, new-doc-from-template, review logger), and a **Claude Project** that uses the index as context for Socratic questioning and cross-book synthesis.
- **The biggest risk is not the tooling — it’s capture-without-review.** Keep it to ~30 min per book plus ~10 min/week; backfill only 10 books lightly; and let a fixed weekly cadence, not guilt, drive resurfacing. Over-engineering is the failure mode that kills systems like this.

-----

## PART A — What Actually Works (Evidence Summary)

### 1. Why listening is harder to retain than reading

**Comprehension is roughly equal; retention favors text.** The best current synthesis — Clinton-Lisell’s meta-analysis (2022, 46 studies, N = 4,687) — concluded “the overall difference between reading and listening comprehension was not reliably different” (g = 0.07, p = .23). The one meaningful gap: reading was modestly better for **inferential** comprehension (g = 0.36, p = .02), the exact kind of deeper processing that matters for applying ideas. So the popular claim that “you don’t really learn from audiobooks” is **overstated** — but so is “audio is just as good.” The honest read: audio is fine for grasping ideas in the moment and weaker for the connect-the-dots reasoning and later recall you care about.

**Auditory memory is genuinely coarser than visual memory.** This is the strongest mechanistic finding. Cohen, Horowitz & Wolfe (*PNAS*, 2009) found “in every situation… auditory memory proved to be systematically inferior to visual memory”  — participants recognized sound clips at a 78% hit rate (d′ = 1.68) versus Standing’s classic 96% hit rate for 1,100 images. A later fidelity study (*Psychonomic Bulletin & Review*, 2019) put it plainly: “auditory representations are coarse and gist-based, while visual representations are highly detailed.”  Translation for your use case: after an audiobook you’ll retain the **gist** but lose the specifics (the exact framework, the number, the caveat) unless you deliberately capture them. Note there is a nuance — some studies find auditory memory *decays more slowly* even though it starts weaker  — but for book learning the practical takeaway holds: capture specifics or lose them.

**No visual/spatial anchors and no easy reread.** With print you subconsciously remember “that idea was on the top-left of a right-hand page,” and you can flick back in seconds. Audio strips both the spatial scaffold and the ability to reread precisely — Audible bookmarks are a crude substitute for skimming.

**Playback speed has a real ceiling.** Kumar et al. (*Educational Psychology Review*, 2024) found “increasing playback speed to 2.5x speed did not impair test performance (though we still do not advise exceeding 2x speed).” Comprehension of speech starts declining around 275 words per minute (Foulke & Sticht, 1969). **Recommendation: 1.0–1.5x for dense, decision-relevant nonfiction; save higher speeds for lighter or familiar material.** Claims that “2x is objectively better” are marketing-flavored overstatement.

**Divided attention is the core audiobook problem — and it’s real.** Cognitive Load Theory (Sweller, *Cognitive Science*, 1988) explains why: working memory is strictly limited, and processing two streams at once produces a “split-attention effect.” A 2023 dual-task study using audiobooks as stimuli found that a demanding simultaneous visual task significantly reduced speech-comprehension accuracy and degraded the brain’s cortical tracking of *linguistic* (more than acoustic) speech features. Practically: listening while doing something cognitively demanding (heavy traffic, complex work) costs you comprehension; listening while doing something automatic (dishes, easy walk) costs much less.

### 2. Retention techniques, ranked by strength of evidence

The landmark source is Dunlosky, Rawson, Marsh, Nathan & Willingham, “Improving Students’ Learning With Effective Learning Techniques” (*Psychological Science in the Public Interest*, 2013, 14(1):4–58), which rated 10 common techniques.

**HIGH utility (build the whole system on these):**

- **Practice testing / retrieval practice (the “testing effect”).** Retrieving information from memory — rather than reviewing it — is one of the most robust findings in learning science. Dunlosky rated it high utility because it “benefited students of many different ages and ability levels and enhanced performance in many different areas.”
- **Distributed / spaced practice.** Same high rating, same breadth of evidence. Spacing reviews beats massing them.

**MODERATE utility (worth using selectively):**

- **Elaborative interrogation** (asking “why is this true?”) and **self-explanation** (explaining how new info connects to what you know). Both force generative processing.
- **Interleaving** (mixing topics/books rather than blocking one).
- **The protégé effect / learning by teaching.** Well-supported, but with a critical condition documented across studies (e.g., Nestojko et al., 2014): the benefit largely appears when you *know in advance* you’ll teach.  Teaching also works partly *because it’s a form of retrieval*. The Feynman technique (explain it simply, on a blank sheet, in your own words) is the DIY version.

**LOW utility (popular but weak — do NOT build your system around these):**

- Dunlosky (2013) rated **highlighting/underlining, summarization, rereading, keyword mnemonics, and imagery use** as low utility for durable learning. Highlighting and rereading in particular “feel” productive (fluency illusion) but produce minimal durable benefit. **“Learning styles” (auditory vs. visual learner) has no credible supporting evidence** and should be ignored.

### 3. Capture-in-the-moment (specific to audiobooks)

**Capturing notes *while* listening is a genuine divided-attention cost — unless you pause.** Hale & Courtney (*Language Testing*, 1994, n = 563) found that *urging* students to take notes during listening comprehension **significantly impaired** performance,  because it diverted attention. The resolution is the affordance audiobooks give you that live lectures don’t: **pause, then capture.** Pausing removes the simultaneity that causes the overload.

**Capture generatively, not verbatim.** The principle that summarizing in your own words beats transcribing is theoretically sound (levels-of-processing; Peper & Mayer, 1978). The most famous demonstration — Mueller & Oppenheimer’s “The Pen Is Mightier Than the Keyboard” (*Psychological Science*, 2014), which used *spoken* TED-talk stimuli — found longhand (generative) note-takers outperformed verbatim laptop typists on conceptual questions (η²p = .13). **Important caveat:** that specific longhand-vs-laptop effect largely *failed to replicate* (Morehead, Dunlosky & Rawson, *Educational Psychology Review*, 2019). So treat “your words beat verbatim” as a sound *principle*, not a settled effect size.

**Practical capture tools:** Audible’s **Clips** feature saves the last ~30 seconds of playback and lets you attach a text note  (tap the ••• or the clip icon → “Clips & Bookmarks”). This is your low-friction in-the-moment capture. **Flag, don’t transcribe** — a bookmark plus a two-word note is enough to reconstruct the idea later. (Note: exporting Audible clips to text is clunky — there’s no clean official export; third-party tools exist but require software installs and CAPTCHA-solving, so treat export as *optional/advanced*, not core.)

**The “open loop” (Zeigarnik) consideration — mostly a myth, with one usable kernel.** Bluma Zeigarnik (1927) famously found interrupted tasks were recalled ~2x better than completed ones.  But a 2025 meta-analysis (Ghibellini & Meier, *Humanities and Social Sciences Communications*) found **no reliable memory advantage for unfinished tasks** — the effect “lacks universal validity.” What *did* survive is the related **Ovsiankina resumption effect**: interrupted tasks create a pull to return and finish them. So don’t rely on “leaving a book open” to boost memory; do use a deliberate open question (“what would I change?”) as a *hook that motivates you to return* for reflection.

### 4. Reflection frameworks used by serious readers — which fit audio + decisions

|Framework                                              |What it is                                                                                              |Fit for audio + application goal                                                                                                                                                                                                 |
|-------------------------------------------------------|--------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Farnam St. “Blank Sheet”** (Parrish)                 |Before/after reading, dump what you know on a blank page; add in a new color; review before each session|**Excellent.** It’s pure retrieval practice + elaboration. Adapts perfectly to audio — do it from memory after finishing.                                                                                                        |
|**Feynman technique**                                  |Explain the idea simply, in your own words, find the gaps                                               |**Excellent.** DIY protégé effect; drives the deep processing audio lacks.                                                                                                                                                       |
|**Ryan Holiday notecard/commonplace**                  |Mark passages; weeks later, transcribe onto theme-tagged cards                                          |**Good, adapt digitally.** The *theme-tagging* and *delay before processing* are the valuable parts. His deliberate few-week wait is itself a spacing interval.                                                                  |
|**Tiago Forte CODE/PARA + Progressive Summarization**  |Capture→Organize→Distill→Express; layer notes from raw to bolded to summarized                          |**Partial.** PARA’s “organize by actionability” is useful; progressive summarization (highlighting layers) is closer to the low-utility techniques — skip the elaborate highlighting, keep the “distill to one usable line” idea.|
|**Zettelkasten / atomic notes** (Luhmann/Ahrens)       |One idea per note, densely linked                                                                       |**Adopt the principle, not the machinery.** “One idea per note, tagged, linkable” is exactly what makes a library AI-searchable. Full Zettelkasten is over-engineering for 24 books/year.                                        |
|**Adler, *How to Read a Book*** (analytical/syntopical)|Deep single-book then cross-book reading                                                                |**Use syntopical thinking for your weekly cross-book synthesis**, not per-book. Full analytical reading is too heavy for audio.                                                                                                  |
|**Cornell method**                                     |Cue column + notes + summary                                                                            |**Marginal for audio** (built for live lectures with a cue column); the “summary at the bottom” survives.                                                                                                                        |

**Verdict:** For a decision-application goal (not academic study), the winning combination is **Blank Sheet + Feynman + theme-tagging + atomic notes** — all of which are retrieval- and application-oriented, and all of which work from memory after listening.

### 5. Prompts that drive APPLICATION (not summary)

The research says the highest-leverage additions are:

- **Implementation intentions (“if-then” plans).** Gollwitzer & Sheeran (*Advances in Experimental Social Psychology*, 2006, 38:69–119, >8,000 participants): “Findings from 94 independent tests showed that implementation intentions had a positive effect of medium-to-large magnitude (d = .65) on goal attainment.”  This is the single best-supported way to turn an idea into behavior. Every book reflection should end with at least one “If [situation], then I will [action].”
- **Pre-mortems.** Klein (*Harvard Business Review*, Sept 2007), building on Mitchell, Russo & Pennington (1989): “prospective hindsight — imagining that an event has already occurred — increases the ability to correctly identify reasons for future outcomes by 30%.”   Use it to pressure-test any decision a book prompts.
- **Connect-to-prior-knowledge / elaboration.** “What does this confirm, contradict, or complicate in what I already believed?” (the Blank Sheet move).
- **The decision-difference question:** “What decision — at work or in life — would I make differently because of this book?”

### 6. Spaced resurfacing — realistic cadence for ~24 books/year

The key research finding, from Cepeda, Vul, Rohrer, Wixted & Pashler (“Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention,” *Psychological Science*, 2008, 19:1095–1102, >1,350 participants): “The optimal gap increased as test delay increased… the optimal gap declined from about 20 to 40% of a 1-week test delay to about 5 to 10% of a 1-year test delay.”  

**What this means concretely:** if you want to remember a book’s ideas for a year, reviews spaced roughly **1–2 months apart** are in the right zone (≈5–10% of a year). You do *not* need daily flashcard-style review — that’s calibrated for verbatim facts, which are your *secondary* goal.

**How the tools do it:** Readwise resurfaces highlights via probabilistic (stochastic) daily review, weighted by number of highlights per book,  with an optional spaced-repetition “Mastery” layer. Anki uses precise per-card scheduling (overkill for concepts). Obsidian plugins offer random-note review. **For your goals and library size, a simple weekly random draw beats all of these** — with ~24 books/year and ~1 review/week, each book naturally recurs roughly every ~6 months, landing near the Cepeda “remember-for-a-year” zone. You get the spacing benefit with almost no machinery.

### 7. Making the library genuinely searchable over time

For an AI assistant to retrieve and synthesize across your notes later, structure matters more than volume:

- **Atomicity:** one idea per bullet/note, self-contained (readable without surrounding context).
- **Consistent metadata:** the same fields on every book (see schema below) so filtering/sorting works.
- **Explicit themes/tags** from a *controlled vocabulary* (a fixed short list you reuse), not free-form tags — this is what enables cross-book linking.
- **A one-line thesis per book** — the highest-value field for both your memory and AI retrieval.
- **Plain text / Google Docs** (not images or audio) so everything is full-text searchable and machine-readable.

-----

## PART B — The System (Buildable Spec)

### B1. Folder & document structure — DECISION: Sheet index + one Doc per book

**Use a single Google Sheet master index PLUS one Google Doc per book. Do not use one giant running doc.**

Why:

- **Per-book Docs** keep each reflection atomic, individually shareable, and individually linkable — and prevent one enormous unwieldy file. Each Doc is a clean unit you can paste into Claude when you want to go deep on one book.
- **The Sheet index** gives you sortable/filterable metadata, one-line theses at a glance, and — critically — **a compact, low-token artifact you can hand to Claude** as the “table of contents” of your whole library without dumping every full note.
- A single running doc fails on all three: it’s not atomic, it gets too big for Claude’s context, and it’s painful to navigate.

**Drive structure:**

```
📁 Audiobook Library
   📄 _MASTER INDEX (Google Sheet)
   📄 _TEMPLATE – Book Reflection (Google Doc)
   📁 Books
      📄 2026-01 Thinking in Bets – Annie Duke
      📄 2026-02 The Psychology of Money – Morgan Housel
      ...
```

Naming convention `YYYY-MM Title – Author` keeps Docs chronologically sorted and searchable.

### B2. Master Index — recommended column schema (Google Sheet)

Create these columns (row 1 headers, exactly these names so the scripts work):

|Column|Header               |Notes                                                                                       |
|------|---------------------|--------------------------------------------------------------------------------------------|
|A     |`Title`              |                                                                                            |
|B     |`Author`             |                                                                                            |
|C     |`Date Finished`      |YYYY-MM-DD                                                                                  |
|D     |`Themes`             |Comma-separated, from your controlled vocabulary (e.g., `decision-making, risk, incentives`)|
|E     |`One-Line Thesis`    |The book’s core argument in one sentence                                                    |
|F     |`Top Application`    |The single most useful “I will…” action                                                     |
|G     |`Applicability (1-5)`|How relevant to your work/life decisions                                                    |
|H     |`Rating (1-5)`       |Personal quality rating                                                                     |
|I     |`Doc Link`           |URL of the per-book Doc (auto-filled by script)                                             |
|J     |`Date Added`         |Auto-filled                                                                                 |
|K     |`Last Reviewed`      |Auto-updated by weekly script                                                               |
|L     |`Review Count`       |Auto-incremented by weekly script                                                           |
|M     |`Next Nudge`         |Optional: date to prioritize next                                                           |

Keep a **controlled vocabulary tab** (“Themes”) listing your ~15–25 standard tags (finance-heavy for you: `valuation, risk, behavioral-finance, incentives, decision-making, leadership, negotiation, macro, markets, personal-finance, productivity, strategy, psychology…`). Reuse tags religiously — this is what makes cross-book synthesis work.

### B3. Per-book reflection template (20–30 min) — copy/paste ready

Paste this into your `_TEMPLATE – Book Reflection` Doc. Use `{{double-brace}}` placeholders so the Apps Script can fill them.

```
# {{TITLE}} — {{AUTHOR}}
Date finished: {{DATE}}
Themes/tags: {{THEMES}}

--- STEP 1 · BLANK SHEET (5 min, from memory, DO NOT peek at notes) ---
Before I look at anything, what do I actually remember?
• Core argument in one sentence:
• 3–5 key ideas I remember:
   1.
   2.
   3.
• What surprised me or changed my mind:

--- STEP 2 · CAPTURE THE SPECIFICS (5–8 min, now use Audible clips) ---
Pull in the specifics my gist-memory dropped. One idea per bullet, in MY words:
•
•
•
Best 1–3 direct quotes worth keeping (with rough chapter):
•

--- STEP 3 · EXPLAIN IT (Feynman, 3–5 min) ---
Explain the single most important idea simply, as if to a smart colleague
who hasn't read it. Where do I get stuck? (Gaps = what I don't really understand.)


--- STEP 4 · CONNECT (3 min, elaboration) ---
• This CONFIRMS what I already believed about:
• This CONTRADICTS or COMPLICATES:
• Other books/ideas this links to (name them):

--- STEP 5 · APPLY (5 min — the whole point) ---
• The one decision (work or life) I'd make differently because of this:
• Implementation intention → IF [specific situation], THEN I will [specific action]:
   IF ______, THEN I will ______.
• Pre-mortem (only if this prompts a real decision): "It's a year from now and
  acting on this backfired. Why?" →

--- STEP 6 · METADATA (1 min) ---
• One-line thesis (copy to index col E):
• Top application (copy to index col F):
• Applicability 1–5:  | Rating 1–5:
```

This deliberately front-loads **retrieval (Step 1)** and **application (Step 5)** — the two highest-evidence moves — and confines the low-utility “summarize” work to a single line in Step 6.

### B4. Weekly resurfacing routine (~10 min)

1. Each Monday morning you receive an **auto-emailed prompt** (script below) naming **one randomly selected past book**, its one-line thesis, and its Doc link.
1. Spend ~10 minutes: **(a)** before opening the Doc, recall the book’s core idea from memory (retrieval); **(b)** open the Doc, skim; **(c)** answer the week’s rotating prompt:
- *Week type A (apply):* “Is there a decision in front of me right now where this applies?”
- *Week type B (synthesize):* “What other book connects to this, and what’s the combined lesson?”
- *Week type C (update):* “Do I still believe this? Has anything changed my view?”
1. Add one new bullet to the Doc if anything surfaces. Nothing to add is fine.
1. The script auto-stamps `Last Reviewed` and increments `Review Count` so spacing adapts — books reviewed less recently get weighted up over time (optional enhancement noted in the script comments).

At ~1/week over 24 books/year, each book recurs roughly twice a year — squarely in the Cepeda “remember-for-a-year” spacing zone, with zero manual scheduling.

### B5. Google Apps Script automations

> **Setup once (applies to all three scripts):** In your Master Index Sheet → **Extensions → Apps Script**. Delete any placeholder code, paste a script, click **Save**, then **Run** once. Google will prompt you to **authorize** (choose your account → Advanced → “Go to [project] (unsafe)” → Allow — this is normal for your own scripts). For the weekly email, set a **time trigger**: click the **clock icon (Triggers)** in the left sidebar → **+ Add Trigger** → choose function `sendWeeklyReview`, event source **Time-driven → Week timer → Monday 7–8am** → Save. Everything here uses only Google Workspace — **no external software required.**

**Script 1 — Weekly random-book review email + auto-logging.** Picks a random past book, emails you the prompt, and updates Last Reviewed / Review Count.

```javascript
// === CONFIG: set these two lines ===
const YOUR_EMAIL = "you@example.com";       // where the weekly prompt goes
const SHEET_NAME = "Sheet1";                 // tab name of your index

function sendWeeklyReview() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME);
  const data = sh.getDataRange().getValues();
  const rows = data.slice(1).filter(r => r[0]); // skip header, need a Title
  if (rows.length === 0) return;

  // Pick a random book, biased toward least-recently-reviewed (optional):
  // simple version = pure random. Uncomment sort below for adaptive spacing.
  // rows.sort((a,b) => new Date(a[10]||0) - new Date(b[10]||0));
  // const pick = rows[Math.floor(Math.random()*Math.min(5, rows.length))];
  const pick = rows[Math.floor(Math.random() * rows.length)];

  const title = pick[0], author = pick[1];
  const thesis = pick[4] || "(no thesis recorded)";
  const docLink = pick[8] || "";
  const promptCycle = ["APPLY: Is there a decision in front of you right now where this applies?",
                       "SYNTHESIZE: What other book connects to this? What's the combined lesson?",
                       "UPDATE: Do you still believe this? Has anything changed your view?"];
  const weekNo = Math.floor(Date.now() / (7*24*3600*1000));
  const prompt = promptCycle[weekNo % 3];

  const body =
    "This week's book: " + title + " — " + author + "\n\n" +
    "One-line thesis: " + thesis + "\n\n" +
    "1) First, from memory: what was the core idea?\n" +
    "2) Then open your notes: " + docLink + "\n\n" +
    "This week's prompt →\n" + prompt + "\n\n" +
    "Spend ~10 min. Add one bullet to the doc if anything surfaces.";

  MailApp.sendEmail(YOUR_EMAIL, "📚 Weekly book review: " + title, body);

  // Log the review: find the row and update Last Reviewed (col K=11) + Review Count (col L=12)
  const rowIndex = data.findIndex(r => r[0] === title && r[1] === author);
  if (rowIndex > 0) {
    sh.getRange(rowIndex + 1, 11).setValue(new Date());               // Last Reviewed
    const count = sh.getRange(rowIndex + 1, 12).getValue() || 0;
    sh.getRange(rowIndex + 1, 12).setValue(count + 1);               // Review Count
  }
}
```

**Script 2 — Create a new per-book reflection Doc from the template, pre-filled.** Run this after finishing a book (or add a custom menu button).

```javascript
// === CONFIG ===
const TEMPLATE_ID = "PASTE_TEMPLATE_DOC_ID_HERE";   // from the template Doc's URL
const BOOKS_FOLDER_ID = "PASTE_BOOKS_FOLDER_ID_HERE"; // from the Books folder URL

function newBookDoc(title, author, themes) {
  // If run manually, edit these three lines then Run:
  title  = title  || "Thinking in Bets";
  author = author || "Annie Duke";
  themes = themes || "decision-making, risk";

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const ym    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM");
  const folder = DriveApp.getFolderById(BOOKS_FOLDER_ID);

  const copy = DriveApp.getFileById(TEMPLATE_ID)
                 .makeCopy(ym + " " + title + " – " + author, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  body.replaceText("{{TITLE}}", title);
  body.replaceText("{{AUTHOR}}", author);
  body.replaceText("{{DATE}}", today);
  body.replaceText("{{THEMES}}", themes);
  doc.saveAndClose();

  // Append a row to the index with the new Doc link:
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  sh.appendRow([title, author, today, themes, "", "", "", "", copy.getUrl(), new Date(), "", 0, ""]);
  Logger.log("Created: " + copy.getUrl());
}
```

**Script 3 — Optional custom menu** so you can create a book Doc from the Sheet without opening the editor.

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📚 Library")
    .addItem("New book reflection doc…", "promptNewBook")
    .addItem("Send this week's review now", "sendWeeklyReview")
    .addToUi();
}
function promptNewBook() {
  const ui = SpreadsheetApp.getUi();
  const t = ui.prompt("Book title?").getResponseText();
  const a = ui.prompt("Author?").getResponseText();
  const th = ui.prompt("Themes (comma-separated)?").getResponseText();
  newBookDoc(t, a, th);
  ui.alert("Created. Check the Books folder.");
}
```

**Token/effort note:** none of these call any AI or external API — they’re pure Google Workspace automation, so they cost **zero tokens** and run free within Google’s generous quotas.

### B6. Using Claude in the loop (low token)

**Set up one Claude Project** named “Audiobook Library.”

- **Custom instructions (paste into the Project):**

```
I'm building an application-focused audiobook reflection library. My goals, in order:
(1) apply ideas to my work (I'm a finance expert) and life decisions;
(2) build a searchable personal library. Factual recall is secondary.
When I share a book, act as a Socratic questioner: ask me 3–5 sharp questions that
force retrieval and application, don't summarize back to me. Always push for a concrete
"if-then" implementation intention and, where relevant, a pre-mortem. When I ask for
cross-book synthesis, find tensions and combinations, cite the specific books by title,
and be opinionated. Keep responses tight. Never pad.
```

- **Knowledge base:** upload **only the Master Index** (export the Sheet as CSV and drop it in; refresh occasionally). This is the low-token move — Claude gets your whole library’s map (titles, theses, themes, applications) without you pasting every full Doc.
- **Workflows:**
  - *Post-book Socratic session:* paste a single book’s Doc text → “Question me on this.” (Cheap: one Doc at a time.)
  - *Cross-book synthesis (monthly):* “Using the index, which books speak to [decision I’m facing]? What’s the combined lesson?” Claude works from the compact index, not full notes.
  - *Weekly assist (optional):* paste the emailed prompt + your recalled answer → “What am I missing?”
- **Keep in Docs, not Claude:** all long-form notes and quotes live in Google Docs (searchable, permanent, free). Claude holds only the index + whatever single Doc you’re actively working. This keeps context — and cost — minimal.

### B7. Onboarding: backfill 10 finished books without re-listening

**Budget ~15 minutes per book = ~2.5 hours total.** Do NOT re-listen. Do 2–3 books per sitting over a week; more than that invites burnout.

For each book:

1. **2 min — Blank Sheet from memory.** Before any lookup, write the core argument + 3 ideas you actually remember. (If you remember almost nothing, that’s diagnostic — rate applicability low and move on.)
1. **5 min — Reconstruct.** Open Audible → Clips & Bookmarks for that title; skim any clips. Read the **publisher summary** (Audible/Amazon description) and, if needed, a reputable chapter summary to jog specifics. Add bullets *in your own words*.
1. **5 min — Apply.** Do Step 5 of the template: the one decision you’d make differently + one if-then intention.
1. **3 min — Metadata.** One-line thesis, themes (from your controlled vocabulary), applicability + rating. Add the row to the index (or run Script 2).

Accept that backfilled notes will be thinner than fresh ones — that’s fine. The goal is a searchable seed, not perfection. Your **next ~10 books get the full 20–30 min treatment** and the library compounds from there.

-----

## Recommendations (staged)

**Week 1 — Stand it up (≈3 hrs total):**

1. Create the Drive folder, Master Index Sheet (B2 columns), and Template Doc (B3 text).
1. Paste Scripts 1–3, authorize, and set the Monday trigger.
1. Set up the Claude Project (B6) with custom instructions; upload the index CSV.
1. **Success check:** you receive one test weekly email (run `sendWeeklyReview` manually) and can create one book Doc via the 📚 menu.

**Weeks 2–3 — Backfill (≈2.5 hrs):** Onboard your 10 finished books at 15 min each (B7). Lock your controlled-vocabulary theme list while doing it.

**Ongoing — Run the loop:**

- **Per new book (~30 min):** run the template within a day or two of finishing (fresher = better retrieval, and a short delay also acts as spacing).
- **Weekly (~10 min):** the emailed random review.
- **Monthly (~15 min):** one Claude cross-book synthesis session tied to a real decision you’re facing.

**Thresholds that should change your approach:**

- *If you skip the weekly review 3 weeks running* → the cadence is too heavy; drop to biweekly rather than abandoning it.
- *If per-book reflection routinely exceeds 30 min* → you’re over-capturing; cut Steps 2 and 4, keep 1 and 5.
- *If your library passes ~50 books* and cross-book search in Claude gets unwieldy → split the index CSV by decade/theme, or upgrade to a dedicated tool (Readwise/Obsidian) — but only then.
- *If you find you want automatic highlight import* → that’s the point to evaluate Readwise (paid) or the third-party Audible export tools (advanced, software install required) — flagged as optional, not core.

## Caveats

- **Evidence honesty:** The reading-vs-listening comprehension gap is small and contested; the *retention* disadvantage of audio and the coarseness of auditory memory are better established. Treat “audio is fine for gist, weak for specifics” as the defensible position.
- **Two flagship effects are shakier than their popularity suggests.** The longhand-beats-laptop note-taking finding (Mueller & Oppenheimer, 2014) largely failed to replicate (Morehead et al., 2019) — keep “your words > verbatim” as a principle, not a law. The Zeigarnik “open loop boosts memory” claim did **not** survive 2025 meta-analysis; only the *resumption* pull is reliable.
- **Spacing numbers are approximate.** Cepeda’s 5–10%-of-retention-interval guideline was derived from fact learning; for *concepts* (your goal) it’s directional, not precise. A weekly random draw is “good enough” and vastly more sustainable than optimizing intervals.
- **Implementation-intention and pre-mortem effect sizes come from lab and organizational settings**, not audiobook reflection specifically; the transfer is reasonable but unproven for this exact use.
- **Apps Script authorization warnings** (“unsafe”) are expected for personal scripts you wrote — but always read code before pasting. The scripts here send email only to the address you set and touch only your own Sheet/Docs. Google’s free quotas (e.g., ~100 emails/day for consumer accounts) far exceed this system’s needs.
- **The dominant real-world failure mode is behavioral, not technical:** capture-without-review, guilt-driven backlog, and over-engineering. The system is deliberately minimal for that reason. If in doubt, do less: a one-line thesis plus one if-then intention per book, reviewed weekly, already captures ~80% of the benefit.