# Trening

Mobilni beležnik vadb za moč — hitro vnašanje serij med treningom, sledenje napredku in osebnim rekordom. Temna tema, UI v slovenščini, narejeno za telefon v telovadnici.

**Aplikacija v živo:** https://airazvijalec-code.github.io/trening/

## Funkcije

- Beleženje treningov: vaje, serije (teža × ponovitve), RPE, počitek, komentar, telesna teža
- Kardio kot vaja: minute, hitrost, nagib in razdalja (izračunana iz hitrosti × časa, če je ne vpišeš)
- Deluje brez signala (PWA): service worker + manifest — dodaj na domači zaslon in app se odpre tudi v kleti
- Vgrajene predloge — 6-dnevni Push/Pull/Legs split + lastne predloge
- Samodejno zaznavanje osebnih rekordov (teža, e1RM, volumen) s proslavo 🎉
- Grafi napredka po vajah: najtežja serija, ocenjen 1RM (Epley/Brzycki/Lombardi), volumen
- Rest timer z zvokom in vibracijo
- Tedenski pregled treningov po skupinah (Push/Pull/Legs)
- Avtomatsko shranjevanje osnutka — če app zapreš sredi treninga, nadaljuješ kjer si ostal
- Pametno ujemanje imen vaj (šumniki, tipkarske napake) + predlogi ob tipkanju

## Zagon lokalno

Brez builda, brez odvisnosti — ena datoteka (plus `sw.js`, `manifest.json` in `icons/` za PWA).

```bash
python3 -m http.server 8000
# odpri http://localhost:8000
```

Podatki se shranjujejo v localStorage brskalnika (`trening_data_v2`).

## Sinhronizacija / backup (GitHub Gist)

1. Ustvari [Personal Access Token (classic)](https://github.com/settings/tokens/new?description=Trening%20app&scopes=gist) samo s scope **gist**
2. V aplikaciji: ⋯ (Nastavitve) → prilepi token → **Shrani token** → **Preveri**
3. Ob prvem pošiljanju se ustvari zaseben gist `trening.json`; naprej se sinhronizira samodejno

Token se hrani samo lokalno v brskalniku in se nikoli ne sinhronizira.

## Arhitektura

Cela aplikacija je **ena datoteka `index.html`** (vanilla JS, brez frameworkov). Koda je organizirana v module prek vzorca `__M["pot/datoteka.js"]` — podrobnosti, pravila razvoja in znani dolgovi so v [CLAUDE.md](CLAUDE.md).

