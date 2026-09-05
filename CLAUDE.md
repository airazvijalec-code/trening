# Trening — kontekst za Claude Code

Mobile-first beležnik vadb za moč (PWA-stil, temna tema, UI v slovenščini).
Cela aplikacija je **ena datoteka: `index.html`** (~2900 vrstic) — vanilla JS, brez frameworkov, brez odvisnosti, brez build sistema. To je zavestna odločitev, ne pomanjkljivost.

## Arhitektura

`index.html` vsebuje CSS + HTML + JS. JS je organiziran v "module" prek vzorca `__M["pot/datoteka.js"]` — vsak modul je svoj blok `{ ... }`, označen s komentarjem `/* pot/datoteka.js */`. Meje modulov spoštuj.

| Modul | Odgovornost |
|---|---|
| `state/normalize.js` | kanonična imena vaj (lowercase, brez šumnikov), Levenshtein fuzzy match |
| `state/schema.js` | schema v3, migracije, `uid()`, kardio helperji (`isCardio`, `setHasData`, `cardioKm`), vgrajene PPL predloge (6-dnevni split, vsak dan s kardio vrstico) |
| `state/store.js` | `Store` — edini vir resnice; autosave v localStorage (300 ms debounce); sync scheduling (2 s); `mergeStates` (last-write-wins po seji) |
| `sync/gist.js` | backup v zaseben GitHub Gist (PAT s scope `gist`, datoteka `trening.json`) |
| `lib/dom.js` | `esc`, `toast`, `confirm2`, `debounce`, datumi sl-SI |
| `lib/onerm.js` | e1RM (Epley/Brzycki/Lombardi — mediana) |
| `lib/chart.js` | inline SVG line/bar grafi (500×200) |
| `lib/autocomplete.js`, `lib/pr.js`, `lib/timer.js` | predlogi imen vaj, PR detekcija, rest timer |
| `views/*` | home, new, active (editor seje), history, detail, progress, report, settings, pr_flash |
| `main.js` | router (in-memory, brez URL), draft banner, sync badge, `init()` |

## Podatkovni model (v3)

- localStorage: `trening_data_v2` (stanje; ime ključa ostaja, polje `version` je 3), `trening_gist_token` (PAT — se NIKOLI ne sinhronizira).
- `state = { version, sessions[], templates{}, bodyweight[], draft, settings, updatedAt }`
- `session = { id, date, type, durationMin, rpe, bodyweight, exercises[], comment, startedAt, createdAt, updatedAt }`
- `exercise = { id, name, canonical, kind, note, targetReps, sets[] }`; `kind` je `'strength'` (privzeto, manjkajoč = strength) ali `'cardio'`
- moč: `set = { id, reps, weight, done, restSec }`; kardio: `set = { id, durationMin, speed, incline, distanceKm, done }` (km je lahko prazen → izračun hitrost × čas)

## Železna pravila

1. **Brez frameworkov, brez npm odvisnosti, brez zunanjih skript.** Edina izjema: Google Fonts, ki že obstaja. Vsak predlog nove odvisnosti najprej utemelji in počakaj na potrditev.
2. **Vsa mutacija stanja gre skozi `store.update(fn)`** — nikoli ne piši direktno v `store.state` mimo tega in nikoli direktno v localStorage (razen KEYS.TOKEN v settings view).
3. **Vsak uporabniški niz v `innerHTML` gre skozi `esc()`.** Brez izjem.
4. **Sprememba sheme podatkov = bump `SCHEMA_VERSION` + idempotentna migracija v `migrate()`.** Obstoječi podatki uporabnikov ne smejo nikoli propasti.
5. **Ves UI v slovenščini.** Imena vaj so lahko angleška (uporabnik jih tako vnaša).
6. **Mobile-first.** Vsako spremembo UI preveri miselno na ~390 px širine; ciljna naprava je telefon v telovadnici.
7. **`prototype.html` je zamrznjen artefakt** — ne beri ga, ne spreminjaj ga, ne vključuj ga v refactoringe.
8. **Ne uvajaj build sistema, dokler ni izrecno dogovorjen.** Če se dogovoriva za razrez v `src/`, mora `build` proizvesti `index.html` z identičnim obnašanjem in razrez se naredi 1:1 po obstoječih `__M` mejah.

## Delovni tok

- Majhni koraki: ena funkcionalnost = en commit s smiselnim sporočilom (slog: `Področje: kaj in zakaj`, glej repo Nalogs).
- Pred vsako netrivialno spremembo (schema, sync, router) najprej kratek načrt v 5–10 vrsticah in počakaj na "gremo".
- Po vsaki spremembi napiši, **kako naj jo ročno preverim** (koraki klika na telefonu/desktopu).
- Test lokalno: `python3 -m http.server 8000` v korenu repa → `http://localhost:8000`. Sync testiraš z lastnim PAT (scope `gist`).

## Znani dolgovi (prioriteta pada)

1. **Offline:** ni `manifest.json` in ni service workerja → app v kleti brez signala ne naloži. To je za fitnes app kritično.
2. **Router ne pozna URL-jev:** back gumb na Androidu vrže iz aplikacije; ni deep-linkov. Rešitev: hash router (`#/history`, `#/detail/:id`).
3. **Sync nima tombstonov:** lokalno izbrisana seja se ob `pull` vrne iz gista (mergeStates unija po id). Potrebni so zapisi o izbrisu.
4. **Ni testov:** logika v `state/*` in `lib/*` (merge, migracije, e1RM, PR, canonical) je čisto testabilna.
5. **README je prazen**, `prototype.html` (1 MB) je mrtva teža v korenu.
6. Vsak sync push pošlje celotno stanje — z leti podatkov postane potratno (nizka prioriteta).

