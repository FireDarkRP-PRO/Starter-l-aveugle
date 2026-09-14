function doGet(e) {
  var page = e.parameter.page || "index";
  var template = HtmlService.createTemplateFromFile(page);
  template.webAppUrl = ScriptApp.getService().getUrl();
  return template.evaluate();
}





//Starter à l'aveugle
function getRandomPokemon(selectedGens, nb) {

  const pokeFile = DriveApp.getFilesByName("pokemon.txt").next();
  const pokeList = pokeFile.getBlob().getDataAsString()
    .split("\n").map(p => p.trim()).filter(p => p);

  const genFile = DriveApp.getFilesByName("genPokemon.txt").next();
  const genLines = genFile.getBlob().getDataAsString()
    .split("\n").map(l => l.trim()).filter(l => l);

  let allowedIndexes = new Set();

  // Si aucune génération sélectionnée → tout autorisé
  if (!selectedGens || selectedGens.length === 0) {
    pokeList.forEach((_, i) => allowedIndexes.add(i + 1));
  } else {
    genLines.forEach(line => {

      const [gen, range] = line.split(":");

      if (selectedGens.includes(gen)) {

        const [start, end] = range.split("-").map(Number);

        for (let i = start; i <= end; i++) {
          allowedIndexes.add(i);
        }
      }
    });
  }

  const filtered = pokeList.filter((_, i) => allowedIndexes.has(i + 1));

  const selectionName = [];
  const selectionIndex = [];
  const usedIndexes = new Set();

  nb = Math.min(nb, 10) || 3;

  while (selectionName.length < nb && usedIndexes.size < filtered.length) {

    const idx = Math.floor(Math.random() * filtered.length);

    if (!usedIndexes.has(idx)) {
      usedIndexes.add(idx);

      const full = filtered[idx];
      const parts = full.split(" ");
      const number = parts[0];
      let name = parts.slice(1).join(" ");

      selectionName.push(name);
      selectionIndex.push(parseInt(number));
    }
  }

  return [selectionName, selectionIndex];
}


function searchPokemon(input) {

  const file = DriveApp.getFilesByName("pokemon.txt").next();
  const content = file.getBlob().getDataAsString();
  const list = content.split("\n").map(p => p.trim()).filter(p => p);

  input = input.toLowerCase().trim();

  // 🎮 EASTER EGG
  if (input === "firedarkrp") {
    return {
      name: "🔥 FireDarkRP",
      index: 0, // pas de vrai Pokémon
      easterEgg: true
    };
  }

  for (let i = 0; i < list.length; i++) {

    const parts = list[i].split(" ");
    const number = parts[0];                 // "0001"
    const name = parts.slice(1).join(" ");   // "Bulbizarre"

    const normalizedNumber = String(parseInt(number));

    if (
      name.toLowerCase() === input ||
      number === input ||
      normalizedNumber === input
    ) {
      return {
        name: name,
        index: parseInt(number)
      };
    }
  }

  return null;
}


function getPokemonCaracteristiques(pokemonId) {

  try {

    const pokemon = JSON.parse(
      UrlFetchApp.fetch("https://pokeapi.co/api/v2/pokemon/" + pokemonId)
      .getContentText()
    );

    const species = JSON.parse(
      UrlFetchApp.fetch("https://pokeapi.co/api/v2/pokemon-species/" + pokemonId)
      .getContentText()
    );

    // Traductions
    const typeFR = {
      normal:"Normal", fire:"Feu", water:"Eau",
      electric:"Électrik", grass:"Plante", ice:"Glace",
      fighting:"Combat", poison:"Poison", ground:"Sol",
      flying:"Vol", psychic:"Psy", bug:"Insecte",
      rock:"Roche", ghost:"Spectre", dragon:"Dragon",
      dark:"Ténèbres", steel:"Acier", fairy:"Fée"
    };

    const colorFR = {
      green:"Vert", red:"Rouge", blue:"Bleu",
      yellow:"Jaune", purple:"Violet",
      pink:"Rose", brown:"Marron",
      black:"Noir", white:"Blanc", gray:"Gris"
    };

    // Génération (I, II, III…)
    const generation = species.generation.name
      .replace("generation-","")
      .toUpperCase();

    // Numéro de pokédex
    const numero = pokemonId.toString().padStart(4, '0')

    // Description FR propre
    const description = species.flavor_text_entries
      .find(f => f.language.name === "fr")
      ?.flavor_text
      .replace(/\f/g," ")
      .replace(/\n/g," ")
      || "Aucune description disponible pour ce pokémon, rendez-vous sur Poképédia pour connaitre sa description pokédex";

    return {
      generation: generation,
      numero: numero,
      types: pokemon.types.map(t => typeFR[t.type.name] || t.type.name),
      category: species.genera.find(g => g.language.name === "fr")?.genus || "",
      height: (pokemon.height / 10) + " m",
      weight: (pokemon.weight / 10) + " kg",
      color: colorFR[species.color.name] || species.color.name,
      captureRate: species.capture_rate,
      description: description,

      cry: pokemon.cries?.latest || pokemon.cries?.legacy || ""
    };

  } catch (err) {
    return { error: err.toString() };
  }
}


