# scraper_okruh2.py  –  vytěží celý okruh 2
# -*- coding: utf-8 -*-
import re, json, time, sys
from urllib.parse import urljoin, urlparse, parse_qs
import requests
from bs4 import BeautifulSoup

BASE   = "https://www.autoskola-testy.cz"
HEAD   = {"User-Agent": "Mozilla/5.0"}
OUT    = "okruh2.json"  # Změna pro okruh 2
SLEEP  = 0.3        # šetrná prodleva mezi dotazy

# ---------------------------------------------------------------------------
def img_exists(url: str) -> bool:
    """HEAD dotazem ověří, že obrázek vrací HTTP 200."""
    try:
        return requests.head(url, headers=HEAD, timeout=10).status_code == 200
    except requests.RequestException:
        return False

# ---------------------------------------------------------------------------
def get_question_links(okruh=2): # Změna pro okruh 2
    """Vrátí absolutní URL všech <a href='?otazka=…'> na stránce okruhu."""
    url  = f"{BASE}/prohlizeni_otazek.php?okruh={okruh}"
    html = requests.get(url, headers=HEAD, timeout=15).text
    soup = BeautifulSoup(html, "html.parser")
    rels = [a["href"] for a in soup.select("a[href^='?otazka=']")]
    return [urljoin(url, r) for r in rels]

# ---------------------------------------------------------------------------
# Funkce ajax_correct_answer již není potřeba.
# def ajax_correct_answer(question_id: str) -> int:
#     """Vrátí index správné odpovědi (0=A, 1=B…) pomocí AJAX volání."""
#     params = {"id": question_id}
#     ajax   = f"{BASE}/ajax/get_odpoved.php"
#     r      = requests.get(ajax, params=params, headers=HEAD, timeout=10)
#     r.raise_for_status()
#     # odpověď je např. {"odpoved":"B"}  → převedeme na index 1
#     letter = r.json().get("odpoved", "").strip().upper()
#     return "ABCDEF".find(letter)

# ---------------------------------------------------------------------------
def parse_question(url: str) -> dict | None:
    html = requests.get(url, headers=HEAD, timeout=15).text
    soup = BeautifulSoup(html, "html.parser")

    # 1) ID otázky (text „Otázka číslo XXXXXXXX…“)
    id_match = re.search(r"Otázka číslo (\d{8})", soup.text)
    if not id_match:
        print(f"⚠️  ID nenalezeno → přeskočeno ({url})")
        return None
    qid = id_match.group(1)

    # 2) Text otázky
    q_text_element = soup.select_one("p.question-text")
    if not q_text_element:
        # Záložní selektor, pokud by p.question-text neexistoval
        q_text_element = soup.select_one(".questionText") 
    if not q_text_element:
        # Další záložní selektor, pokud ani .questionText neexistoval
        q_text_element = soup.select_one(".question > p:not([class])") # <div class="question"><p>text</p>...</div>
    if not q_text_element:
         # Poslední pokus, obecnější h1, h2, h3
        q_text_element = soup.select_one("h1, h2, h3")

    q_text = q_text_element.get_text(strip=True) if q_text_element else ""
    
    if not q_text:
        print(f"⚠️  Text otázky nenalezen pro {qid} ({url})")
        # Můžeme se rozhodnout otázku přeskočit, pokud nemá text
        # return None

    # 3) Obrázek otázky (pokud je)
    # Hledáme img tag uvnitř divu s třídou 'image-frame'
    img_tag = soup.select_one("div.image-frame img")
    q_img   = None
    if img_tag and img_tag.get("src"): # Zkontrolujeme, zda img_tag existuje a má atribut src
        img_src = img_tag["src"]
        # Někdy může být src prázdný řetězec nebo placeholder
        if img_src and not img_src.isspace():
            q_img_url = urljoin(url, img_src)
            if img_exists(q_img_url):
                q_img = q_img_url
            else:
                print(f"⚠️  Obrázek otázky {qid} nenalezen na URL: {q_img_url} (zdroj: {img_src})")
        else:
            print(f"⚠️  Prázdný src atribut pro obrázek otázky {qid}")
    # Pokud q_img zůstane None, znamená to, že obrázek nebyl nalezen nebo neexistuje

    # 4) Odpovědi
    opts = []
    # Cílíme na div s třídou 'answer'
    for ans_div in soup.select("div.answer"):
        # a) text:
        p_tag = ans_div.select_one("p")
        txt = p_tag.get_text(" ", strip=True) if p_tag else ""
        
        # b) případný obrázek možnosti
        oimg = ans_div.select_one("img")
        if oimg and oimg.get("src"): # Zkontrolujeme, zda existuje atribut src
            url_img = urljoin(url, oimg["src"])
            if img_exists(url_img):
                txt = url_img  # Pokud obrázek existuje, použijeme jeho URL jako text
            # Pokud obrázek neexistuje nebo nemá src, txt zůstane textem z <p>
        
        opts.append(txt)
    if not opts:
        print(f"⚠️  Žádné odpovědi pro {qid} ({url}) → přeskočeno")
        return None

    # 5) Správná odpověď (hledáme div s třídami 'answer' a 'otazka_spravne')
    correct = -1
    all_answer_divs = soup.select("div.answer")
    for i, ans_div in enumerate(all_answer_divs):
        if "otazka_spravne" in ans_div.get("class", []):
            correct = i
            break
    
    if correct == -1:
        # Pokud nenajdeme přímo třídu otazka_spravne, zkusíme najít text "Správná odpověď:"
        # Toto je záložní mechanismus, pokud by se struktura mírně lišila.
        # Na základě debug_question_page.html to ale vypadá, že 'otazka_spravne' je spolehlivé.
        # V tomto případě by bylo lepší logovat chybu, pokud 'otazka_spravne' není nalezena.
        print(f"⚠️  Správná odpověď (třída 'otazka_spravne') nenalezena pro {qid} ({url})")
        # Otázku můžeme přeskočit nebo uložit s correct = -1
        # return None # Příklad přeskočení
        pass # Prozatím necháme correct = -1 a pokračujeme

    return {
        "id":       qid,
        "otazka":   q_text,
        "obrazek":  q_img,
        "moznosti": opts,
        "spravna":  correct,
    }

# ---------------------------------------------------------------------------
if __name__ == "__main__":
    links = get_question_links(2) # Změna pro okruh 2
    print(f"Okruh 2: {len(links)} odkazů nalezeno") # Změna pro okruh 2
    all_q  = []
    for i, link in enumerate(links, 1):
        rec = parse_question(link)
        if rec:
            all_q.append(rec)
        sys.stdout.write(f"\r  {i}/{len(links)} hotovo"); sys.stdout.flush()
        time.sleep(SLEEP)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(all_q, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Uloženo {len(all_q)} otázek do {OUT}")
