import requests
from bs4 import BeautifulSoup

# URL de la page Wikimini
url = "https://fr.wikimini.org/wiki/Liste_des_Pok%C3%A9mon"

response = requests.get(url)
soup = BeautifulSoup(response.text, "html.parser")

# Récupérer tous les Pokémon dans <ol> <li> <a>
pokemons = []

for ol in soup.find_all("ol"):
    for li in ol.find_all("li"):
        a_tag = li.find("a")
        if a_tag:
            name = a_tag.get_text().strip()
            # Ignorer les formes alternatives entre parenthèses
            if "(" not in name and ")" not in name:
                pokemons.append(name)

# Écriture dans pokedex.txt avec numéro
with open("pokedex.txt", "w", encoding="utf-8") as f:
    for idx, name in enumerate(pokemons, start=1):
        f.write(f"{str(idx).zfill(4)} {name}\n")

print(f"Fichier pokedex.txt généré avec {len(pokemons)} Pokémon !")