function getPokemonSensibilites(pokemonId) {

  try {

    const allTypes = [
      "normal","fire","water","electric","grass","ice","fighting",
      "poison","ground","flying","psychic","bug","rock","ghost",
      "dragon","dark","steel","fairy"
    ];

    const response = UrlFetchApp.fetch(
      "https://pokeapi.co/api/v2/pokemon/" + pokemonId
    );

    const data = JSON.parse(response.getContentText());
    const pokemonTypes = data.types.map(t => t.type.name);

    let multipliers = {};
    allTypes.forEach(t => multipliers[t] = 1);
    
    pokemonTypes.forEach(type => {

      const typeResponse = UrlFetchApp.fetch(
        "https://pokeapi.co/api/v2/type/" + type
      );

      const typeData = JSON.parse(typeResponse.getContentText());
      const dmg = typeData.damage_relations;

      dmg.double_damage_from.forEach(t => multipliers[t.name] *= 2);
      dmg.half_damage_from.forEach(t => multipliers[t.name] *= 0.5);
      dmg.no_damage_from.forEach(t => multipliers[t.name] *= 0);
    });

    return multipliers;

  } catch (err) {
    return { error: err.toString() };
  }
}


function getPokemonStats(pokemonId) {

  try {

    const response = UrlFetchApp.fetch(
      "https://pokeapi.co/api/v2/pokemon/" + pokemonId
    );

    const data = JSON.parse(response.getContentText());

    const stats = {};

    data.stats.forEach(s => {
      stats[s.stat.name] = s.base_stat;
    });

    return stats;

  } catch (err) {
    return { error: err.toString() };
  }
}


function getAllPokemonNames() {
  const file = DriveApp.getFilesByName("pokemon.txt").next();
  const content = file.getBlob().getDataAsString();
  
  return content
    .split("\n")
    .map(p => p.trim())
    .filter(p => p)
    .map(p => p.split(" ").slice(1).join(" ")); // enlève le numéro
}


function getGenerations() {

  const file = DriveApp.getFilesByName("genPokemon.txt").next();
  const content = file.getBlob().getDataAsString();

  return content
    .split("\n")
    .map(line => line.trim())
    .filter(line => line);
}

















//Gess Type
function getRandomPokemonForGame(selectedGens) {

  const pokeFile = DriveApp.getFilesByName("pokemon.txt").next();
  const pokeList = pokeFile.getBlob().getDataAsString()
    .split("\n").map(p => p.trim()).filter(p => p);

  const genFile = DriveApp.getFilesByName("genPokemon.txt").next();
  const genLines = genFile.getBlob().getDataAsString()
    .split("\n").map(l => l.trim()).filter(l => l);

  let allowedIndexes = new Set();

  if (!selectedGens || selectedGens.length === 0) {
    pokeList.forEach((_, i) => allowedIndexes.add(i + 1));
  } else {
    genLines.forEach(line => {
      const [gen, range] = line.split(":");

      if (selectedGens.includes(gen)) {
        const [start, end] = range.split("-").map(Number);
        for (let i = start; i <= end; i++) {
          allowedIndexes.add(i);
        }
      }
    });
  }

  const filtered = pokeList.filter((_, i) => allowedIndexes.has(i + 1));

  const random = filtered[Math.floor(Math.random() * filtered.length)];
  const parts = random.split(" ");

  return {
    name: parts.slice(1).join(" "),
    index: parseInt(parts[0])
  };
}




//Cri
function getRandomPokemonWithCry(gens) {

  const data = getRandomPokemon(gens, 1);
  const name = data[0][0];
  const index = data[1][0];

  const url = "https://pokeapi.co/api/v2/pokemon/" + index;
  const res = UrlFetchApp.fetch(url);
  const json = JSON.parse(res.getContentText());

  return {
    name: name,
    index: index,
    cry: json.cries.latest
  };
}




////////////
function getPokemonData(index) {
  try {
    const response = UrlFetchApp.fetch("https://pokeapi.co/api/v2/pokemon/" + index);
    const data = JSON.parse(response.getContentText());
    return data;
  } catch (error) {
    console.error("Erreur API Pokémon:", error);
    return null;
  }
}




