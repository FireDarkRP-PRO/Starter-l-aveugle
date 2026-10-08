import unicodedata
from urllib.parse import quote

import requests
from lxml import html

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PokemonScraper/1.0)"}

BASE = "/html/body/div[2]/div/div[3]/main/div[3]/div[3]/div[1]"

# Chaque catégorie : page, numéro de la section, fichier de sortie
CATEGORIES = [
    {
        "nom": "légendaires",
        "url": "https://www.pokepedia.fr/" + quote("Pokémon_légendaire"),
        "section": 7,
        "fichier": "legendaires.txt",
    },
    {
        "nom": "fabuleux",
        "url": "https://www.pokepedia.fr/" + quote("Pokémon_fabuleux"),
        "section": 10,
        "fichier": "Pokémon_Fabuleux.txt",
    },
]


def xpath_liens(section):
    """
    Une ligne (tr) par génération, sans indice -> les futures générations sont prises en compte.
    Deux cas pour les liens, réunis avec « | » :
      - Pokémon seul dans sa génération : .../td/a
      - Plusieurs Pokémon                : .../td/div/div/a
    """
    cellule = f"{BASE}/section[{section}]/table/tr/td/table/tr[2]/td"
    return f"{cellule}/a | {cellule}/div/div/a"


def normaliser(texte):
    """Minuscule + sans accents, pour comparer les noms de façon fiable."""
    texte = unicodedata.normalize("NFD", texte.strip().lower())
    return "".join(c for c in texte if unicodedata.category(c) != "Mn")


def charger_numeros(chemin="pokemon.txt"):
    """'0001 Bulbizarre' -> {'bulbizarre': '0001'}"""
    numeros = {}
    with open(chemin, "r", encoding="utf-8") as f:
        for ligne in f:
            ligne = ligne.strip()
            if not ligne:
                continue
            numero, nom = ligne.split(" ", 1)
            numeros.setdefault(normaliser(nom), numero)
    return numeros


def charger_page(url):
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    tree = html.fromstring(response.content)
    # Les XPath copiés depuis le navigateur contiennent <tbody>, souvent absent du HTML brut.
    # On supprime donc tous les <tbody> pour que les XPath marchent dans les deux cas.
    for tbody in tree.xpath("//tbody"):
        tbody.drop_tag()
    return tree


def generer(categorie, numeros):
    tree = charger_page(categorie["url"])
    liens = tree.xpath(xpath_liens(categorie["section"]))

    if not liens:
        print(f"[{categorie['nom']}] Aucun lien trouvé : vérifie le numéro de section "
              f"({categorie['section']}) ou la structure de la page.")
        return

    resultats = []
    introuvables = []
    deja_vus = set()

    for a in liens:
        nom = a.text_content().strip() or a.get("title", "").strip()
        if not nom or nom in deja_vus:
            continue
        deja_vus.add(nom)

        numero = numeros.get(normaliser(nom))
        if numero:
            resultats.append((numero, nom))
        else:
            introuvables.append(nom)

    resultats.sort()

    with open(categorie["fichier"], "w", encoding="utf-8") as f:
        for numero, nom in resultats:
            f.write(f"{numero} {nom}\n")

    print(f"[{categorie['nom']}] {categorie['fichier']} généré avec {len(resultats)} Pokémon !")
    if introuvables:
        print(f"[{categorie['nom']}] Non trouvés dans pokemon.txt :", ", ".join(introuvables))


numeros = charger_numeros()
for categorie in CATEGORIES:
    generer(categorie, numeros)